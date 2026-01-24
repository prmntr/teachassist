import type { Course } from "../(components)/CourseParser";

const buildCourseKey = (course: Course): string => {
  if (course.subjectId) {
    return `id:${course.subjectId}`;
  }
  return `code:${course.courseCode}-sem:${course.semester}`;
};

const buildCourseCodeKey = (course: Course): string =>
  `code:${course.courseCode}-sem:${course.semester}`;

const hasVisibleGrade = (course: Course): boolean => {
  if (course.grade && course.grade !== "See teacher") return true;
  return Boolean(course.finalMark);
};

const findCachedMatch = (
  freshCourse: Course,
  cachedById: Map<string, Course>,
  cachedByCode: Map<string, Course>
): Course | undefined => {
  if (freshCourse.subjectId) {
    const byId = cachedById.get(buildCourseKey(freshCourse));
    if (byId) return byId;
  }
  return cachedByCode.get(buildCourseCodeKey(freshCourse));
};

export const mergeCoursesWithCache = (
  freshCourses: Course[],
  cachedCourses: Course[]
): Course[] => {
  const cachedById = new Map<string, Course>();
  const cachedByCode = new Map<string, Course>();

  cachedCourses.forEach((course) => {
    cachedByCode.set(buildCourseCodeKey(course), course);
    const key = buildCourseKey(course);
    if (course.subjectId) {
      cachedById.set(key, course);
    }
  });

  return freshCourses.map((freshCourse) => {
    const cachedCourse = findCachedMatch(
      freshCourse,
      cachedById,
      cachedByCode
    );
    if (!cachedCourse) {
      return { ...freshCourse, isGradeStale: false };
    }

    const merged: Course = { ...freshCourse };

    // Preserve report links/IDs if TA temporarily hides them on refresh.
    if (!merged.subjectId && cachedCourse.subjectId) {
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

    if (!freshHasGrade && cachedHasGrade) {
      merged.grade = cachedCourse.grade;
      merged.hasGrade = true;
      merged.isGradeStale = true;
      return merged;
    }

    merged.isGradeStale = false;
    return merged;
  });
};

export const resolveReportUrl = (reportUrl: string): string => {
  if (!reportUrl) return reportUrl;
  if (reportUrl.startsWith("http")) {
    return reportUrl;
  }
  const normalized = reportUrl.replace(/^\.?\//, "").replace(/^\.\.\//, "");

  if (normalized.startsWith("live/")) {
    return new URL(normalized.replace(/^live\//, ""), "https://ta.yrdsb.ca/live/").toString();
  }

  if (normalized.startsWith("students/")) {
    return new URL(normalized, "https://ta.yrdsb.ca/live/").toString();
  }

  if (
    normalized.startsWith("viewReport.php") ||
    normalized.startsWith("grades.php") ||
    normalized.startsWith("listReports.php")
  ) {
    return new URL(normalized, "https://ta.yrdsb.ca/live/students/").toString();
  }

  return new URL(normalized, "https://ta.yrdsb.ca/live/").toString();
};

export const hasVisibleGradeForNotifications = hasVisibleGrade;
