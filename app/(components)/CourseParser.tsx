import { Parser } from "htmlparser2";


// parses the individual courses from HOMEPAGE NOT ASSIGNMENTS FOR SPECIFIC COURSES

// types for return
interface Course {
  courseCode: string;
  courseName: string;
  block: string;
  room: string;
  startDate: string;
  endDate: string;
  grade: string;
  midtermMark?: string | null;
  finalMark?: string | null;
  hasGrade: boolean;
  semester: number;
  subjectId?: string;
  reportUrl?: string;
  isGradeStale?: boolean;
}

// ignore
interface ParserState {
  courses: Course[];
  currentCourse: Partial<Course>;
  isInCourseTable: boolean;
  isInTableRow: boolean;
  currentCell: number;
  currentText: string;
  isInHeader: boolean;
  gradeLinkUrl?: string;
  gradeLinkSubjectId?: string;
}

interface ParseResult {
  success: boolean;
  data: Course[];
  error?: string;
}

// type guards
function isValidCourse(course: Partial<Course>): course is Course {
  return !!(
    course.courseCode &&
    course.courseName &&
    course.block &&
    course.room &&
    course.startDate &&
    course.endDate &&
    course.grade !== undefined &&
    course.hasGrade !== undefined &&
    course.semester !== undefined
  );
}

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isSubjectId(value: string): boolean {
  return /^\d{6}$/.test(value);
}

function parseCourseData(html: string): ParseResult {
  if (!html || typeof html !== "string") {
    return {
      success: false,
      data: [],
      error: "Invalid HTML input",
    };
  }

  const state: ParserState = {
    courses: [],
    currentCourse: {},
    isInCourseTable: false,
    isInTableRow: false,
    currentCell: 0,
    currentText: "",
    isInHeader: false,
  };

  try {
    const parser = new Parser(
      {
        onopentag(name: string, attributes: Record<string, string>) {
          handleOpenTag(name, attributes, state);
        },

        ontext(text: string) {
          if (state.isInTableRow) {
            state.currentText += text;
          }
        },

        onclosetag(name: string) {
          handleCloseTag(name, state);
        },
      },
      { decodeEntities: true }
    );

    parser.write(html);
    parser.end();

    const validCourses = state.courses.filter((course): course is Course => {
      return isValidCourse(course);
    });

    return {
      success: true,
      data: validCourses,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown parsing error",
    };
  }
}

function handleOpenTag(
  name: string,
  attributes: Record<string, string>,
  state: ParserState
): void {
  // make sure we're in course table
  if (name === "table" && attributes.width === "85%") {
    state.isInCourseTable = true;
    return;
  }

  // start of a table row in the course table
  if (state.isInCourseTable && name === "tr") {
    state.isInTableRow = true;
    state.currentCell = 0;
    state.currentCourse = {};
    state.gradeLinkUrl = undefined;
    state.gradeLinkSubjectId = undefined;

    // check if header row
    state.isInHeader = !attributes.bgcolor && state.courses.length === 0;
    return;
  }

  // table cells
  if (state.isInTableRow && (name === "td" || name === "th")) {
    state.currentText = "";
    return;
  }

  // get links maybe in cell
  if (
    state.isInTableRow &&
    state.currentCell === 2 &&
    name === "a" &&
    attributes.href
  ) {
    const match = attributes.href.match(/subject_id=(\d{6})/);
    if (match && isSubjectId(match[1])) {
      state.gradeLinkUrl = attributes.href;
      state.gradeLinkSubjectId = match[1];
    }
  }
}

function handleCloseTag(name: string, state: ParserState): void {
  if (name === "table" && state.isInCourseTable) {
    state.isInCourseTable = false;
    return;
  }

  if (name === "tr" && state.isInTableRow) {
    state.isInTableRow = false;

    // dont add the header row or invalid courses
    if (!state.isInHeader && state.currentCourse.courseCode) {
      const course = state.currentCourse;
      if (isValidCourse(course)) {
        state.courses.push(course);
      }
    }
    return;
  }

  if (state.isInTableRow && (name === "td" || name === "th")) {
    const cleanText = state.currentText.trim().replace(/\s+/g, " ");

    if (state.isInHeader) {
      state.currentCell++;
      return;
    }

    switch (state.currentCell) {
      case 0: // Course info
        parseCourseInfo(cleanText, state.currentCourse);
        break;
      case 1: // Date
        parseDateRange(cleanText, state.currentCourse);
        break;
      case 2: // Grade/Mark
        parseGradeInfo(
          cleanText,
          state.currentCourse,
          state.gradeLinkSubjectId,
          state.gradeLinkUrl
        );
        break;
    }
    state.currentCell++;
  }
}

function parseCourseInfo(text: string, course: Partial<Course>): void {
  if (!text) return;

  // get course stuff
  const courseMatch = text.match(/^([^:]+)\s*:\s*(.+?)(?:\s+Block:|$)/);
  if (courseMatch) {
    const courseCode = courseMatch[1]?.trim();
    const courseName = courseMatch[2]?.trim();

    if (courseCode) course.courseCode = courseCode;
    if (courseName) {
      if (courseCode.toLowerCase().includes("lunch")) {
        course.courseName = "Lunch";
      } else if (courseName.includes("Block")) {
        course.courseName = courseCode; // no course name
      } else{
        course.courseName = courseName;
      }
    }
  }

  // Extract block and room info
  const blockMatch = text.match(/Block:\s*([^-]+)\s*-\s*rm\.\s*(.+)/);
  if (blockMatch) {
    const block = blockMatch[1]?.trim().replace(/\D/g, ""); // trim p from string
    const room = blockMatch[2]?.trim();

    if (block) course.block = block;
    if (room) course.room = room;
  }
}

function parseDateRange(text: string, course: Partial<Course>): void {
  if (!text) return;

  // Format: "2025-09-02 ~ 2026-01-29"
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const startDate = dateMatch[1];
    const endDate = dateMatch[2];

    if (startDate && isDateString(startDate)) {
      course.startDate = startDate;

      // Determine semester based on start month
      const startMonth = parseInt(startDate.split("-")[1], 10);
      course.semester = startMonth === 8 || startMonth === 9 ? 1 : 2;
    }
    if (endDate && isDateString(endDate)) {
      course.endDate = endDate;
    }
  }
}

function parseGradeInfo(
  text: string,
  course: Partial<Course>,
  gradeSubjectId?: string,
  gradeLinkUrl?: string
): void {
  if (!text) {
    course.grade = "";
    course.hasGrade = false;
    return;
  }
  const midtermMatch = text.match(/MIDTERM MARK:\s*(\d+\.?\d*)%/i);
  if (midtermMatch) {
    course.midtermMark = midtermMatch[1];
  }
  const finalMatch = text.match(/FINAL MARK:\s*(\d+\.?\d*)%/i);
  if (finalMatch) {
    course.finalMark = finalMatch[1];
  }
  if (gradeSubjectId) {
    course.subjectId = gradeSubjectId;
  }
  if (gradeLinkUrl) {
    course.reportUrl = gradeLinkUrl;
  }
  // check if no marks yet
  if (text.includes("Please see teacher for current status")) {
    course.grade = "See teacher";
    course.hasGrade = false; // modify change here
  } else if (gradeSubjectId || gradeLinkUrl) {

    // get grade percentage ex "current mark = 97.8%"
    const gradeMatch = text.match(/current mark =\s*(\d+\.?\d*)%/);
    course.grade = gradeMatch ? gradeMatch[1] : text.trim();
    console.log("grade" + course.grade);
    course.hasGrade = true;
  } else {
    // otherwise
    course.grade = text.trim();
    course.hasGrade = true;
  }
}

// main parsing function
function parseStudentGrades(htmlString: string): string {
  if (!htmlString || typeof htmlString !== "string") {
    console.warn("parseStudentGrades: Invalid input provided");
    return JSON.stringify([]);
  }

  try {
    const result = parseCourseData(htmlString);

    console.log(result);

    if (!result.success) {
      console.error("Error parsing course data:", result.error);
      return JSON.stringify([]);
    }

    return JSON.stringify(result.data, null, 2);
  } catch (error) {
    console.error("Unexpected error in parseStudentGrades:", error);
    return JSON.stringify([]);
  }
}

export { parseStudentGrades, type Course, type ParseResult };
