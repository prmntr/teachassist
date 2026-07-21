import AsyncStorage from "@react-native-async-storage/async-storage";
import { SecureStorage } from "@/app/(auth)/taauth";
import {
  type ParsedCourseData,
} from "@/utils/GradeParser";
import { loadParsedCourseReport } from "./courseReportCache";
import { SUMMER_SEMESTER, type Course } from "@/utils/CourseParser";

const GRADE_HISTORY_KEY = "grade_history_v1";
const MAX_HISTORY_SNAPSHOTS = 40;

export type GradeHistorySource =
  | "cache"
  | "refresh"
  | "startup"
  | "background";

export interface GradeHistoryCourse {
  key: string;
  courseCode: string;
  courseName: string;
  semester: number;
  subjectId?: string;
  room: string;
  block: string;
  grade: string | null;
  numericGrade: number | null;
  hasVisibleGrade: boolean;
  isGradeStale?: boolean;
  assignments?: GradeHistoryAssignment[];
}

export interface GradeHistorySnapshot {
  id: string;
  capturedAt: string;
  source: GradeHistorySource;
  average: number | null;
  courseCount: number;
  courses: GradeHistoryCourse[];
}

export interface GradeHistoryAssignment {
  key: string;
  name: string;
  grade: string | null;
  numericGrade: number | null;
  formative?: boolean;
}

export interface GradeHistoryChange {
  type:
    | "average-changed"
    | "assignment-added"
    | "assignment-changed"
    | "assignment-removed"
    | "grade-changed"
    | "grade-posted"
    | "grade-hidden"
    | "course-added"
    | "course-removed";
  courseKey?: string;
  courseCode?: string;
  courseName: string;
  previousGrade: string | null;
  currentGrade: string | null;
  delta: number | null;
  summary: string;
  assignmentName?: string;
}

export interface DetailedCourseReport {
  course: Course;
  parsedReport: ParsedCourseData | null;
  hasCachedReport: boolean;
}

export const buildGradeCourseKey = (
  course: Pick<Course, "subjectId" | "courseCode" | "semester">,
) => {
  if (course.subjectId) {
    return `id:${course.subjectId}`;
  }
  return `code:${course.courseCode}-sem:${course.semester}`;
};

const parseNumericGrade = (value?: string | null) => {
  if (!value || value === "See teacher") return null;
  const numeric = parseFloat(value.replace("%", ""));
  if (!Number.isFinite(numeric)) return null;
  return numeric;
};

const formatGradeLabel = (numericGrade: number | null) =>
  numericGrade === null ? null : `${numericGrade.toFixed(1).replace(/\.0$/, "")}%`;

const hasVisibleGrade = (course: Course) => parseNumericGrade(course.grade) !== null;

const calculateAssignmentScore = (
  categories: ParsedCourseData["assignments"][number]["categories"],
) => {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  Object.values(categories).forEach((value) => {
    if (!value?.percentage) return;
    const percentage = parseFloat(value.percentage.replace("%", ""));
    const weight = parseFloat(value.weight ?? "0");
    if (Number.isFinite(percentage) && Number.isFinite(weight) && weight > 0) {
      totalWeightedScore += percentage * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight > 0) {
    return Math.round((totalWeightedScore / totalWeight) * 10) / 10;
  }

  const percentages = Object.values(categories)
    .map((category) =>
      category?.percentage
        ? parseFloat(category.percentage.replace("%", ""))
        : Number.NaN,
    )
    .filter(Number.isFinite);

  if (percentages.length === 0) return null;
  return (
    Math.round(
      (percentages.reduce((sum, value) => sum + value, 0) /
        percentages.length) *
        10,
    ) / 10
  );
};

const buildAssignmentKey = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

const toHistoryAssignments = (
  parsedReport: ParsedCourseData | null,
): GradeHistoryAssignment[] | undefined => {
  if (!parsedReport?.success || parsedReport.assignments.length === 0) {
    return undefined;
  }

  return parsedReport.assignments.map((assignment) => {
    const numericGrade = calculateAssignmentScore(assignment.categories);
    return {
      key: buildAssignmentKey(assignment.name),
      name: assignment.name,
      grade: formatGradeLabel(numericGrade),
      numericGrade,
      formative: assignment.formative,
    };
  });
};

const isDateWithinRange = (date: Date, start?: string, end?: string) => {
  if (!start || !end) return false;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false;
  }
  return date >= startDate && date <= endDate;
};

export const getActiveSemester = (courses: Course[]): number => {
  const now = new Date();
  const activeCourse = courses.find((course) =>
    isDateWithinRange(now, course.startDate, course.endDate),
  );
  if (
    activeCourse?.semester === 1 ||
    activeCourse?.semester === 2 ||
    activeCourse?.semester === SUMMER_SEMESTER
  ) {
    return activeCourse.semester;
  }

  const year = now.getFullYear();
  const month = now.getMonth();
  const schoolYearStart = month >= 7 ? year : year - 1;
  const bufferMs = 5 * 24 * 60 * 60 * 1000;
  const sem2Start = new Date(schoolYearStart + 1, 1, 1);
  const sem2End = new Date(schoolYearStart + 1, 5, 30, 23, 59, 59, 999);

  // July–August: summer school is the active term.
  if (month >= 6 && month <= 7) {
    return SUMMER_SEMESTER;
  }
  if (
    now.getTime() >= sem2Start.getTime() - bufferMs &&
    now.getTime() <= sem2End.getTime() + bufferMs
  ) {
    return 2;
  }

  return 1;
};

export const getScopedCourses = (courses: Course[]) => {
  const hasSemesterCourses = courses.some(
    (course) =>
      course.semester === 1 ||
      course.semester === 2 ||
      course.semester === SUMMER_SEMESTER,
  );
  const hasSchoolYearCourses = courses.some((course) => course.semester === 0);
  if (hasSchoolYearCourses && !hasSemesterCourses) {
    return courses;
  }
  const activeSemester = getActiveSemester(courses);
  const scoped = courses.filter((course) => course.semester === activeSemester);
  if (scoped.length > 0) return scoped;

  // The active term has no courses for this student (e.g. summer break with no
  // summer school) — fall back to the most recent term they actually have.
  const termsNewestFirst = [SUMMER_SEMESTER, 2, 1, 0];
  for (const term of termsNewestFirst) {
    const inTerm = courses.filter((course) => course.semester === term);
    if (inTerm.length > 0) return inTerm;
  }
  return courses;
};

export const calculateGradeAverage = (courses: Course[]) => {
  const scopedCourses = getScopedCourses(courses);
  const gradedCourses = scopedCourses.filter((course) => hasVisibleGrade(course));
  if (gradedCourses.length === 0) return null;

  const total = gradedCourses.reduce((sum, course) => {
    return sum + (parseNumericGrade(course.grade) ?? 0);
  }, 0);

  return Math.round((total / gradedCourses.length) * 10) / 10;
};

const toHistoryCourse = (
  course: Course,
  parsedReport: ParsedCourseData | null = null,
): GradeHistoryCourse => {
  const numericGrade = parseNumericGrade(course.grade);
  return {
    key: buildGradeCourseKey(course),
    courseCode: course.courseCode,
    courseName: course.courseName,
    semester: course.semester,
    subjectId: course.subjectId,
    room: course.room,
    block: course.block,
    grade: formatGradeLabel(numericGrade),
    numericGrade,
    hasVisibleGrade: numericGrade !== null,
    isGradeStale: course.isGradeStale,
    assignments: toHistoryAssignments(parsedReport),
  };
};

const sortHistoryCourses = (courses: GradeHistoryCourse[]) =>
  [...courses].sort((left, right) => {
    if (left.semester !== right.semester) {
      return left.semester - right.semester;
    }
    return left.courseCode.localeCompare(right.courseCode);
  });

const createSnapshotSignature = (snapshot: GradeHistorySnapshot) =>
  JSON.stringify({
    average: snapshot.average,
    courses: snapshot.courses.map((course) => ({
        key: course.key,
        grade: course.grade,
        numericGrade: course.numericGrade,
        hasVisibleGrade: course.hasVisibleGrade,
        assignments: course.assignments?.map((assignment) => ({
          key: assignment.key,
          grade: assignment.grade,
          numericGrade: assignment.numericGrade,
        })),
      })),
  });

const createSnapshot = async (
  courses: Course[],
  source: GradeHistorySource,
): Promise<GradeHistorySnapshot> => {
  const reportsBySubjectId = new Map<string, ParsedCourseData | null>();
  await Promise.all(
    courses.map(async (course) => {
      if (!course.subjectId) return;
      reportsBySubjectId.set(
        course.subjectId,
        await loadParsedCourseReport(course.subjectId),
      );
    }),
  );

  const historyCourses = sortHistoryCourses(
    courses.map((course) =>
      toHistoryCourse(
        course,
        course.subjectId ? reportsBySubjectId.get(course.subjectId) ?? null : null,
      ),
    ),
  );
  const visibleCourseCount = historyCourses.filter(
    (course) => course.hasVisibleGrade,
  ).length;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    capturedAt: new Date().toISOString(),
    source,
    average: calculateGradeAverage(courses),
    courseCount: visibleCourseCount,
    courses: historyCourses,
  };
};

export const loadGradeHistory = async (): Promise<GradeHistorySnapshot[]> => {
  const rawHistory = await AsyncStorage.getItem(GRADE_HISTORY_KEY);
  if (!rawHistory) return [];

  try {
    const parsed = JSON.parse(rawHistory);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const clearGradeHistory = async () => {
  await AsyncStorage.removeItem(GRADE_HISTORY_KEY);
};

export const compareGradeSnapshots = (
  previous: GradeHistorySnapshot | null,
  current: GradeHistorySnapshot,
): GradeHistoryChange[] => {
  if (!previous) return [];

  const changes: GradeHistoryChange[] = [];
  if (
    previous.average !== null &&
    current.average !== null &&
    Math.abs(previous.average - current.average) >= 0.1
  ) {
    const delta = Math.round((current.average - previous.average) * 10) / 10;
    changes.push({
      type: "average-changed",
      courseName: "Grade Average",
      previousGrade: `${previous.average.toFixed(1)}%`,
      currentGrade: `${current.average.toFixed(1)}%`,
      delta,
      summary: `Average ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta).toFixed(1)}%`,
    });
  }

  const previousMap = new Map(previous.courses.map((course) => [course.key, course]));
  const currentMap = new Map(current.courses.map((course) => [course.key, course]));

  current.courses.forEach((course) => {
    const prior = previousMap.get(course.key);
    if (!prior) {
      changes.push({
        type: "course-added",
        courseKey: course.key,
        courseCode: course.courseCode,
        courseName: course.courseName,
        previousGrade: null,
        currentGrade: course.grade,
        delta: course.numericGrade,
        summary: `${course.courseName} was added to your course list`,
      });
      return;
    }

    if (!prior.hasVisibleGrade && course.hasVisibleGrade) {
      changes.push({
        type: "grade-posted",
        courseKey: course.key,
        courseCode: course.courseCode,
        courseName: course.courseName,
        previousGrade: prior.grade,
        currentGrade: course.grade,
        delta: course.numericGrade,
        summary: `${course.courseName} posted a visible mark`,
      });
      return;
    }

    if (prior.hasVisibleGrade && !course.hasVisibleGrade) {
      changes.push({
        type: "grade-hidden",
        courseKey: course.key,
        courseCode: course.courseCode,
        courseName: course.courseName,
        previousGrade: prior.grade,
        currentGrade: course.grade,
        delta: null,
        summary: `${course.courseName} hid its mark`,
      });
      return;
    }

    if (
      prior.numericGrade !== null &&
      course.numericGrade !== null &&
      Math.abs(prior.numericGrade - course.numericGrade) >= 0.1
    ) {
      const delta =
        Math.round((course.numericGrade - prior.numericGrade) * 10) / 10;
      changes.push({
        type: "grade-changed",
        courseKey: course.key,
        courseCode: course.courseCode,
        courseName: course.courseName,
        previousGrade: prior.grade,
        currentGrade: course.grade,
        delta,
        summary: `${course.courseName} ${delta > 0 ? "rose" : "fell"} by ${Math.abs(delta).toFixed(1)}%`,
      });
    }

    const priorAssignments = new Map(
      (prior.assignments ?? []).map((assignment) => [assignment.key, assignment]),
    );
    const currentAssignments = new Map(
      (course.assignments ?? []).map((assignment) => [
        assignment.key,
        assignment,
      ]),
    );
    const courseDelta =
      prior.numericGrade !== null && course.numericGrade !== null
        ? Math.round((course.numericGrade - prior.numericGrade) * 10) / 10
        : null;

    course.assignments?.forEach((assignment) => {
      if (assignment.formative) return;
      const priorAssignment = priorAssignments.get(assignment.key);
      if (!priorAssignment) {
        changes.push({
          type: "assignment-added",
          courseKey: course.key,
          courseCode: course.courseCode,
          courseName: course.courseName,
          assignmentName: assignment.name,
          previousGrade: null,
          currentGrade: assignment.grade,
          delta: courseDelta,
          summary: `${assignment.name} was added in ${course.courseName}`,
        });
        return;
      }

      if (
        priorAssignment.numericGrade !== null &&
        assignment.numericGrade !== null &&
        Math.abs(priorAssignment.numericGrade - assignment.numericGrade) >= 0.1
      ) {
        const delta =
          Math.round(
            (assignment.numericGrade - priorAssignment.numericGrade) * 10,
          ) / 10;
        changes.push({
          type: "assignment-changed",
          courseKey: course.key,
          courseCode: course.courseCode,
          courseName: course.courseName,
          assignmentName: assignment.name,
          previousGrade: priorAssignment.grade,
          currentGrade: assignment.grade,
          delta: courseDelta,
          summary:
            courseDelta !== null
              ? `${assignment.name} moved ${course.courseName} by ${Math.abs(courseDelta).toFixed(1)}%`
              : `${assignment.name} ${delta > 0 ? "rose" : "fell"} by ${Math.abs(delta).toFixed(1)}%`,
        });
      }
    });

    prior.assignments?.forEach((assignment) => {
      if (assignment.formative || currentAssignments.has(assignment.key)) return;
      changes.push({
        type: "assignment-removed",
        courseKey: course.key,
        courseCode: course.courseCode,
        courseName: course.courseName,
        assignmentName: assignment.name,
        previousGrade: assignment.grade,
        currentGrade: null,
        delta: null,
        summary: `${assignment.name} was removed from ${course.courseName}`,
      });
    });
  });

  previous.courses.forEach((course) => {
    if (currentMap.has(course.key)) return;
    changes.push({
      type: "course-removed",
      courseKey: course.key,
      courseCode: course.courseCode,
      courseName: course.courseName,
      previousGrade: course.grade,
      currentGrade: null,
      delta: null,
      summary: `${course.courseName} was removed from your course list`,
    });
  });

  return changes;
};

export const appendGradeHistorySnapshot = async (
  courses: Course[],
  source: GradeHistorySource,
) => {
  const history = await loadGradeHistory();
  const previousSnapshot = history.length > 0 ? history[history.length - 1] : null;
  const nextSnapshot = await createSnapshot(courses, source);

  if (
    previousSnapshot &&
    createSnapshotSignature(previousSnapshot) === createSnapshotSignature(nextSnapshot)
  ) {
    return {
      history,
      latestSnapshot: previousSnapshot,
      previousSnapshot: history.length > 1 ? history[history.length - 2] : null,
      changes: [] as GradeHistoryChange[],
      snapshotAdded: false,
    };
  }

  const nextHistory = [...history, nextSnapshot].slice(-MAX_HISTORY_SNAPSHOTS);
  await AsyncStorage.setItem(GRADE_HISTORY_KEY, JSON.stringify(nextHistory));

  return {
    history: nextHistory,
    latestSnapshot: nextSnapshot,
    previousSnapshot,
    changes: compareGradeSnapshots(previousSnapshot, nextSnapshot),
    snapshotAdded: true,
  };
};

export const seedGradeHistoryFromStorage = async (
  source: GradeHistorySource = "cache",
) => {
  const storedCourses = await SecureStorage.load("ta_courses");
  if (!storedCourses) {
    return null;
  }

  try {
    const parsedCourses = JSON.parse(storedCourses) as Course[];
    if (!Array.isArray(parsedCourses) || parsedCourses.length === 0) {
      return null;
    }
    return appendGradeHistorySnapshot(parsedCourses, source);
  } catch {
    return null;
  }
};

export const loadStoredCourses = async (): Promise<Course[]> => {
  const storedCourses = await SecureStorage.load("ta_courses");
  if (!storedCourses) return [];

  try {
    const parsed = JSON.parse(storedCourses);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const loadDetailedCourseReports = async (
  courses: Course[],
): Promise<DetailedCourseReport[]> => {
  const reports = await Promise.all(
    courses.map(async (course) => {
      if (!course.subjectId) {
        return {
          course,
          parsedReport: null,
          hasCachedReport: false,
        };
      }

      const cachedReport = await loadParsedCourseReport(course.subjectId);
      if (!cachedReport) {
        return {
          course,
          parsedReport: null,
          hasCachedReport: false,
        };
      }

      return {
        course,
        parsedReport: cachedReport,
        hasCachedReport: true,
      };
    }),
  );

  return reports;
};
