import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { router } from "expo-router";
import { Platform } from "react-native";
import { parseStudentGrades, type Course } from "../(components)/CourseParser";
import { parseGradeData } from "../(components)/GradeParser";
import {
  hasVisibleGradeForNotifications,
  mergeCoursesWithCache,
  resolveReportUrl,
} from "./courseCache";

// Background task name used to keep course data fresh and give mark-change alerts
const MARKS_TASK = "teachassist-marks-sync";

const NOTIF_KEYS = {
  guidance: "notif_guidance_enabled",
  marks: "notif_marks_enabled",
  hideMarks: "notif_hide_marks",
  notifyHidden: "notif_notify_hidden_marks",
  notifyNoChanges: "notif_notify_no_changes",
  marksTest: "notif_marks_test",
};



const ACCENT_COLOR = "#27b1fa";
const APP_SCHEME = "teachassist";

const buildRoutePath = (path: string) => `/${path.replace(/^\/+/, "")}`;

const formatTeacherName = (teacher?: string) =>
  (teacher ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim();

const getTestCourse = async (): Promise<Course> => {
  const cachedCoursesJson = await loadSecureItem("ta_courses");
  if (cachedCoursesJson) {
    try {
      const courses = JSON.parse(cachedCoursesJson) as Course[];
      if (Array.isArray(courses) && courses.length > 0) {
        return courses[0];
      }
    } catch {
      // fall back to default course
    }
  }

  return {
    courseCode: "TEST",
    courseName: "Sample Course",
    block: "",
    room: "",
    startDate: "",
    endDate: "",
    grade: "90",
    hasGrade: true,
    semester: 1,
  };
};

let responseListener: { remove: () => void } | null = null;
let lastHandledResponseId: string | null = null;

export type NotificationSettings = {
  guidanceRemindersEnabled: boolean;
  markChangeEnabled: boolean;
  hideMarksInNotifications: boolean;
  notifyWhenMarksHidden: boolean;
  notifyWhenNoChanges: boolean;
};

type ServiceRunDebug = {
  taskStatus?: BackgroundTask.BackgroundTaskStatus;
  markChangeEnabled?: boolean;
  notifyWhenNoChanges?: boolean;
  notifyWhenMarksHidden?: boolean;
  shouldCheckMarks?: boolean;
  hasCookie?: boolean;
  loginAttempted?: boolean;
  loginSucceeded?: boolean;
  sessionRecovered?: boolean;
  homepageOk?: boolean;
  homepageLoginRequired?: boolean;
  parsedCourses?: number;
  cachedCourses?: number;
  hasUpdates?: boolean;
  sentNoChanges?: boolean;
  marksTest?: boolean;
  reason?: string;
  error?: string;
};

type HomepageFetchResult = {
  html: string | null;
  loginAttempted: boolean;
  loginSucceeded: boolean;
  sessionRecovered: boolean;
};

type AppointmentData = {
  id: string;
  date: string;
  time: string;
  teacher?: string;
  subject?: string;
  reason?: string;
  bookedAt: string;
  schoolId: string;
};

const saveSecureItem = async (key: string, value: string) => {
  await SecureStore.setItemAsync(key, value);
};

const loadSecureItem = async (key: string) => {
  return await SecureStore.getItemAsync(key);
};

const parseBool = (value: string | null, fallback: boolean) => {
  if (value === null) return fallback;
  return value === "true";
};

export const loadNotificationSettings = async (): Promise<NotificationSettings> => {
  const [
    guidance,
    marks,
    hideMarks,
    notifyHidden,
    notifyNoChanges,
  ] = await Promise.all([
    AsyncStorage.getItem(NOTIF_KEYS.guidance),
    AsyncStorage.getItem(NOTIF_KEYS.marks),
    AsyncStorage.getItem(NOTIF_KEYS.hideMarks),
    AsyncStorage.getItem(NOTIF_KEYS.notifyHidden),
    AsyncStorage.getItem(NOTIF_KEYS.notifyNoChanges),
  ]);

  return {
    guidanceRemindersEnabled: parseBool(guidance, false),
    markChangeEnabled: parseBool(marks, false),
    hideMarksInNotifications: parseBool(hideMarks, false),
    notifyWhenMarksHidden: parseBool(notifyHidden, false),
    notifyWhenNoChanges: parseBool(notifyNoChanges, false),
  };
};

export const saveNotificationSetting = async (
  key: keyof NotificationSettings,
  value: boolean
) => {
  const storageKey =
    key === "guidanceRemindersEnabled"
      ? NOTIF_KEYS.guidance
      : key === "markChangeEnabled"
        ? NOTIF_KEYS.marks
        : key === "hideMarksInNotifications"
          ? NOTIF_KEYS.hideMarks
          : key === "notifyWhenNoChanges"
            ? NOTIF_KEYS.notifyNoChanges
            : NOTIF_KEYS.notifyHidden;

  await AsyncStorage.setItem(storageKey, String(value));
};

export const ensureNotificationPermissions = async () => {
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status === "granted") return true;

  const request = await Notifications.requestPermissionsAsync();
  return request.status === "granted";
};

const setNotificationChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("ta-alerts", {
    name: "TeachAssist Alerts",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: ACCENT_COLOR,
  });
};

const getRouteFromData = (data: unknown) => {
  if (!data || typeof data !== "object") return null;
  const typed = data as { route?: unknown; deepLink?: unknown };
  const value =
    typeof typed.route === "string"
      ? typed.route
      : typeof typed.deepLink === "string"
        ? typed.deepLink
        : null;
  if (!value) return null;

  const schemePrefix = `${APP_SCHEME}://`;
  if (value.startsWith(schemePrefix)) {
    return buildRoutePath(value.slice(schemePrefix.length));
  }
  return buildRoutePath(value);
};

const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
  const responseId = response.notification.request.identifier;
  if (responseId && responseId === lastHandledResponseId) return;
  if (responseId) {
    lastHandledResponseId = responseId;
  }

  const route = getRouteFromData(
    response.notification.request.content.data
  );
  if (!route) return;

  try {
    router.push(route as any);
  } catch (error) {
    console.warn("notifications: failed to navigate", error);
  }
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

const syncSessionFromHtml = async (html: string) => {
  const studentId = extractStudentIdFromHtml(html);
  const sessionToken = extractSessionTokenFromHtml(html);
  let updated = false;

  if (studentId) {
    await saveSecureItem("ta_student_id", studentId);
    updated = true;
  }
  if (sessionToken) {
    await saveSecureItem("ta_session_token", sessionToken);
    updated = true;
  }

  if (studentId && sessionToken) {
    const currentCookies = parseCookieHeader(await loadSecureItem("ta_cookies"));
    if (
      currentCookies.student_id !== studentId ||
      currentCookies.session_token !== sessionToken
    ) {
      const merged = {
        ...currentCookies,
        student_id: studentId,
        session_token: sessionToken,
      };
      const mergedHeader = Object.entries(merged)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
      if (mergedHeader.length > 0) {
        await saveSecureItem("ta_cookies", mergedHeader);
      }
    }
  }

  return { studentId, sessionToken, updated };
};

const buildCookieHeader = async (): Promise<string | null> => {
  const storedCookies = await loadSecureItem("ta_cookies");
  if (storedCookies && storedCookies.length > 0) {
    return storedCookies;
  }

  const studentId = await loadSecureItem("ta_student_id");
  const sessionToken = await loadSecureItem("ta_session_token");
  if (!sessionToken) return null;
  const cookieParts = [`session_token=${sessionToken}`];
  if (studentId) cookieParts.push(`student_id=${studentId}`);
  return cookieParts.join("; ");
};

const syncCookiesFromResponse = async (response: Response) => {
  const setCookie = response.headers?.get?.("set-cookie");
  if (!setCookie) return;

  const current = parseCookieHeader(await loadSecureItem("ta_cookies"));
  const updates = parseSetCookieHeader(setCookie);
  const merged = { ...current, ...updates };
  const mergedHeader = Object.entries(merged)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  if (mergedHeader.length > 0) {
    await saveSecureItem("ta_cookies", mergedHeader);
  }

  if (merged.student_id) {
    await saveSecureItem("ta_student_id", merged.student_id);
  }
  if (merged.session_token) {
    await saveSecureItem("ta_session_token", merged.session_token);
  }
};

const fetchWithCookies = async (url: string, init: RequestInit = {}) => {
  const cookieHeader = await buildCookieHeader();
  const headers = new Headers(init.headers ?? {});
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  await syncCookiesFromResponse(response);
  return response;
};

// Best-effort homepage fetch; reauths if cookies expired using saved credentials.
const loginWithSavedCreds = async () => {
  const savedUsername = await loadSecureItem("ta_username");
  const savedPassword = await loadSecureItem("ta_password");
  if (!savedUsername || !savedPassword) {
    return { ok: false, html: null as string | null, sessionRecovered: false };
  }

  const encodedUsername = encodeURIComponent(savedUsername);
  const encodedPassword = encodeURIComponent(savedPassword);
  const loginUrl = `https://ta.yrdsb.ca/live/index.php?subject_id=0&username=${encodedUsername}&password=${encodedPassword}&submit=Login`;

  const response = await fetchWithCookies(loginUrl);
  if (!response.ok) {
    return { ok: false, html: null as string | null, sessionRecovered: false };
  }

  const html = await response.text();
  const lowerHtml = html.toLowerCase();
  if (lowerHtml.includes("log in")) {
    return { ok: false, html, sessionRecovered: false };
  }

  const session = await syncSessionFromHtml(html);
  const schoolId = html.match(/school_id=(\d+)/)?.[1] ?? null;
  if (schoolId) {
    await saveSecureItem("school_id", schoolId);
  }

  return {
    ok: lowerHtml.includes("student reports"),
    html,
    sessionRecovered: session.updated,
  };
};

const fetchHomepageHtml = async (
  cookieHeaderOverride?: string | null
): Promise<HomepageFetchResult> => {
  const cookieHeader = cookieHeaderOverride ?? (await buildCookieHeader());
  let loginAttempted = false;
  let loginSucceeded = false;
  let sessionRecovered = false;

  const fetchHomepage = async () => {
    const response = await fetchWithCookies(
      "https://ta.yrdsb.ca/live/index.php?subject_id=0"
    );
    if (!response.ok) return null;
    return response.text();
  };

  if (!cookieHeader) {
    loginAttempted = true;
    const loginResult = await loginWithSavedCreds();
    loginSucceeded = loginResult.ok;
    sessionRecovered = loginResult.sessionRecovered;
    if (!loginResult.ok) {
      return { html: null, loginAttempted, loginSucceeded, sessionRecovered };
    }

    const html =
      loginResult.html &&
      loginResult.html.toLowerCase().includes("student reports")
        ? loginResult.html
        : await fetchHomepage();
    return { html, loginAttempted, loginSucceeded, sessionRecovered };
  }

  const html = await fetchHomepage();
  if (!html) {
    return { html: null, loginAttempted, loginSucceeded, sessionRecovered };
  }

  if (html.toLowerCase().includes("log in")) {
    loginAttempted = true;
    const loginResult = await loginWithSavedCreds();
    loginSucceeded = loginResult.ok;
    sessionRecovered = loginResult.sessionRecovered;
    if (!loginResult.ok) {
      return { html, loginAttempted, loginSucceeded, sessionRecovered };
    }

    const retryHtml =
      loginResult.html &&
      loginResult.html.toLowerCase().includes("student reports")
        ? loginResult.html
        : await fetchHomepage();
    return { html: retryHtml, loginAttempted, loginSucceeded, sessionRecovered };
  }

  return { html, loginAttempted, loginSucceeded, sessionRecovered };
};

const buildCourseReportUrl = async (subjectId: string): Promise<string | null> => {
  const savedStudentId = await loadSecureItem("ta_student_id");
  const savedSchoolId = await loadSecureItem("school_id");
  if (!savedStudentId || !savedSchoolId) return null;
  return `https://ta.yrdsb.ca/live/students/viewReport.php?subject_id=${subjectId}&student_id=${savedStudentId}&school_id=${savedSchoolId}`;
};

const calculateAssignmentScore = (categories: any): number | null => {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  Object.values(categories).forEach((value: any) => {
    if (value && value.weight && value.percentage) {
      const percentage = parseFloat(value.percentage.replace("%", ""));
      const weight = parseFloat(value.weight);
      if (!isNaN(percentage) && !isNaN(weight) && weight > 0) {
        totalWeightedScore += percentage * weight;
        totalWeight += weight;
      }
    }
  });

  if (totalWeight === 0) {
    const percentages = Object.values(categories)
      .filter((cat: any) => cat && cat.percentage)
      .map((cat: any) => parseFloat(cat.percentage.replace("%", "")))
      .filter((value: number) => !isNaN(value));

    if (percentages.length === 0) return null;
    const sum = percentages.reduce((a, b) => a + b, 0);
    return Math.round((sum / percentages.length) * 10) / 10;
  }

  return Math.round((totalWeightedScore / totalWeight) * 10) / 10;
};

const findAssignmentDelta = (newAssignments: any[], oldAssignments: any[]) => {
  const oldByName = new Map<string, any>();
  oldAssignments.forEach((assignment) => {
    if (assignment?.name) {
      oldByName.set(assignment.name, assignment);
    }
  });

  for (const assignment of newAssignments) {
    const prior = oldByName.get(assignment.name);
    const newScore = calculateAssignmentScore(assignment.categories);
    const oldScore = prior ? calculateAssignmentScore(prior.categories) : null;

    if (!prior) {
      return { assignment, score: newScore };
    }

    if (
      newScore !== null &&
      oldScore !== null &&
      Math.abs(newScore - oldScore) >= 0.1
    ) {
      return { assignment, score: newScore };
    }
  }

  return null;
};

const findMatchingCourse = (course: Course, cached: Course[]) => {
  if (course.subjectId) {
    const byId = cached.find((item) => item.subjectId === course.subjectId);
    if (byId) return byId;
  }
  const exact = cached.find(
    (item) =>
      item.courseCode === course.courseCode && item.semester === course.semester
  );
  if (exact) return exact;

  if (course.semester === 0) {
    return cached.find((item) => item.courseCode === course.courseCode);
  }

  return cached.find(
    (item) => item.courseCode === course.courseCode && item.semester === 0
  );
};

const notifyHiddenMark = async (course: Course) => {
  await setNotificationChannel();
  const route = buildRoutePath("courses");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${course.courseName} marks have been hidden`,
      body: "Your teacher has temporarily hidden this course's marks.",
      data: {
        source: "ta_marks_hidden",
        courseCode: course.courseCode,
        route,
      },
      color: ACCENT_COLOR,
    },
    trigger: { channelId: "ta-alerts" },
  });
};

const notifyNoChanges = async () => {
  await setNotificationChannel();
  const route = buildRoutePath("courses");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "No grade changes found",
      body: "TeachAssist checked for updates and nothing changed.",
      data: {
        source: "ta_no_changes",
        route,
      },
      color: ACCENT_COLOR,
    },
    trigger: { channelId: "ta-alerts" },
  });
};

  const formatServiceRunSummary = (details?: ServiceRunDebug) => {
    if (!details) return "";
    const parts: string[] = [];
    const flag = (label: string, value?: boolean) => {
      if (value === undefined) return;
    parts.push(`${label}=${value ? 1 : 0}`);
  };
  const count = (label: string, value?: number) => {
    if (value === undefined) return;
    parts.push(`${label}=${value}`);
  };

  flag("marks", details.markChangeEnabled);
  flag("noChg", details.notifyWhenNoChanges);
  flag("hidden", details.notifyWhenMarksHidden);
  flag("check", details.shouldCheckMarks);
  flag("cookie", details.hasCookie);
  flag("loginTry", details.loginAttempted);
  flag("loginOk", details.loginSucceeded);
  flag("sess", details.sessionRecovered);
  flag("home", details.homepageOk);
  flag("login", details.homepageLoginRequired);
  count("fresh", details.parsedCourses);
  count("cached", details.cachedCourses);
  flag("updates", details.hasUpdates);
  flag("sentNoChg", details.sentNoChanges);
  flag("test", details.marksTest);
  if (details.reason) {
    parts.push(`reason=${details.reason}`);
  }
  if (details.taskStatus !== undefined) {
    parts.push(`status=${details.taskStatus}`);
  }
  if (details.error) {
    parts.push(`error=${details.error}`);
  }

  return parts.join(" ");
};

const notifyServiceRun = async (
  service: string,
  details?: ServiceRunDebug
) => {
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== "granted") return;

  await setNotificationChannel();
  const timestamp = new Date().toISOString();
  const summary = formatServiceRunSummary(details);
  const body = summary
    ? `${service} ran at ${timestamp} UTC.\n${summary}`
    : `${service} ran at ${timestamp} UTC.`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Notification service ran",
      body,
      data: {
        source: "ta_service_run",
        service,
        timestamp,
        debug: details ?? null,
      },
      color: ACCENT_COLOR,
    },
    trigger: { channelId: "ta-alerts" },
  });
};

const notifyCourseChange = async (
  course: Course,
  assignmentName: string | null,
  assignmentScore: number | null,
  settings: NotificationSettings
) => {
  await setNotificationChannel();
  const showMarks = !settings.hideMarksInNotifications;
  const courseMark = course.grade ? `${course.grade}%` : "Updated";
  const route = course.subjectId
    ? buildRoutePath(`courseview/${course.subjectId}`)
    : buildRoutePath("courses");

  let body = `Course average updated.`;
  if (assignmentName && showMarks && assignmentScore !== null) {
    body = `${assignmentName}: ${assignmentScore.toFixed(1)}% | Course: ${courseMark}`;
  } else if (assignmentName && !showMarks) {
    body = `${assignmentName} has been marked.`;
  } else if (showMarks) {
    body = `Course average is now ${courseMark}.`;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${course.courseName} Mark Update`,
      body,
      data: {
        source: "ta_marks_change",
        courseCode: course.courseCode,
        subjectId: course.subjectId ?? null,
        route,
      },
      color: ACCENT_COLOR,
      
    },
    trigger: { channelId: "ta-alerts"},
    
  });
};

TaskManager.defineTask(MARKS_TASK, async () => {
  console.log("notifications: background task started");
  await initializeNotifications();
  const debug: ServiceRunDebug = {};
  let didSendServiceRun = false;
  const sendServiceRun = async (reason: string) => {
    if (didSendServiceRun) return;
    debug.reason = reason;
    console.log("notifications: service run debug", debug);
    try {
      // await notifyServiceRun("Marks background task", debug);
    } catch (error) {
      console.warn("notifications: failed to send service run", error);
    }
    didSendServiceRun = true;
  };
  try {
    debug.taskStatus = await BackgroundTask.getStatusAsync();
  } catch (error) {
    console.warn("notifications: failed to read background status", error);
  }
  try {
    const settings = await loadNotificationSettings();
    const shouldCheckMarks =
      settings.markChangeEnabled || settings.notifyWhenNoChanges;
    debug.markChangeEnabled = settings.markChangeEnabled;
    debug.notifyWhenNoChanges = settings.notifyWhenNoChanges;
    debug.notifyWhenMarksHidden = settings.notifyWhenMarksHidden;
    debug.shouldCheckMarks = shouldCheckMarks;
    console.log("notifications: background settings", {
      markChangeEnabled: settings.markChangeEnabled,
      guidanceRemindersEnabled: settings.guidanceRemindersEnabled,
      hideMarksInNotifications: settings.hideMarksInNotifications,
      notifyWhenMarksHidden: settings.notifyWhenMarksHidden,
      notifyWhenNoChanges: settings.notifyWhenNoChanges,
      shouldCheckMarks,
    });
    if (!shouldCheckMarks) {
      console.log("notifications: mark change notifications disabled");
      await sendServiceRun("disabled");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const marksTestFlag = await AsyncStorage.getItem(NOTIF_KEYS.marksTest);
    debug.marksTest = marksTestFlag === "true";
    if (marksTestFlag === "true") {
      console.log("notifications: running marks test");
      const testCourse = await getTestCourse();
      await notifyCourseChange(testCourse, "Test Assignment", 95.5, settings);
      await notifyHiddenMark(testCourse);
      await AsyncStorage.removeItem(NOTIF_KEYS.marksTest);
      await sendServiceRun("marks_test");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const cookieHeader = await buildCookieHeader();
    debug.hasCookie = Boolean(cookieHeader);
    const homepageResult = await fetchHomepageHtml(cookieHeader);
    const html = homepageResult.html;
    debug.loginAttempted = homepageResult.loginAttempted;
    debug.loginSucceeded = homepageResult.loginSucceeded;
    debug.sessionRecovered = homepageResult.sessionRecovered;
    debug.homepageOk = Boolean(html);
    debug.homepageLoginRequired = Boolean(
      html && html.toLowerCase().includes("log in")
    );
    if (!html || html.toLowerCase().includes("log in")) {
      console.warn("notifications: homepage fetch failed or requires login");
      if (homepageResult.loginAttempted && !homepageResult.loginSucceeded) {
        debug.reason = "login_failed";
      } else if (!cookieHeader) {
        debug.reason = "no_cookie";
      } else if (debug.homepageLoginRequired) {
        debug.reason = "login_required";
      } else {
        debug.reason = "homepage_fetch_failed";
      }
      await sendServiceRun(debug.reason);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    const freshCourses: Course[] = JSON.parse(parseStudentGrades(html));
    debug.parsedCourses = freshCourses.length;
    const cachedCoursesJson = await loadSecureItem("ta_courses");
    const cachedCourses: Course[] = cachedCoursesJson
      ? JSON.parse(cachedCoursesJson)
      : [];
    debug.cachedCourses = cachedCourses.length;

    const mergedCourses = mergeCoursesWithCache(freshCourses, cachedCourses);
    await saveSecureItem("ta_courses", JSON.stringify(mergedCourses));

    let hasUpdates = false;

    for (const course of freshCourses) {
      const cachedCourse = findMatchingCourse(course, cachedCourses);
      if (!cachedCourse) continue;

      const hiddenUpdate =
        !hasVisibleGradeForNotifications(course) &&
        hasVisibleGradeForNotifications(cachedCourse);
      if (hiddenUpdate) {
        hasUpdates = true;
        if (settings.markChangeEnabled && settings.notifyWhenMarksHidden) {
          await notifyHiddenMark(course);
        }
        continue;
      }

      const freshVisible = hasVisibleGradeForNotifications(course);
      const cachedVisible = hasVisibleGradeForNotifications(cachedCourse);
      const freshNumeric = parseFloat(course.grade);
      const cachedNumeric = parseFloat(cachedCourse.grade);
      const hasGradeChange =
        freshVisible &&
        cachedVisible &&
        !isNaN(freshNumeric) &&
        !isNaN(cachedNumeric) &&
        Math.abs(freshNumeric - cachedNumeric) >= 0.1;

      if (!hasGradeChange) continue;
      hasUpdates = true;
      if (!settings.markChangeEnabled) continue;

      const reportUrl =
        course.reportUrl
          ? resolveReportUrl(course.reportUrl.replace(/&amp;/g, "&"))
          : course.subjectId
            ? await buildCourseReportUrl(course.subjectId)
            : null;

      if (!reportUrl) {
        await notifyCourseChange(course, null, null, settings);
        continue;
      }

      const cookieHeader = await buildCookieHeader();
      if (!cookieHeader) continue;

      const reportResponse = await fetchWithCookies(reportUrl);

      if (!reportResponse.ok) {
        await notifyCourseChange(course, null, null, settings);
        continue;
      }

      const reportHtml = await reportResponse.text();
      const newParsed = parseGradeData(reportHtml);
      if (!newParsed.success) {
        await notifyCourseChange(course, null, null, settings);
        continue;
      }

      const cachedHtml = course.subjectId
        ? await loadSecureItem(`course_${course.subjectId}`)
        : null;
      const cachedParsed = cachedHtml ? parseGradeData(cachedHtml) : null;

      const delta = cachedParsed?.success
        ? findAssignmentDelta(newParsed.assignments, cachedParsed.assignments)
        : findAssignmentDelta(newParsed.assignments, []);

      if (course.subjectId) {
        await saveSecureItem(`course_${course.subjectId}`, reportHtml);
      }

      await notifyCourseChange(
        course,
        delta?.assignment?.name ?? null,
        delta?.score ?? null,
        settings
      );
    }

    debug.hasUpdates = hasUpdates;
    if (!hasUpdates && settings.notifyWhenNoChanges) {
      await notifyNoChanges();
      debug.sentNoChanges = true;
    }

    await sendServiceRun("done");
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("notifications: background task failed", error);
    debug.error = error instanceof Error ? error.message : "unknown_error";
    await sendServiceRun("error");
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const syncBackgroundTasks = async (
  settings?: NotificationSettings
) => {
  const currentSettings = settings ?? (await loadNotificationSettings());
  const shouldRunMarksTask =
    currentSettings.markChangeEnabled || currentSettings.notifyWhenNoChanges;
  const status = await BackgroundTask.getStatusAsync();
  console.log("notifications: background status", {
    status,
    markChangeEnabled: currentSettings.markChangeEnabled,
    notifyWhenNoChanges: currentSettings.notifyWhenNoChanges,
    shouldRunMarksTask,
  });
  if (
    status !== BackgroundTask.BackgroundTaskStatus.Available &&
    shouldRunMarksTask
  ) {
    console.warn("notifications: background tasks unavailable");
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(MARKS_TASK);
  console.log("notifications: background task registration", { isRegistered });

  if (shouldRunMarksTask && !isRegistered) {
    console.log("notifications: registering background task");
    await BackgroundTask.registerTaskAsync(MARKS_TASK, {
      minimumInterval: 15,
    });
  } else if (!shouldRunMarksTask && isRegistered) {
    console.log("notifications: unregistering background task");
    await BackgroundTask.unregisterTaskAsync(MARKS_TASK);
  }
};

export const scheduleGuidanceReminders = async () => {
  const settings = await loadNotificationSettings();
  if (!settings.guidanceRemindersEnabled) return;

  const appointmentsJson = await loadSecureItem("ta_appointments");
  if (!appointmentsJson) return;

  let appointments: AppointmentData[] = [];
  try {
    appointments = JSON.parse(appointmentsJson);
  } catch {
    return;
  }

  const now = new Date();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content?.data?.source === "ta_guidance")
      .map((item) =>
        Notifications.cancelScheduledNotificationAsync(item.identifier)
      )
  );

  await Promise.all(
    appointments.map(async (appointment) => {
      const appointmentDate = new Date(
        `${appointment.date}T${appointment.time}`
      );

      const appointmentTime = appointmentDate.getTime();
      if (Number.isNaN(appointmentTime) || appointmentTime <= now.getTime()) {
        return;
      }

      await setNotificationChannel();
      const teacherName = formatTeacherName(appointment.teacher);
      const subject = appointment.subject?.trim() ?? "";
      const details =
        teacherName && subject
          ? ` with ${teacherName} about ${subject}`
          : teacherName
            ? ` with ${teacherName}`
            : subject
              ? ` about ${subject}`
              : "";
      const route = buildRoutePath("AppointmentsPage");
      const offsets = [
        { minutes: 30, label: "30 minutes" },
        { minutes: 5, label: "5 minutes" },
      ];

      await Promise.all(
        offsets.map(async ({ minutes, label }) => {
          const reminderTime = new Date(
            appointmentTime - minutes * 60 * 1000
          );
          if (reminderTime <= now) return;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Guidance Appointment Reminder",
              body: `You have a guidance appointment in ${label}${details}.`,
              data: {
                source: "ta_guidance",
                appointmentId: appointment.id,
                route,
              },
              color: ACCENT_COLOR,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: reminderTime,
              channelId: "ta-alerts",
            },
          });
        })
      );
    })
  );
};

export const clearGuidanceReminders = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content?.data?.source === "ta_guidance")
      .map((item) =>
        Notifications.cancelScheduledNotificationAsync(item.identifier)
      )
  );
};

export const scheduleTestGuidanceReminder = async () => {
  const granted = await ensureNotificationPermissions();
  if (!granted) return false;

  await setNotificationChannel();
  const route = buildRoutePath("AppointmentsPage");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Guidance Appointment Reminder",
      body: "Test reminder triggered.",
      data: { source: "ta_guidance_test", route },
      color: ACCENT_COLOR,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
      channelId: "ta-alerts",
    },
  });

  return true;
};

export const triggerMarksTest = async () => {
  const granted = await ensureNotificationPermissions();
  if (!granted) return false;

  await setNotificationChannel();
  const settings = await loadNotificationSettings();
  const testCourse = await getTestCourse();
  await notifyCourseChange(testCourse, "Test Assignment", 95.5, settings);
  await notifyHiddenMark(testCourse);
  return true;
};

export const initializeNotifications = async () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  await setNotificationChannel();

  if (!responseListener) {
    responseListener = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse) {
      handleNotificationResponse(lastResponse);
    }
  }

  const settings = await loadNotificationSettings();
  await syncBackgroundTasks(settings);

  if (settings.guidanceRemindersEnabled) {
    await scheduleGuidanceReminders();
  }
};
