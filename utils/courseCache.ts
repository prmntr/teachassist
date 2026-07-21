import type { Course } from "@/utils/CourseParser";
import {
  buildTeachAssistLiveUrl,
  buildTeachAssistStudentsUrl,
} from "./serverConfig";

const buildCourseKey = (course: Course): string => {
  if (course.subjectId) {
    return `id:${course.subjectId}`;
  }
  return `code:${course.courseCode}-sem:${course.semester}`;
};

const buildCourseCodeKey = (course: Course): string =>
  `code:${course.courseCode}-sem:${course.semester}`;

const hasVisibleGrade = (course: Course): boolean => {
  if (!course.hasGrade) return false;
  if (course.grade && course.grade !== "See teacher") {
    const numeric = parseFloat(course.grade);
    if (!isNaN(numeric)) return true;
  }
  return Boolean(course.finalMark);
};

const getCurrentSchoolYearBounds = (from = new Date()) => {
  const schoolYearStartYear = from.getMonth() >= 8 ? from.getFullYear() : from.getFullYear() - 1;
  return {
    start: new Date(schoolYearStartYear, 8, 4, 0, 0, 0, 0),
    end: new Date(schoolYearStartYear + 1, 7, 31, 23, 59, 59, 999),
  };
};

const isCourseInCurrentSchoolYear = (course: Course, from = new Date()) => {
  if (!course.endDate) return true;
  const endDate = new Date(`${course.endDate}T23:59:59`);
  if (Number.isNaN(endDate.getTime())) return true;
  const bounds = getCurrentSchoolYearBounds(from);
  return endDate >= bounds.start && endDate <= bounds.end;
};

const findCachedMatch = (
  freshCourse: Course,
  cachedById: Map<string, Course>,
  cachedByCode: Map<string, Course>,
  cachedByCourseCode: Map<string, Course>
): Course | undefined => {
  if (freshCourse.subjectId) {
    const byId = cachedById.get(buildCourseKey(freshCourse));
    if (byId) return byId;
  }
  const byCode = cachedByCode.get(buildCourseCodeKey(freshCourse));
  if (byCode) return byCode;

  if (freshCourse.semester === 0) {
    return cachedByCourseCode.get(freshCourse.courseCode);
  }

  const loose = cachedByCourseCode.get(freshCourse.courseCode);
  if (loose?.semester === 0) {
    return loose;
  }

  return undefined;
};

export const mergeCoursesWithCache = (
  freshCourses: Course[],
  cachedCourses: Course[]
): Course[] => {
  const eligibleCachedCourses = cachedCourses.filter((course) =>
    isCourseInCurrentSchoolYear(course),
  );
  const cachedById = new Map<string, Course>();
  const cachedByCode = new Map<string, Course>();
  const cachedByCourseCode = new Map<string, Course>();
  const freshIdKeys = new Set<string>();
  const freshCodeKeys = new Set<string>();
  const freshSchoolYearCodes = new Set<string>();

  eligibleCachedCourses.forEach((course) => {
    cachedByCode.set(buildCourseCodeKey(course), course);
    if (!cachedByCourseCode.has(course.courseCode) || course.semester === 0) {
      cachedByCourseCode.set(course.courseCode, course);
    }
    const key = buildCourseKey(course);
    if (course.subjectId) {
      cachedById.set(key, course);
    }
  });

  freshCourses.forEach((course) => {
    freshCodeKeys.add(buildCourseCodeKey(course));
    if (course.semester === 0) {
      freshSchoolYearCodes.add(course.courseCode);
    }
    if (course.subjectId) {
      freshIdKeys.add(buildCourseKey(course));
    }
  });

  const mergedFresh = freshCourses.map((freshCourse) => {
    const cachedCourse = findCachedMatch(
      freshCourse,
      cachedById,
      cachedByCode,
      cachedByCourseCode
    );
    if (!cachedCourse) {
      console.log(`[courseCache] ${freshCourse.courseCode} — no cache match | fresh subjectId=${freshCourse.subjectId} | fresh hasGrade=${freshCourse.hasGrade}`);
      return { ...freshCourse, isGradeStale: false };
    }

    const merged: Course = { ...freshCourse };

    // Preserve report links/IDs if TA temporarily hides them on refresh.
    if (!merged.subjectId && cachedCourse.subjectId) {
      console.log(`[courseCache] ${freshCourse.courseCode} — restoring subjectId ${cachedCourse.subjectId} from cache`);
      merged.subjectId = cachedCourse.subjectId;
    }
    if (!merged.reportUrl && cachedCourse.reportUrl) {
      merged.reportUrl = cachedCourse.reportUrl;
    }
    if (!merged.midtermMark && cachedCourse.midtermMark) {
      merged.midtermMark = cachedCourse.midtermMark;
    }
    if (!merged.finalMark && cachedCourse.finalMark) {
      merged.finalMark = cachedCourse.finalMark;
    }

    const freshHasGrade = hasVisibleGrade(freshCourse);
    const cachedHasGrade = hasVisibleGrade(cachedCourse);
    console.log(`[courseCache] ${freshCourse.courseCode} — freshHasGrade=${freshHasGrade} cachedHasGrade=${cachedHasGrade} | fresh subjectId=${freshCourse.subjectId} cached subjectId=${cachedCourse.subjectId}`);

    if (!freshHasGrade && cachedHasGrade) {
      merged.grade = cachedCourse.grade;
      merged.hasGrade = true;
      merged.isGradeStale = true;
      return merged;
    }

    merged.isGradeStale = false;
    return merged;
  });

  const staleCached = eligibleCachedCourses
    .filter((cachedCourse) => {
      const idKey = cachedCourse.subjectId
        ? buildCourseKey(cachedCourse)
        : null;
      if (idKey && freshIdKeys.has(idKey)) return false;
      if (freshSchoolYearCodes.has(cachedCourse.courseCode)) {
        return false;
      }
      return !freshCodeKeys.has(buildCourseCodeKey(cachedCourse));
    })
    .map((cachedCourse) => ({
      ...cachedCourse,
      isGradeStale: true,
    }));

  return [...mergedFresh, ...staleCached];
};

export const resolveReportUrl = async (reportUrl: string): Promise<string> => {
  if (!reportUrl) return reportUrl;
  if (reportUrl.startsWith("http")) {
    return reportUrl;
  }
  const normalized = reportUrl.replace(/^\.?\//, "").replace(/^\.\.\//, "");

  if (normalized.startsWith("live/")) {
    return buildTeachAssistLiveUrl(normalized.replace(/^live\//, ""));
  }

  if (normalized.startsWith("students/")) {
    return buildTeachAssistLiveUrl(normalized);
  }

  if (
    normalized.startsWith("viewReport.php") ||
    normalized.startsWith("viewReportOE.php") ||
    normalized.startsWith("grades.php") ||
    normalized.startsWith("listReports.php")
  ) {
    return buildTeachAssistStudentsUrl(normalized);
  }

  return buildTeachAssistLiveUrl(normalized);
};

export const hasVisibleGradeForNotifications = hasVisibleGrade;
