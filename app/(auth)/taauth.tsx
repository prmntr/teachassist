import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef } from "react";
import { parseStudentGrades } from "@/utils/CourseParser";
import { parseGradeData } from "@/utils/GradeParser";
import { mergeCoursesWithCache, resolveReportUrl } from "@/utils/courseCache";
import { primeCoursesMemoryCache } from "@/utils/coursesMemoryCache";
import { notifyCourseStorageUpdated } from "@/utils/courseStorageEvents";
import { saveParsedCourseReport } from "@/utils/courseReportCache";
import {
  buildTeachAssistLiveUrl,
  buildTeachAssistStudentsUrl,
} from "@/utils/serverConfig";
import { getSchoolDateString } from "@/utils/schoolTime";

// every interaction to the outside world should be passed through here

const DEMO_USERNAME = "123456789";
const DEMO_PASSWORD = "password";

const getIndexUrl = async () => buildTeachAssistLiveUrl("index.php?subject_id=0");

const isDemoCredentials = (
  username?: string | null,
  password?: string | null
) => username === DEMO_USERNAME && password === DEMO_PASSWORD;

const isDemoAccount = async (): Promise<boolean> => {
  const storedFlag = await SecureStorage.load("ta_is_demo");
  if (storedFlag === "true") return true;
  const storedUsername = await SecureStorage.load("ta_username");
  const storedPassword = await SecureStorage.load("ta_password");
  return isDemoCredentials(storedUsername, storedPassword);
};

const formatDateForGuidance = (date: Date): string => getSchoolDateString(date);

const buildDemoGuidanceHtml = (date: Date): string => {
  const dateString = formatDateForGuidance(date);
  const demoSlotsA = ["09:00:00", "10:30:00", "13:15:00", "15:00:00"];
  const demoSlotsB = ["09:45:00", "11:00:00", "14:00:00", "15:30:00"];
  // Ids must be unique per date+counselor+time — they're used as the
  // AppointmentData id (React list keys, cancel targets). A plain
  // slot-index id collides across different counselors/dates, which used
  // to make "My Appointments" silently drop or mis-cancel bookings.
  const buildLinks = (slots: string[], counselorKey: string) =>
    slots
      .map(
        (time) =>
          `<a href="bookAppointment.php?dt=${dateString}&tm=${time}&id=${dateString}-${counselorKey}-${time.replace(/:/g, "")}&school_id=0">@ ${time}</a>`
      )
      .join("");

  return `
<html>
  <body>
    <h2>Appointment Bookings on ${dateString}</h2>
    <div class="box">
      <h3>T. Pearl: Guidance (A-C)</h3>
      ${buildLinks(demoSlotsA, "pearl")}
    </div>
    <div class="box">
      <h3>E. Stin: Guidance (D-K)</h3>
      ${buildLinks(demoSlotsB, "stin")}
    </div>
     <div class="box">
      <h3>K. Cwan: Guidance (L-Z)</h3>
      ${buildLinks(demoSlotsB, "cwan")}
    </div>
  </body>
</html>`;
};

// wrapper for expo-secure-store
export class SecureStorage {
  static async save(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  }

  static async load(key: string) {
    return await SecureStore.getItemAsync(key);
  }

  static async delete(key: string) {
    await SecureStore.deleteItemAsync(key);
  }
}

// vanilla login user pass
type LoginParams = {
  username: string;
  password: string;
};

// Form data for appointment booking
export interface AppointmentFormData {
  reason?: string;
  reasonLabel?: string;
  withParent?: boolean;
  online?: boolean;
  hiddenFields: Record<string, string>;
}

// book appt data structure
export interface AppointmentData {
  id: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM:SS format
  teacher?: string;
  subject?: string;
  reason?: string;
  bookedAt: string;
  schoolId: string;
}

type AppointmentMeta = {
  teacher?: string;
  subject?: string;
};

interface TeachAssistAuthFetcherProps {
  loginParams?: LoginParams;
  // get specific course
  fetchCourseUrl?: string;
  // fetch with saved cookies; for getting courses
  fetchWithCookies?: boolean;
  // when fetching the main courses page, also prefetch each course report into SecureStorage
  prefetchCourses?: boolean;
  // getting guidance w/ date
  getGuidance?: Date;
  // booking appointment
  bookAppointment?: string;
  // submitting appointment form data
  submitAppointmentForm?: AppointmentFormData;
  appointmentMeta?: AppointmentMeta;
  // cancel appointment
  cancelAppointment?: {
    date: string;
    time: string;
    id: string;
    schoolId: string;
  };

  onResult: (result: string) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void; // put as optional for future maybe but strongly reccemended
}

const decodeHtmlEntities = (value: string): string => {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
};

const parseCookieHeader = (value: string | null): Record<string, string> => {
  if (!value) return {};
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const [name, ...rest] = part.split("=");
      if (!name || rest.length === 0) return acc;
      acc[name] = rest.join("=");
      return acc;
    }, {});
};

const parseSetCookieHeader = (value: string | null): Record<string, string> => {
  if (!value) return {};
  const parts = value.split(/, (?=[^;]+?=)/);
  return parts.reduce<Record<string, string>>((acc, part) => {
    const [cookiePair] = part.split(";");
    const [name, ...rest] = cookiePair.trim().split("=");
    if (!name || rest.length === 0) return acc;
    acc[name] = rest.join("=");
    return acc;
  }, {});
};

const isDeletedCookieValue = (value: string | null | undefined): boolean => {
  if (value === null || value === undefined) return true;
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 || normalized === "deleted";
};

const extractStudentIdFromHtml = (html: string): string | null => {
  if (!html) return null;
  const queryMatch = html.match(/student_id=(\d+)/i);
  if (queryMatch?.[1]) return queryMatch[1];
  const inputMatch = html.match(
    /name=["']student_id["'][^>]*value=["'](\d+)["']/i
  );
  return inputMatch?.[1] ?? null;
};

const extractSessionTokenFromHtml = (html: string): string | null => {
  if (!html) return null;
  const queryMatch = html.match(/session_token=([^&"'\s]+)/i);
  if (queryMatch?.[1]) return queryMatch[1];
  const inputMatch = html.match(
    /name=["']session_token["'][^>]*value=["']([^"']+)["']/i
  );
  return inputMatch?.[1] ?? null;
};

const syncStoredSessionFromHtml = async (html: string) => {
  const studentId = extractStudentIdFromHtml(html);
  const sessionToken = extractSessionTokenFromHtml(html);

  if (studentId) {
    await SecureStorage.save("ta_student_id", studentId);
  }

  if (sessionToken) {
    await SecureStorage.save("ta_session_token", sessionToken);
  }

  return { studentId, sessionToken };
};

const buildCookieHeader = async (): Promise<string | null> => {
  const storedCookies = await SecureStorage.load("ta_cookies");
  if (storedCookies && storedCookies.length > 0) {
    const storedMap = parseCookieHeader(storedCookies);
    const filteredEntries = Object.entries(storedMap).filter(
      ([, value]) => !isDeletedCookieValue(value)
    );
    if (filteredEntries.length > 0) {
      const sanitizedHeader = filteredEntries
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
      if (sanitizedHeader !== storedCookies) {
        await SecureStorage.save("ta_cookies", sanitizedHeader);
      }
      return sanitizedHeader;
    }
  }

  const studentId = await SecureStorage.load("ta_student_id");
  const sessionToken = await SecureStorage.load("ta_session_token");
  if (!sessionToken || isDeletedCookieValue(sessionToken)) return null;
  const cookieParts = [`session_token=${sessionToken}`];
  if (studentId && !isDeletedCookieValue(studentId)) {
    cookieParts.push(`student_id=${studentId}`);
  }
  return cookieParts.join("; ");
};

const syncCookiesFromResponse = async (response: Response) => {
  const setCookie = response.headers?.get?.("set-cookie");
  if (!setCookie) return;

  const current = parseCookieHeader(await SecureStorage.load("ta_cookies"));
  const updates = parseSetCookieHeader(setCookie);
  const merged = { ...current };
  const deletes = new Set<string>();
  Object.entries(updates).forEach(([name, value]) => {
    if (isDeletedCookieValue(value)) {
      delete merged[name];
      deletes.add(name);
      return;
    }
    merged[name] = value;
  });

  const mergedEntries = Object.entries(merged).filter(
    ([, value]) => !isDeletedCookieValue(value)
  );
  const mergedHeader = mergedEntries
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  if (mergedHeader.length > 0) {
    await SecureStorage.save("ta_cookies", mergedHeader);
  } else {
    await SecureStorage.delete("ta_cookies");
  }

  const studentId = merged.student_id ?? null;
  const sessionToken = merged.session_token ?? null;
  if (studentId && !isDeletedCookieValue(studentId)) {
    await SecureStorage.save("ta_student_id", studentId);
  } else if (deletes.has("student_id")) {
    await SecureStorage.delete("ta_student_id");
  }

  if (sessionToken && !isDeletedCookieValue(sessionToken)) {
    await SecureStorage.save("ta_session_token", sessionToken);
  } else if (deletes.has("session_token")) {
    await SecureStorage.delete("ta_session_token");
  }
};

const fetchHtmlWithCookies = async (
  url: string,
  init: RequestInit = {},
): Promise<{ html: string; response: Response }> => {
  const cookieHeader = await buildCookieHeader();
  const headers = new Headers(init.headers ?? {});

  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "text/html,application/xhtml+xml,application/xml");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  await syncCookiesFromResponse(response);

  const html = await response.text();
  return { html, response };
};

const getSubjectIdFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  const match = url.match(/subject_id=(\d+)/);
  return match?.[1] ?? null;
};

const buildCourseReportUrl = async (
  subjectId: string
): Promise<string | null> => {
  const savedStudentId = await SecureStorage.load("ta_student_id");
  const savedSchoolId = await SecureStorage.load("school_id");
  if (!savedStudentId || !savedSchoolId) return null;
  return buildTeachAssistStudentsUrl(
    `viewReport.php?subject_id=${subjectId}&student_id=${savedStudentId}&school_id=${savedSchoolId}`,
  );
};

const saveMarksLastRetrievedNow = async (_source: string) => {
  const timestamp = new Date().toISOString();
  await SecureStorage.save("marks_last_retrieved", timestamp);
  notifyCourseStorageUpdated();
};

const saveLastAuthTime = async () => {
  await SecureStorage.save("ta_last_auth_time", Date.now().toString());
};

const isAuthLikelyExpired = async (thresholdMs = 15 * 60 * 1000): Promise<boolean> => {
  const lastAuthTime = await SecureStorage.load("ta_last_auth_time");
  if (!lastAuthTime) return true;
  const elapsed = Date.now() - parseInt(lastAuthTime, 10);
  return Number.isFinite(elapsed) && elapsed > thresholdMs;
};

const prefetchCourseReports = async (coursesJson: string): Promise<boolean> => {
  let parsed: any[] = [];
  try {
    parsed = JSON.parse(coursesJson);
  } catch {
    return false;
  }

  const urls: string[] = [];
  for (const course of parsed) {
    // Skip stale courses — they are hidden by the teacher and their report URLs
    // may return the school homepage, which would overwrite valid cached data.
    if (course?.isGradeStale) continue;

    const reportUrl = course?.reportUrl
      ? await resolveReportUrl(String(course.reportUrl).replace(/&amp;/g, "&"))
      : null;

    if (reportUrl) {
      urls.push(reportUrl);
      continue;
    }

    if (course?.subjectId) {
      const url = await buildCourseReportUrl(String(course.subjectId));
      if (url) urls.push(url);
    }
  }

  const uniqueUrls = Array.from(new Set(urls));
  if (uniqueUrls.length === 0) return false;

  for (const url of uniqueUrls) {
    const { html } = await fetchHtmlWithCookies(url);
    if (html.toLowerCase().includes("log in")) {
      return false;
    }
    const subjectId = getSubjectIdFromUrl(url);
    if (subjectId) {
      const parsed = parseGradeData(html);
      if (parsed.success) {
        await saveParsedCourseReport(subjectId, parsed);
      }
    }
  }

  return true;
};

const resolveAppointmentSubject = async (
  appointmentInfo: Partial<AppointmentData>
): Promise<string> => {
  const subject = (appointmentInfo.subject ?? "").trim();
  if (subject) return subject;

  const reason = (appointmentInfo.reason ?? "").trim();
  if (!reason) return "";

  try {
    const reasonMappingJson = await SecureStorage.load("reason_mapping");
    if (reasonMappingJson) {
      const reasonMapping = JSON.parse(reasonMappingJson) as Record<
        string,
        string
      >;
      const mappedReason = reasonMapping?.[reason];
      if (mappedReason) return mappedReason;
    }
  } catch {
    // ignore invalid mappings and fall back to the raw reason
  }

  return reason;
};

// new appointment has been booked, save to securestore
const saveAppointmentData = async (
  appointmentInfo: Partial<AppointmentData>
) => {
  try {
    // Load existing appointments
    const existingAppointmentsJson =
      await SecureStorage.load("ta_appointments");
    let appointments: AppointmentData[] = [];

    if (existingAppointmentsJson) {
      appointments = JSON.parse(existingAppointmentsJson);
    }

    const subject = await resolveAppointmentSubject(appointmentInfo);
    const teacher = (appointmentInfo.teacher ?? "").trim();

    // make new appointment object
    const newAppointment: AppointmentData = {
      id: appointmentInfo.id || Date.now().toString(),
      date: appointmentInfo.date || "",
      time: appointmentInfo.time || "",
      teacher,
      subject,
      reason: appointmentInfo.reason || "",
      bookedAt: new Date().toISOString(),
      schoolId: appointmentInfo.schoolId || "",
    };

    appointments.push(newAppointment);

    await SecureStorage.save("ta_appointments", JSON.stringify(appointments));
    await refreshGuidanceReminders();
  } catch (error) {
    console.error("taauth: Error saving appointment data:", error);
  }
};

// remove appointment from secure store
const removeAppointmentData = async (appointmentId: string) => {
  try {
    const existingAppointmentsJson =
      await SecureStorage.load("ta_appointments");
    if (existingAppointmentsJson) {
      let appointments: AppointmentData[] = JSON.parse(
        existingAppointmentsJson
      );
      appointments = appointments.filter((apt) => apt.id !== appointmentId);
      await SecureStorage.save("ta_appointments", JSON.stringify(appointments));
      await refreshGuidanceReminders();
    }
  } catch (error) {
    console.error("taauth: Error removing appointment data:", error);
  }
};

// parse the url to get the important parts of the appointment
const extractAppointmentFromUrl = (url: string) => {
  const urlParams = new URLSearchParams(url.split("?")[1]);
  return {
    date: urlParams.get("dt") || urlParams.get("inputDate") || "",
    time: urlParams.get("tm") || "",
    id: urlParams.get("id") || "",
    schoolId: urlParams.get("school_id") || "",
  };
};

const fetchSchoolName = async (schoolId: string) => {
  try {
    const calendarUrl = await buildTeachAssistStudentsUrl(
      `calendar_full.php?school_id=${schoolId}`,
    );

    const response = await fetch(calendarUrl); // no cookies needed

    if (response.ok) {
      const calendarHtml = await response.text();
      // get school name
      const h1Match = calendarHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (h1Match && h1Match[1]) {
        const fullH1Text = h1Match[1].trim();
        // bc calender has school full cal at front
        const schoolName = fullH1Text
          .replace(/\s+School Full Calendar$/i, "")
          .trim();
        await SecureStorage.save("school_name", schoolName);
        return schoolName;
      } else {
        console.warn("taauth: Could not find h1 tag in calendar page");
        return null;
      }
    } else {
      console.warn(
        `taauth: Failed to fetch calendar page, status: ${response.status}`
      );
      return null;
    }
  } catch (error) {
    console.error("taauth: Error fetching school name:", error);
    return null;
  }
};

// make the form data to prepare for POST
const createFormDataString = (formData: AppointmentFormData): string => {
  const params = new URLSearchParams();

  // add all hidden fields
  Object.entries(formData.hiddenFields).forEach(([key, value]) => {
    params.append(key, value);
  });

  // Add form selections
  if (formData.reason) {
    params.append("reason", formData.reason);
  }

  if (formData.withParent) {
    params.append("withParent", "10");
  }

  if (formData.online) {
    params.append("online", "100");
  }

  params.append("submit", "Submit Reason");

  return params.toString();
};

const isAppointmentForm = (html: string): boolean => {
  return (
    html.includes('name="reason"') &&
    html.includes('type="radio"') &&
    html.includes("Submit Reason")
  );
};

const refreshGuidanceReminders = async () => {
  if (Constants.appOwnership === "expo") return;
  try {
    const { scheduleGuidanceReminders } =
      await import("@/utils/notifications");
    await scheduleGuidanceReminders();
  } catch (error) {
    console.warn("taauth: Failed to refresh guidance reminders", error);
  }
};

const syncStoredStudentGrade = async (coursesJson: string) => {
  try {
    const {
      scheduleStudentGradeNotification,
      syncStoredStudentGrade: persistStudentGrade,
    } = await import("@/utils/notifications");
    const grade = await persistStudentGrade(coursesJson);

    if (Constants.appOwnership !== "expo") {
      await scheduleStudentGradeNotification(grade);
    }
  } catch (error) {
    console.warn("taauth: Failed to sync stored student grade", error);
  }
};

const TeachAssistAuthFetcher: React.FC<TeachAssistAuthFetcherProps> = ({
  loginParams,
  fetchWithCookies,
  prefetchCourses,
  fetchCourseUrl,
  getGuidance,
  bookAppointment,
  submitAppointmentForm,
  appointmentMeta,
  cancelAppointment,
  onResult,
  onError,
  onLoadingChange,
}) => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const safeOnResult = (result: string) => {
      if (!cancelled && isMountedRef.current) {
        onResult(result);
      }
    };

    const safeOnError = (error: string) => {
      if (!cancelled && isMountedRef.current) {
        onError?.(error);
      }
    };

    const safeOnLoading = (loading: boolean) => {
      if (!cancelled && isMountedRef.current) {
        onLoadingChange?.(loading);
      }
    };

    const loginAndStore = async (
      username: string,
      password: string,
      shouldPrefetch: boolean
    ): Promise<{ success: boolean; error?: string; html?: string }> => {
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);

      // example login
      if (encodedPassword === DEMO_PASSWORD && encodedUsername === DEMO_USERNAME) {
        await SecureStorage.save("ta_username", username);
        await SecureStorage.save("ta_password", password);
        await SecureStorage.save("ta_is_demo", "true");
        await SecureStorage.save("ta_student_id", "");
        await SecureStorage.save("ta_session_token", "");
        // Center demo course dates on "now" so the active-semester scoping in
        // GradeAverage always includes them (otherwise the average reads N/A
        // out of term). subjectId values make the demo courses tappable and
        // route to the static demo report. Feb–Jul presents as semester 2.
        const demoNow = new Date();
        const padDatePart = (value: number) => String(value).padStart(2, "0");
        const formatDemoDate = (date: Date) =>
          `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
        const demoStart = new Date(demoNow);
        demoStart.setMonth(demoStart.getMonth() - 3);
        const demoEnd = new Date(demoNow);
        demoEnd.setMonth(demoEnd.getMonth() + 3);
        const demoStartDate = formatDemoDate(demoStart);
        const demoEndDate = formatDemoDate(demoEnd);
        const demoSemester =
          demoNow.getMonth() >= 1 && demoNow.getMonth() <= 6 ? 2 : 1;
        const demoCoursesJson = JSON.stringify([
          {
            courseCode: "AMI1O1",
            courseName: "Instrumental Music - Band",
            block: "1",
            room: "41",
            startDate: demoStartDate,
            semester: demoSemester,
            endDate: demoEndDate,
            grade: "89.6",
            hasGrade: true,
            subjectId: "900001",
            midtermMark: "55",
            finalMark: "99",
          },
          {
            courseCode: "CGC1D1",
            courseName: "Issues In Canadian Geography",
            block: "2",
            room: "167",
            startDate: demoStartDate,
            semester: demoSemester,
            endDate: demoEndDate,
            grade: "92.1",
            hasGrade: true,
            subjectId: "900002",
          },
          {
            courseCode: "LUNCH",
            courseName: "Lunch",
            block: "3",
            room: "CAFE",
            startDate: demoStartDate,
            semester: demoSemester,
            endDate: demoEndDate,
            hasGrade: false,
          },
          {
            courseCode: "ICD2O1",
            courseName: "Digital Technology",
            block: "4",
            room: "114",
            startDate: demoStartDate,
            semester: demoSemester,
            endDate: demoEndDate,
            grade: "80",
            hasGrade: true,
            subjectId: "900003",
          },
          {
            courseCode: "BBI2O1",
            courseName: "Introduction to Business",
            block: "5",
            room: "137",
            startDate: demoStartDate,
            semester: demoSemester,
            endDate: demoEndDate,
            grade: "92",
            hasGrade: true,
            subjectId: "900004",
          },
        ]);
        await SecureStorage.save("ta_courses", demoCoursesJson);
        primeCoursesMemoryCache(demoCoursesJson);
        await syncStoredStudentGrade(demoCoursesJson);
        await saveMarksLastRetrievedNow("loginAndStore demo account");
        await SecureStorage.save("school_id", "0");
        await SecureStorage.save("school_name", "Example School");
        return { success: true };
      }

      const loginUrl = `${await getIndexUrl()}&username=${encodedUsername}&password=${encodedPassword}&submit=Login`;
      const { html } = await fetchHtmlWithCookies(loginUrl);

      if (html.toLowerCase().includes("log in")) {
        return {
          success: false,
          error:
            "Login Failed: Please check your student ID and password and try again.",
        };
      }

      if (!html.toLowerCase().includes("student reports")) {
        return {
          success: false,
          error: "Login Failed: Unexpected content. Contact support!",
        };
      }

      const coursesHtmlString: string = parseStudentGrades(html);
      let mergedCoursesJson = coursesHtmlString;
      try {
        const freshCourses = JSON.parse(coursesHtmlString);
        const cachedCoursesJson = await SecureStorage.load("ta_courses");
        if (cachedCoursesJson) {
          const cachedCourses = JSON.parse(cachedCoursesJson);
          const mergedCourses = mergeCoursesWithCache(
            Array.isArray(freshCourses) ? freshCourses : [],
            Array.isArray(cachedCourses) ? cachedCourses : []
          );
          mergedCoursesJson = JSON.stringify(mergedCourses);
        }
      } catch {
        // fall back to fresh courses only
      }
      const schoolId = html.match(/school_id=(\d+)/)?.[1] ?? null;

      await syncStoredSessionFromHtml(html);

      if (!schoolId) {
        return {
          success: false,
          error: "Login Failed: Unexpected content. Contact support!",
        };
      }

      await SecureStorage.save("ta_username", username);
      await SecureStorage.save("ta_password", password);
      await SecureStorage.save("ta_is_demo", "false");
      await SecureStorage.save("ta_courses", mergedCoursesJson);
      primeCoursesMemoryCache(mergedCoursesJson);
      await syncStoredStudentGrade(mergedCoursesJson);
      await SecureStorage.save("school_id", schoolId);
      await fetchSchoolName(schoolId);

      if (shouldPrefetch) {
        await prefetchCourseReports(mergedCoursesJson);
      }
      await saveMarksLastRetrievedNow("loginAndStore standard account");
      await saveLastAuthTime();

      // The login response is the index page itself; callers fetching the
      // index can reuse it instead of a second round trip.
      return { success: true, html };
    };

    const fetchHtmlWithAutoReauth = async (
      url: string,
      init?: RequestInit,
    ): Promise<{ html: string; reauthed: boolean }> => {
      const first = await fetchHtmlWithCookies(url, init);
      if (!first.html.toLowerCase().includes("log in")) {
        return { html: first.html, reauthed: false };
      }

      const savedUsername = await SecureStorage.load("ta_username");
      const savedPassword = await SecureStorage.load("ta_password");

      if (!savedUsername || !savedPassword) {
        return { html: first.html, reauthed: false };
      }

      const reauthResult = await loginAndStore(
        savedUsername,
        savedPassword,
        false
      );
      if (!reauthResult.success) {
        return { html: first.html, reauthed: false };
      }

      const retry = await fetchHtmlWithCookies(url, init);
      return { html: retry.html, reauthed: true };
    };

    const run = async () => {
      const hasRequest = Boolean(
        loginParams ||
        fetchCourseUrl ||
        fetchWithCookies ||
        getGuidance ||
        bookAppointment ||
        submitAppointmentForm ||
        cancelAppointment
      );

      if (!hasRequest) return;

      safeOnLoading(true);

      try {
        if (loginParams) {
          const result = await loginAndStore(
            loginParams.username,
            loginParams.password,
            Boolean(prefetchCourses)
          );

          if (!result.success) {
            safeOnResult(result.error ?? "Login Failed: Unknown error.");
          } else {
            safeOnResult("Login Success");
          }
          return;
        }

        if (fetchCourseUrl) {
          const { html } = await fetchHtmlWithAutoReauth(fetchCourseUrl);
          if (html.toLowerCase().includes("log in")) {
            safeOnResult("Login Failed: Session expired or invalid cookies.");
          } else {
            safeOnResult(html);
          }
          return;
        }

        if (fetchWithCookies) {
          let { html } = await fetchHtmlWithCookies(await getIndexUrl());
          // Tracks whether an in-line re-login already parsed, merged, saved and
          // notified — repeating that work here caused a visible second refresh.
          let reauthHandledStorage = false;

          if (html.toLowerCase().includes("log in")) {
            const savedUsername = await SecureStorage.load("ta_username");
            const savedPassword = await SecureStorage.load("ta_password");
            if (savedUsername && savedPassword) {
              const reauth = await loginAndStore(
                savedUsername,
                savedPassword,
                Boolean(prefetchCourses)
              );
              if (reauth.success) {
                reauthHandledStorage = true;
                if (reauth.html) {
                  html = reauth.html;
                } else {
                  // Demo login has no portal HTML; storage is already populated.
                  safeOnResult("Login Success");
                  return;
                }
              }
            }
          }

          if (html.toLowerCase().includes("log in")) {
            safeOnResult("Login Failed: Session expired or invalid cookies.");
            return;
          }

          if (
            !reauthHandledStorage &&
            prefetchCourses &&
            html.toLowerCase().includes("student reports")
          ) {
            try {
              const coursesJsonString = parseStudentGrades(html);
              let mergedCoursesJson = coursesJsonString;
              try {
                const freshCourses = JSON.parse(coursesJsonString);
                const cachedCoursesJson =
                  await SecureStorage.load("ta_courses");
                if (cachedCoursesJson) {
                  const cachedCourses = JSON.parse(cachedCoursesJson);
                  const mergedCourses = mergeCoursesWithCache(
                    Array.isArray(freshCourses) ? freshCourses : [],
                    Array.isArray(cachedCourses) ? cachedCourses : []
                  );
                  mergedCoursesJson = JSON.stringify(mergedCourses);
                }
              } catch {
                // fall back to fresh courses only
              }

              await SecureStorage.save("ta_courses", mergedCoursesJson);
              primeCoursesMemoryCache(mergedCoursesJson);
              await syncStoredStudentGrade(mergedCoursesJson);

              const schoolIdFromHtml = html.match(/school_id=(\d+)/)?.[1];
              if (schoolIdFromHtml) {
                await SecureStorage.save("school_id", schoolIdFromHtml);
              }

              await prefetchCourseReports(mergedCoursesJson);
              await saveMarksLastRetrievedNow("fetchWithCookies prefetch");
              await saveLastAuthTime();
            } catch {
              // fall through and just return the HTML
            }
          }

          safeOnResult(html);
          return;
        }

        if (getGuidance) {
          if (await isDemoAccount()) {
            safeOnResult(buildDemoGuidanceHtml(getGuidance));
            return;
          }
          const savedStudentId = await SecureStorage.load("ta_student_id");
          const savedSchoolId = await SecureStorage.load("school_id");

          if (!savedStudentId || !savedSchoolId) {
            safeOnResult(
              "Retrieval failed: Session expired or invalid cookies."
            );
            return;
          }

          // Proactively re-auth before hitting the guidance URL when the session
          // is likely expired. The TA portal is known to hang for a long time on
          // expired-session requests before eventually redirecting to login, so
          // re-logging in upfront avoids that wait entirely.
          if (await isAuthLikelyExpired()) {
            const savedUsername = await SecureStorage.load("ta_username");
            const savedPassword = await SecureStorage.load("ta_password");
            if (savedUsername && savedPassword) {
              await loginAndStore(savedUsername, savedPassword, false);
            }
          }

          const guidanceDate = formatDateForGuidance(getGuidance);
          const url = await buildTeachAssistStudentsUrl(
            `bookAppointment.php?school_id=${savedSchoolId}&student_id=${savedStudentId}&inputDate=${guidanceDate}`,
          );

          const { html } = await fetchHtmlWithAutoReauth(url);
          if (html.toLowerCase().includes("log in")) {
            safeOnResult(
              "Retrieval failed: Session expired or invalid cookies."
            );
          } else if (html.includes("NOT A SCHOOL DAY")) {
            safeOnResult("NOT A SCHOOL DAY");
          } else {
            safeOnResult(html);
          }
          return;
        }

        if (bookAppointment) {
          if (await isDemoAccount()) {
            const cleanedUrl = decodeHtmlEntities(bookAppointment);
            const appointmentDetails = extractAppointmentFromUrl(cleanedUrl);
            await saveAppointmentData({
              ...appointmentDetails,
              schoolId: appointmentDetails.schoolId || "0",
              reason: "Guidance Appointment",
              teacher: appointmentMeta?.teacher,
              subject: appointmentMeta?.subject,
            });
            safeOnResult("Appointment booked successfully!");
            return;
          }
          const cleanedUrl = decodeHtmlEntities(bookAppointment);
          const { html } = await fetchHtmlWithAutoReauth(cleanedUrl);

          if (html.toLowerCase().includes("log in")) {
            safeOnResult("Booking Failed: Session expired or invalid cookies.");
            return;
          }

          if (html.toLowerCase().includes("cancel")) {
            const appointmentDetails = extractAppointmentFromUrl(cleanedUrl);
            const savedSchoolId = await SecureStorage.load("school_id");

            await saveAppointmentData({
              ...appointmentDetails,
              schoolId: savedSchoolId || appointmentDetails.schoolId,
              reason: "Guidance Appointment",
              teacher: appointmentMeta?.teacher,
              subject: appointmentMeta?.subject,
            });

            safeOnResult("Appointment booked successfully!");
            return;
          }

          if (isAppointmentForm(html)) {
            safeOnResult(html);
            return;
          }

          safeOnResult("Failed to book appointment. Please try again.");
          return;
        }

        if (cancelAppointment) {
          if (await isDemoAccount()) {
            if (cancelAppointment.id) {
              await removeAppointmentData(cancelAppointment.id);
            }
            safeOnResult("Appointment cancelled successfully!");
            return;
          }
          const { date, time, id, schoolId } = cancelAppointment;
          const url = await buildTeachAssistStudentsUrl(
            `bookAppointment.php?dt=${date}&tm=${time}&id=${id}&school_id=${schoolId}&action=cancel`,
          );

          const { html } = await fetchHtmlWithAutoReauth(url);

          if (html.toLowerCase().includes("log in")) {
            safeOnResult(
              "Cancellation failed: Session expired or invalid cookies."
            );
            return;
          }

          if (
            html.toLowerCase().includes("cancelled") ||
            html.toLowerCase().includes("canceled")
          ) {
            if (id) {
              await removeAppointmentData(id);
            }
            safeOnResult("Appointment cancelled successfully!");
            return;
          }

          if (id) {
            await removeAppointmentData(id);
          }

          safeOnResult("Appointment successfully processed.");
          return;
        }

        if (submitAppointmentForm) {
          if (await isDemoAccount()) {
            if (submitAppointmentForm.hiddenFields) {
              const appointmentDetails = {
                date:
                  submitAppointmentForm.hiddenFields.dt ||
                  submitAppointmentForm.hiddenFields.inputDate ||
                  "",
                time: submitAppointmentForm.hiddenFields.tm || "",
                id:
                  submitAppointmentForm.hiddenFields.id ||
                  Date.now().toString(),
                schoolId: submitAppointmentForm.hiddenFields.school_id || "0",
                reason: submitAppointmentForm.reason || "Guidance Appointment",
                teacher: appointmentMeta?.teacher,
                subject:
                  submitAppointmentForm.reasonLabel ?? appointmentMeta?.subject,
              };

              await saveAppointmentData(appointmentDetails);
            }
            safeOnResult("Appointment booked successfully!");
            return;
          }
          const formDataString = createFormDataString(submitAppointmentForm);
          const { html } = await fetchHtmlWithAutoReauth(
            await buildTeachAssistStudentsUrl("bookAppointment.php"),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: formDataString,
            }
          );

          if (html.toLowerCase().includes("log in")) {
            safeOnResult(
              "Form submission failed: Session expired or invalid cookies."
            );
            return;
          }

          if (
            html.toLowerCase().includes("cancel") ||
            html.toLowerCase().includes("booked")
          ) {
            if (submitAppointmentForm.hiddenFields) {
              const appointmentDetails = {
                date:
                  submitAppointmentForm.hiddenFields.dt ||
                  submitAppointmentForm.hiddenFields.inputDate ||
                  "",
                time: submitAppointmentForm.hiddenFields.tm || "",
                id:
                  submitAppointmentForm.hiddenFields.id ||
                  Date.now().toString(),
                schoolId: submitAppointmentForm.hiddenFields.school_id || "",
                reason: submitAppointmentForm.reason || "Guidance Appointment",
                teacher: appointmentMeta?.teacher,
                subject:
                  submitAppointmentForm.reasonLabel ?? appointmentMeta?.subject,
              };

              await saveAppointmentData(appointmentDetails);
            }

            safeOnResult("Appointment booked successfully!");
            return;
          }

          if (
            html.toLowerCase().includes("error") ||
            html.toLowerCase().includes("failed")
          ) {
            safeOnResult(
              "Failed to submit appointment form. Please try again."
            );
            return;
          }

          safeOnResult("Appointment request submitted successfully!");
          return;
        }
      } catch (error: any) {
        console.error("taauth: Error processing request:", error);
        safeOnError(`taauth: Error processing data: ${error.toString()}`);
        safeOnResult("Operation Failed: Internal Error");
      } finally {
        safeOnLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    loginParams,
    fetchWithCookies,
    prefetchCourses,
    fetchCourseUrl,
    getGuidance,
    bookAppointment,
    submitAppointmentForm,
    appointmentMeta,
    cancelAppointment,
    onResult,
    onError,
    onLoadingChange,
  ]);

  return null;
};

export default TeachAssistAuthFetcher;
