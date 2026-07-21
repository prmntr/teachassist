import type { Course } from "./CourseParser";

export const STUDENT_GRADE_STORAGE_KEY = "ta_student_grade";
export const STUDENT_GRADE_STARTUP_SHOWN_CYCLE_STORAGE_KEY =
  "ta_student_grade_startup_shown_cycle";
export const STUDENT_GRADE_NOTIFICATION_OPENED_CYCLE_STORAGE_KEY =
  "ta_student_grade_notification_opened_cycle";

// Day of June to fire the annual grade notification.
// June 20 when all final marks are already posted; June 23 as a fallback.
export const ANNUAL_GRADE_NOTIFICATION_DAY_EARLY = 20;
export const ANNUAL_GRADE_NOTIFICATION_DAY_FALLBACK = 23;

export type StudentGrade = 9 | 10 | 11 | 12;

type CourseLike = {
  courseCode?: string | null;
};

export type StudentGradeTally = Record<StudentGrade, number>;

export type StudentGradeInference = {
  grade: StudentGrade | null;
  tally: StudentGradeTally;
  consideredCourses: number;
};

const GRADE_LEVELS: StudentGrade[] = [9, 10, 11, 12];
const ENGLISH_TIE_BREAK_PREFIXES = new Set(["Y", "E", "N"]);
const ENGLISH_TIE_BREAK_EXCLUSIONS = new Set(["NDW4M1"]);
const SPECIAL_CASE_GRADES: Record<string, StudentGrade> = {
  FS1TO1: 11,
  FS2TO2: 12,
};

const createEmptyTally = (): StudentGradeTally => ({
  9: 0,
  10: 0,
  11: 0,
  12: 0,
});

const normalizeCourseCode = (courseCode?: string | null) => {
  return courseCode?.trim().toUpperCase() ?? "";
};

// Most courses encode the student's grade in the 4th character:
// 1 -> grade 9, 2 -> grade 10, 3 -> grade 11, 4 -> grade 12.
// A small number of course codes break that pattern, so handle those first.
export const getCourseGradeLevel = (
  courseCode?: string | null,
): StudentGrade | null => {
  const normalizedCode = normalizeCourseCode(courseCode);

  if (!normalizedCode || normalizedCode === "LUNCH") {
    return null;
  }

  const specialCaseGrade = SPECIAL_CASE_GRADES[normalizedCode];
  if (specialCaseGrade) {
    return specialCaseGrade;
  }

  const gradeDigit = normalizedCode[3];
  if (gradeDigit === "1") return 9;
  if (gradeDigit === "2") return 10;
  if (gradeDigit === "3") return 11;
  if (gradeDigit === "4") return 12;
  return null;
};

// English-family courses are used only by students in that grade, so they
// break ties between tallies. NDW4M1 is excluded because it is not an English
// course despite starting with N.
const isEnglishTieBreakerCourse = (courseCode?: string | null) => {
  const normalizedCode = normalizeCourseCode(courseCode);
  if (!normalizedCode || ENGLISH_TIE_BREAK_EXCLUSIONS.has(normalizedCode)) {
    return false;
  }

  return ENGLISH_TIE_BREAK_PREFIXES.has(normalizedCode[0] ?? "");
};

export const inferStudentGrade = (
  courses: CourseLike[],
): StudentGradeInference => {
  const tally = createEmptyTally();
  const englishTieBreakerGrades = new Set<StudentGrade>();
  let consideredCourses = 0;

  courses.forEach((course) => {
    const grade = getCourseGradeLevel(course.courseCode);
    if (!grade) {
      return;
    }

    tally[grade] += 1;
    consideredCourses += 1;

    if (isEnglishTieBreakerCourse(course.courseCode)) {
      englishTieBreakerGrades.add(grade);
    }
  });

  const highestCount = Math.max(...GRADE_LEVELS.map((grade) => tally[grade]));
  if (highestCount <= 0) {
    return {
      grade: null,
      tally,
      consideredCourses,
    };
  }

  // Pick the grade with the highest tally. If there is a tie, prefer a grade
  // that has an English tie-breaker course. If there is still a tie, the
  // lowest grade wins because GRADE_LEVELS is ordered from 9 -> 12.
  let candidates = GRADE_LEVELS.filter((grade) => tally[grade] === highestCount);

  if (candidates.length > 1) {
    const englishCandidates = candidates.filter((grade) =>
      englishTieBreakerGrades.has(grade),
    );
    if (englishCandidates.length > 0) {
      candidates = englishCandidates;
    }
  }

  return {
    grade: candidates[0] ?? null,
    tally,
    consideredCourses,
  };
};

export const inferStudentGradeFromCoursesJson = (
  coursesJson: string | null | undefined,
): StudentGradeInference => {
  if (!coursesJson) {
    return {
      grade: null,
      tally: createEmptyTally(),
      consideredCourses: 0,
    };
  }

  try {
    const parsed = JSON.parse(coursesJson) as CourseLike[];
    if (!Array.isArray(parsed)) {
      throw new Error("Stored courses payload is not an array.");
    }
    return inferStudentGrade(parsed);
  } catch {
    return {
      grade: null,
      tally: createEmptyTally(),
      consideredCourses: 0,
    };
  }
};

export const formatStudentGradeLabel = (grade: StudentGrade) => `Grade ${grade}`;

// The annual student-grade flow is active only from June 20 at 4:00 PM until
// September 1. During that window the app can both schedule the reminder and
// auto-open the Determine Grade page once on startup if the reminder was not
// already opened by the user.
export const getActiveStudentGradeCycleYear = (from = new Date()) => {
  const year = from.getFullYear();
  const start = new Date(year, 5, 20, 16, 0, 0, 0);
  const end = new Date(year, 8, 1, 0, 0, 0, 0);

  if (from >= start && from < end) {
    return year;
  }

  return null;
};

export const shouldClearStudentGradeCycleState = (
  storedCycleYear: number,
  from = new Date(),
) => {
  const currentYear = from.getFullYear();
  if (storedCycleYear < currentYear) {
    return true;
  }

  if (storedCycleYear > currentYear) {
    return false;
  }

  const end = new Date(currentYear, 8, 1, 0, 0, 0, 0);
  return from >= end;
};

// Returns true when every non-stale, graded course has a final mark posted.
// Used to decide whether to schedule the annual notification for June 20 (early)
// or June 23 (fallback).
export const areAllFinalMarksAvailableFromCoursesJson = (
  coursesJson: string | null | undefined,
): boolean => {
  if (!coursesJson) return false;
  try {
    const courses = JSON.parse(coursesJson) as Course[];
    if (!Array.isArray(courses) || courses.length === 0) return false;
    const gradedCourses = courses.filter(
      (c) => c.hasGrade && !c.isGradeStale,
    );
    if (gradedCourses.length === 0) return false;
    return gradedCourses.every((c) => Boolean(c.finalMark));
  } catch {
    return false;
  }
};
