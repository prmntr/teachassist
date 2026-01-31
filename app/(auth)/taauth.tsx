import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef } from "react";
import { parseStudentGrades } from "../(components)/CourseParser";
import { resolveReportUrl } from "../(utils)/courseCache";

// every interaction to the outside world should be passed through here

const INDEX_URL = "https://ta.yrdsb.ca/live/index.php?subject_id=0";

// wrapper for expo-secure-store
export class SecureStorage {
  static async save(key: string, value: string) {
    console.log(`SecureStorage: Saving ${key}...`);
    await SecureStore.setItemAsync(key, value);
  }

  static async load(key: string) {
    console.log(`SecureStorage: Loading ${key}...`);
    return await SecureStore.getItemAsync(key);
  }

  static async delete(key: string) {
    console.log(`SecureStorage: Deleting ${key}...`);
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

const syncStoredSessionFromCookies = async () => {
  const cookies = parseCookieHeader(await SecureStorage.load("ta_cookies"));
  const studentId = cookies.student_id ?? null;
  const sessionToken = cookies.session_token ?? null;

  if (studentId) {
    await SecureStorage.save("ta_student_id", studentId);
  }

  if (sessionToken) {
    await SecureStorage.save("ta_session_token", sessionToken);
  }

  return { studentId, sessionToken };
};

const fetchHtmlWithCookies = async (
  url: string,
  init: RequestInit = {},
  logCookieContext?: string
): Promise<{ html: string; response: Response }> => {
  const cookieHeader = await buildCookieHeader();
  const headers = new Headers(init.headers ?? {});

  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  if (logCookieContext) {
    const effectiveCookie = headers.get("Cookie");
    console.log(
      `taauth: ${logCookieContext} cookie header: ${
        effectiveCookie ?? "<none>"
      }`
    );
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
  return `https://ta.yrdsb.ca/live/students/viewReport.php?subject_id=${subjectId}&student_id=${savedStudentId}&school_id=${savedSchoolId}`;
};

const isCourseReportHtml = (html: string): boolean => {
  return (
    html.includes("Assignment</th>") ||
    html.includes("Course Weighting") ||
    html.includes("Student Achievement")
  );
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
    const reportUrl = course?.reportUrl
      ? resolveReportUrl(String(course.reportUrl).replace(/&amp;/g, "&"))
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
    if (subjectId && isCourseReportHtml(html)) {
      await SecureStorage.save(`course_${subjectId}`, html);
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
    console.log("taauth: Appointment data saved successfully");
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
      console.log("taauth: Appointment removed successfully");
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
    console.log(`taauth: Fetching school name for school ID ${schoolId}`);
    const calendarUrl = `https://ta.yrdsb.ca/live/students/calendar_full.php?school_id=${schoolId}`;

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
        console.log(`taauth: school name is ${schoolName}`);
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
      await import("../(utils)/notifications");
    await scheduleGuidanceReminders();
  } catch (error) {
    console.warn("taauth: Failed to refresh guidance reminders", error);
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
    ): Promise<{ success: boolean; error?: string }> => {
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);

      // example login
      if (encodedPassword === "password" && encodedUsername === "123456789") {
        await SecureStorage.save("ta_username", username);
        await SecureStorage.save("ta_password", password);
        await SecureStorage.save("ta_student_id", "");
        await SecureStorage.save("ta_session_token", "");
        await SecureStorage.save(
          "ta_courses",
          `[
  {
    "courseCode": "ENG2D1",
    "courseName": "English",
    "block": "1",
    "room": "41",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "96",
    "midtermMark": "94",
    "hasGrade": true
  },
  {
    "courseCode": "CHC2D1",
    "courseName": "Canadian History Since WW2",
    "block": "2",
    "room": "76",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "97",
    "hasGrade": true

  },
  {
    "courseCode": "LUNCH",
    "courseName": "Lunch",
    "block": "3",
    "room": "CAFE",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "hasGrade": false
  },
  {
    "courseCode": "ICD2O1",
    "courseName": "Digital Technology",
    "block": "4",
    "room": "114",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "93",
    "hasGrade": true
  },
  {
    "courseCode": "BBI2O1",
    "courseName": "Introduction to Business",
    "block": "5",
    "room": "137",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "92",
    "hasGrade": true
  }
]
`
        );
        await SecureStorage.save("school_id", "0");
        await SecureStorage.save("school_name", "Example School");
        return { success: true };
      }

      const loginUrl = `${INDEX_URL}&username=${encodedUsername}&password=${encodedPassword}&submit=Login`;
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
      const schoolId = html.match(/school_id=(\d+)/)?.[1] ?? null;

      const cookieSession = await syncStoredSessionFromCookies();
      const studentId =
        cookieSession.studentId ?? extractStudentIdFromHtml(html);
      const sessionToken =
        cookieSession.sessionToken ?? extractSessionTokenFromHtml(html);

      if (studentId && studentId !== cookieSession.studentId) {
        await SecureStorage.save("ta_student_id", studentId);
      }
      if (sessionToken && sessionToken !== cookieSession.sessionToken) {
        await SecureStorage.save("ta_session_token", sessionToken);
      }

      if (!schoolId) {
        return {
          success: false,
          error: "Login Failed: Unexpected content. Contact support!",
        };
      }

      if (!sessionToken) {
        console.warn(
          "taauth: Login succeeded but session cookies were unreadable; continuing with best-effort session state."
        );
      }

      await SecureStorage.save("ta_username", username);
      await SecureStorage.save("ta_password", password);
      await SecureStorage.save("ta_courses", coursesHtmlString);
      await SecureStorage.save("school_id", schoolId);
      await fetchSchoolName(schoolId);

      if (shouldPrefetch) {
        await prefetchCourseReports(coursesHtmlString);
      }

      return { success: true };
    };

    const fetchHtmlWithAutoReauth = async (
      url: string,
      init?: RequestInit,
      logCookieContext?: string
    ): Promise<{ html: string; reauthed: boolean }> => {
      const first = await fetchHtmlWithCookies(url, init, logCookieContext);
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

      const retry = await fetchHtmlWithCookies(
        url,
        init,
        logCookieContext ? `${logCookieContext} (retry)` : undefined
      );
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
          console.log("taauth: starting login");
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
          console.log(
            `taauth: Fetching specific course URL: ${fetchCourseUrl}`
          );
          const { html } = await fetchHtmlWithAutoReauth(fetchCourseUrl);
          if (html.toLowerCase().includes("log in")) {
            safeOnResult("Login Failed: Session expired or invalid cookies.");
          } else {
            console.log("taauth: Course HTML fetched successfully from URL");
            safeOnResult(html);
          }
          return;
        }

        if (fetchWithCookies) {
          console.log("taauth: Fetching main courses page with cookies");
          const { html } = await fetchHtmlWithAutoReauth(INDEX_URL);

          if (html.toLowerCase().includes("log in")) {
            safeOnResult("Login Failed: Session expired or invalid cookies.");
            return;
          }

          if (
            prefetchCourses &&
            html.toLowerCase().includes("student reports")
          ) {
            try {
              const coursesJsonString = parseStudentGrades(html);
              await SecureStorage.save("ta_courses", coursesJsonString);

              const schoolIdFromHtml = html.match(/school_id=(\d+)/)?.[1];
              if (schoolIdFromHtml) {
                await SecureStorage.save("school_id", schoolIdFromHtml);
              }

              await prefetchCourseReports(coursesJsonString);
            } catch {
              // fall through and just return the HTML
            }
          }

          safeOnResult(html);
          console.log("taauth: html fetched successfully with cookies");
          return;
        }

        if (getGuidance) {
          const savedStudentId = await SecureStorage.load("ta_student_id");
          const savedSchoolId = await SecureStorage.load("school_id");
          const storedCookieHeader = await SecureStorage.load("ta_cookies");
          const storedSessionToken = await SecureStorage.load("ta_session_token");
          console.log(
            `taauth: guidance cookie debug - ta_cookies: ${
              storedCookieHeader ?? "<missing>"
            }, ta_session_token: ${storedSessionToken ?? "<missing>"}`
          );

          if (!savedStudentId || !savedSchoolId) {
            safeOnResult(
              "Retrieval failed: Session expired or invalid cookies."
            );
            return;
          }

          const formatDateForAPI = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          };

          const guidanceDate = formatDateForAPI(getGuidance);
          console.log(`taauth: Fetching guidance for date ${guidanceDate}`);
          const url = `https://ta.yrdsb.ca/live/students/bookAppointment.php?school_id=${savedSchoolId}&student_id=${savedStudentId}&inputDate=${guidanceDate}`;

          const { html } = await fetchHtmlWithAutoReauth(
            url,
            undefined,
            "guidance request"
          );
          if (html.toLowerCase().includes("log in")) {
            safeOnResult(
              "Retrieval failed: Session expired or invalid cookies."
            );
          } else if (html.includes("NOT A SCHOOL DAY")) {
            safeOnResult("NOT A SCHOOL DAY");
          } else {
            safeOnResult(html);
            console.log("taauth: guidance html fetched successfully");
          }
          return;
        }

        if (bookAppointment) {
          console.log("taauth: Processing appointment booking response");
          const cleanedUrl = decodeHtmlEntities(bookAppointment);
          const { html } = await fetchHtmlWithAutoReauth(cleanedUrl);

          if (html.toLowerCase().includes("log in")) {
            safeOnResult("Booking Failed: Session expired or invalid cookies.");
            return;
          }

          if (html.toLowerCase().includes("cancel")) {
            console.log("taauth: appointment booking successful");
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
            console.log("taauth: appointment form detected, needs user input");
            safeOnResult(html);
            return;
          }

          console.log(
            "taauth: appointment booking failed - unexpected response"
          );
          safeOnResult("Failed to book appointment. Please try again.");
          return;
        }

        if (cancelAppointment) {
          console.log("taauth: Processing appointment cancellation response");
          const { date, time, id, schoolId } = cancelAppointment;
          const url = `https://ta.yrdsb.ca/live/students/bookAppointment.php?dt=${date}&tm=${time}&id=${id}&school_id=${schoolId}&action=cancel`;

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
            console.log("taauth: appointment cancelled successfully");
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
          console.log("taauth: Processing form submission response");
          const formDataString = createFormDataString(submitAppointmentForm);
          const { html } = await fetchHtmlWithAutoReauth(
            "https://ta.yrdsb.ca/live/students/bookAppointment.php",
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
            console.log("taauth: appointment form submitted successfully");

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
            console.log("taauth: form submission failed");
            safeOnResult(
              "Failed to submit appointment form. Please try again."
            );
            return;
          }

          console.log("taauth: form submission completed");
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
