import { findAll, textContent, getOuterHTML } from "domutils";
import { parseDocument } from "htmlparser2";

// parses out the assignments for a specific course

// single parsed assignment
interface Assignment {
  name: string;
  formative?: boolean;
  categories: {
    [key: string]: {
      score: string;
      percentage: string;
      weight: string;
    } | null;
  };
  feedback?: string;
}

// Course weightings for each category
interface CourseWeightings {
  knowledge: string;
  thinking: string;
  communication: string;
  application: string;
  other: string;
  final: string;
}

// brief summary
interface Summary {
  term: number | null;
  course: number | null;
  categories: {
    name: string;
    weighting: string;
    achievement: string;
    key?: string;
    description?: string;
  }[];
  courseWeightings: CourseWeightings;
}

// Complete parsed course data
export interface ParsedCourseData {
  assignments: Assignment[];
  summary: Summary;
  courseName: string;
  success: boolean;
  reportType?: "standard" | "oe";
  error?: string;
}

const DEFAULT_COURSE_WEIGHTINGS: CourseWeightings = {
  knowledge: "0%",
  thinking: "0%",
  communication: "0%",
  application: "0%",
  other: "0%",
  final: "0%",
};

// Helper to safely get text from an element
const safeGetText = (el: any): string => (el ? textContent(el).trim() : "");
const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const parsePercentageValue = (text: string): number | null => {
  const match = text.match(/(\d+(?:\.\d+)?)%/);
  if (!match?.[1]) return null;
  const parsed = parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseWeightValue = (text: string): number | null => {
  const match = text.match(/([\d.]+)/);
  if (!match?.[1]) return null;
  const parsed = parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeExpectationKey = (value: string): string | null => {
  const match = normalizeWhitespace(value).match(/^([A-D]\d+)\.?\s*:?/i);
  return match?.[1] ? match[1].toUpperCase() : null;
};

const isOverallExpectationReport = (dom: any): boolean => {
  const pageText = safeGetText(dom);
  return (
    pageText.includes("By Overall Expectation") &&
    pageText.includes("Assessment Tasks")
  );
};

export const isSupportedCourseReportHtml = (htmlContent: string): boolean => {
  if (!htmlContent) return false;
  const normalized = normalizeWhitespace(htmlContent);
  return (
    normalized.includes("Assignment</th>") ||
    normalized.includes("Course Weighting") ||
    normalized.includes("Student Achievement") ||
    (normalized.includes("By Overall Expectation") &&
      normalized.includes("Assessment Tasks"))
  );
};

// Helper to parse score cells - now handles both "weight=X" and "no weight" cases
const parseScoreCell = (cellText: string) => {
  if (!cellText || !cellText.includes("/")) return null;

  const scoreMatch = cellText.match(/([\d\.]+\s*\/\s*[\d\.]+)/);
  const percentageMatch = cellText.match(/(\d+%)/);
  let percentage = percentageMatch ? percentageMatch[1] : "";

  if (!percentage && scoreMatch) {
    const numericMatch = cellText.match(
      /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/
    );
    if (numericMatch) {
      const earned = parseFloat(numericMatch[1]);
      const possible = parseFloat(numericMatch[2]);
      if (!isNaN(earned) && !isNaN(possible) && possible > 0) {
        percentage = `${Math.round((earned / possible) * 100)}%`;
      }
    }
  }

  // Handle both "weight=X" and "no weight" patterns
  let weight = "";
  const weightMatch = cellText.match(/weight=(\d+)/);
  const noWeightMatch = cellText.match(/no weight/i);

  if (weightMatch) {
    weight = weightMatch[1];
  } else if (noWeightMatch) {
    weight = "0"; // Treat "no weight" as weight 0
  }

  return {
    score: scoreMatch ? scoreMatch[1] : "N/A",
    percentage,
    weight: weight,
  };
};

// Map background colors to category keys and names
const categoryMap: { [key: string]: { key: string; name: string } } = {
  ffffaa: { key: "K", name: "Knowledge / Understanding" },
  c0fea4: { key: "T", name: "Thinking" },
  afafff: { key: "C", name: "Communication" },
  ffd490: { key: "A", name: "Application" },
  "#dedede": { key: "O", name: "Other/Culminating" },
  dedede: { key: "O", name: "Other/Culminating" },
  eeeeee: { key: "O", name: "Other/Culminating" },
  cccccc: { key: "F", name: "Final/Culminating" },
};

// Extract course name from HTML
const extractCourseName = (dom: any): string => {
  // First try to find h2 elements
  const h2Elements = findAll((el) => el.tagName === "h2", dom);
  for (const h2 of h2Elements) {
    const text = safeGetText(h2);
    // Look for course codes (letters + numbers + hyphens)
    if (text && /[A-Z]{3,4}\d+[A-Z]*-\d+/.test(text)) {
      return text;
    }
  }

  // Fallback: return first h2 if found
  if (h2Elements.length > 0) {
    return safeGetText(h2Elements[0]) || "Course";
  }

  return "Course";
};

const extractOverallExpectationCourseName = (dom: any): string => {
  const h1Elements = findAll((el) => el.tagName === "h1", dom);
  for (const h1 of h1Elements) {
    const text = normalizeWhitespace(safeGetText(h1));
    if (text) {
      return text;
    }
  }

  return "Course";
};

const isFormativeAssignment = (
  categories: Assignment["categories"]
): boolean => {
  const validCategories = Object.values(categories).filter(
    (cat) => cat !== null
  );
  if (validCategories.length === 0) return false;

  return validCategories.every((cat) => {
    if (!cat) return false;
    const weight = cat.weight;
    return weight === "0" || weight === "";
  });
};

const extractFeedback = (assignmentCell: any): string => {
  const assignmentName = safeGetText(assignmentCell).trim();

  // 1. Find the parent table and get its raw HTML
  let currentElement = assignmentCell.parent;
  let depth = 0;
  while (currentElement && currentElement.tagName !== "table" && depth < 10) {
    currentElement = currentElement.parent;
    depth++;
  }
  const assignmentTable = currentElement;

  if (!assignmentTable || assignmentTable.tagName !== "table") {
    return "";
  }

  // Use getOuterHTML to get the raw string of the assignment block
  // This is the source of truth, bypassing the broken DOM node traversal
  const tableHtml = getOuterHTML(assignmentTable);

  // 2. String search for the feedback cell attributes relative to the assignment name
  const assignmentStart = tableHtml.indexOf(assignmentName);
  if (assignmentStart === -1) return "";

  // The feedback cell is known to be:
  // <td colspan="4" bgcolor="white"> (with potential whitespace)
  const feedbackPattern =
    /<td\s+colspan\s*=\s*"4"\s+bgcolor\s*=\s*"white"\s*>(.*?)<\/td>/is;

  // Search only in the HTML *after* the assignment name (where the feedback row is)
  const postAssignmentHtml = tableHtml.substring(assignmentStart);

  const match = postAssignmentHtml.match(feedbackPattern);

  if (match && match[1]) {
    let rawFeedbackText = match[1].trim();

    // 3. Clean up the extracted HTML content (match[1] is the content inside the <td>)
    const cleanedFeedback = rawFeedbackText
      // Remove all remaining HTML tags (like <br> or <font>)
      .replace(/<[^>]*>/gi, " ")
      // Remove the "Feedback:" prefix
      .replace(/^Feedback:\s*/i, "")
      .replace(/&#xa0;/, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim();

    if (cleanedFeedback.length > 5) {
      return cleanedFeedback;
    }
  } else {
    console.warn(
      "could not find any feedback for assignment"
    );
  }

  return "";
};

// Parse course weightings from the weighting table
const parseCourseWeightings = (dom: any): CourseWeightings => {
  const defaultWeightings: CourseWeightings = { ...DEFAULT_COURSE_WEIGHTINGS };

  // Find all tables in the DOM
  const tables = findAll((el) => el.tagName === "table", dom);

  // Look for the table that contains course weightings
  let weightingTable = null;
  const normalizeTableText = (text: string) =>
    text.replace(/\s+/g, " ").trim().toLowerCase();
  const compactTableText = (text: string) =>
    text.replace(/\s+/g, "").trim().toLowerCase();

  for (const table of tables) {
    const tableText = safeGetText(table);
    const normalized = normalizeTableText(tableText);
    const compact = compactTableText(tableText);
    // Normalize whitespace because TeachAssist sometimes inserts line breaks between header words.
    const hasCategory = normalized.includes("category") || compact.includes("category");
    const hasCourseWeighting =
      normalized.includes("course weighting") || compact.includes("courseweighting");
    const hasStudentAchievement =
      normalized.includes("student achievement") || compact.includes("studentachievement");

    if (hasCategory && hasCourseWeighting && hasStudentAchievement) {
      weightingTable = table;
      break;
    }
  }

  if (!weightingTable) {
    console.warn("Could not find weighting table");
    return defaultWeightings;
  }

  // Find all rows in the weighting table
  const rows = findAll((el) => el.tagName === "tr", weightingTable);

  const extractPercentage = (text: string): string => {
    const match = text.match(/(\d+%)/);
    return match ? match[1] : "";
  };

  for (const row of rows) {
    const cells = findAll((el) => el.tagName === "td", row);
    if (cells.length === 0) continue; // Skip header row

    const categoryName = safeGetText(cells[0]).toLowerCase();

    let courseWeighting = "";

    // Prefer the "Course Weighting" column over "Weighting".
    if (cells.length >= 4) {
      courseWeighting = extractPercentage(safeGetText(cells[2]));
    } else if (cells.length === 3) {
      courseWeighting = extractPercentage(safeGetText(cells[1]));
    }

    if (!courseWeighting) {
      const rowText = safeGetText(row);
      const percentages = rowText.match(/(\d+%)/g) || [];
      if (percentages.length >= 3) {
        courseWeighting = percentages[1];
      } else if (percentages.length === 2) {
        courseWeighting = percentages[0];
      }
    }

    // Map category names to our structure
    if (
      categoryName.includes("knowledge") ||
      categoryName.includes("understanding")
    ) {
      defaultWeightings.knowledge = courseWeighting;
    } else if (categoryName.includes("thinking")) {
      defaultWeightings.thinking = courseWeighting;
    } else if (categoryName.includes("communication")) {
      defaultWeightings.communication = courseWeighting;
    } else if (categoryName.includes("application")) {
      defaultWeightings.application = courseWeighting;
    } else if (
      categoryName.includes("other") &&
      !categoryName.includes("final") &&
      !categoryName.includes("culminating")
    ) {
      defaultWeightings.other = courseWeighting;
    } else if (
      categoryName.includes("final") ||
      categoryName.includes("culminating")
    ) {
      defaultWeightings.final = courseWeighting;
    }
  }
  return defaultWeightings;
};

const findTableByHeaderText = (dom: any, headerText: string) => {
  const tables = findAll((el) => el.tagName === "table", dom);
  return (
    tables.find((table) =>
      normalizeWhitespace(safeGetText(table)).includes(headerText),
    ) ?? null
  );
};

const parseOverallExpectationSummary = (dom: any): Summary => {
  const summaryTable = findTableByHeaderText(dom, "By Overall Expectation");
  const categories: Summary["categories"] = [];

  if (summaryTable) {
    const rows = findAll((el) => el.tagName === "tr", summaryTable);
    for (const row of rows) {
      const cells = findAll((el) => el.tagName === "td", row.children);
      if (cells.length < 3) continue;

      const rawLabel = normalizeWhitespace(safeGetText(cells[0]));
      const key = normalizeExpectationKey(rawLabel);
      if (!key) continue;

      const description = normalizeWhitespace(
        rawLabel.replace(/^([A-D]\d+)\.?\s*:?\s*/i, ""),
      );
      const markCellText = normalizeWhitespace(safeGetText(cells[2]));
      const achievement = parsePercentageValue(markCellText);
      const totalWeightMatch = markCellText.match(
        /total weight:\s*([\d.]+)/i,
      );
      const totalWeight = totalWeightMatch?.[1] ?? "";

      categories.push({
        key,
        description,
        name: `${key}${description ? ` - ${description}` : ""}`,
        weighting: totalWeight,
        achievement: achievement === null ? "" : `${achievement}%`,
      });
    }
  }

  const weightedCategories = categories
    .map((category) => ({
      achievement: parseWeightValue(category.achievement),
      weight: parseWeightValue(category.weighting),
    }))
    .filter(
      (category): category is { achievement: number; weight: number } =>
        category.achievement !== null &&
        category.weight !== null &&
        category.weight > 0,
    );

  const weightedCourse =
    weightedCategories.length > 0
      ? weightedCategories.reduce(
          (total, category) => total + category.achievement * category.weight,
          0,
        ) /
        weightedCategories.reduce((total, category) => total + category.weight, 0)
      : null;

  return {
    term: null,
    course:
      weightedCourse === null ? null : parseFloat(weightedCourse.toFixed(1)),
    categories,
    courseWeightings: { ...DEFAULT_COURSE_WEIGHTINGS },
  };
};

const parseOverallExpectationAssignments = (dom: any): Assignment[] => {
  const assignmentTable = findTableByHeaderText(dom, "Task Name Expectation");
  if (!assignmentTable) {
    return [];
  }

  const rows = findAll((el) => el.tagName === "tr", assignmentTable);
  const assignmentMap = new Map<string, Assignment>();

  for (const row of rows) {
    const cells = findAll((el) => el.tagName === "td", row.children);
    if (cells.length < 5) continue;

    const assignmentName = normalizeWhitespace(safeGetText(cells[0]));
    const expectationKey = normalizeExpectationKey(safeGetText(cells[1]));
    const earnedText = normalizeWhitespace(safeGetText(cells[2]));
    const possibleText = normalizeWhitespace(safeGetText(cells[3]));
    const weightText = normalizeWhitespace(safeGetText(cells[4]));
    const feedbackText =
      cells.length > 5 ? normalizeWhitespace(safeGetText(cells[5])) : "";

    if (!assignmentName || !expectationKey || !earnedText || !possibleText) {
      continue;
    }

    const earned = parseFloat(earnedText);
    const possible = parseFloat(possibleText.replace("/", ""));
    if (!Number.isFinite(earned) || !Number.isFinite(possible) || possible <= 0) {
      continue;
    }

    const percentage = Math.round((earned / possible) * 100);
    const weight = parseWeightValue(weightText);
    const assignment =
      assignmentMap.get(assignmentName) ??
      ({
        name: assignmentName,
        categories: {},
      } satisfies Assignment);

    assignment.categories[expectationKey] = {
      score: `${earned} / ${possible}`,
      percentage: `${percentage}%`,
      weight: weight === null ? "" : weight.toString(),
    };

    if (feedbackText) {
      assignment.feedback = feedbackText;
    }

    assignmentMap.set(assignmentName, assignment);
  }

  return Array.from(assignmentMap.values()).reverse();
};

// Parse assignments from HTML
const parseAssignments = (dom: any): Assignment[] => {
  const assignments: Assignment[] = [];

  // Find all TD elements with rowspan="2", these are assignment name cells
  const assignmentCells = findAll(
    (el) => el.tagName === "td" && el.attribs?.rowspan === "2",
    dom
  );

  for (const assignmentCell of assignmentCells) {
    const assignmentName = safeGetText(assignmentCell).trim();
    if (!assignmentName) continue;

    const assignment: Assignment = {
      name: assignmentName,
      categories: {
        K: null,
        T: null,
        C: null,
        A: null,
        O: null,
      },
    };

    // Extract feedback for this assignment
    const feedback = extractFeedback(assignmentCell);
    if (feedback) {
      assignment.feedback = feedback;
    }

    // Find the parent row of this assignment cell
    const parentRow = assignmentCell.parent;
    if (!parentRow) continue;

    // Get all TD elements in this row (excluding the assignment name cell)
    const rowCells = findAll(
      (el) => el.tagName === "td" && el !== assignmentCell,
      parentRow.children
    );

    // Process each cell by background color
    for (const cell of rowCells) {
      const bgcolor = cell.attribs?.bgcolor?.toLowerCase().replace("#", "");
      if (!bgcolor || !categoryMap[bgcolor]) continue;

      // Get all text content from this cell (including nested tables)
      const cellText = safeGetText(cell);
      const categoryInfo = categoryMap[bgcolor];
      const parsedScore = parseScoreCell(cellText);

      if (parsedScore) {
        assignment.categories[categoryInfo.key] = parsedScore;
      }
    }

    // Only add assignments that have at least one grade
    const hasGrades = Object.values(assignment.categories).some(
      (cat) => cat !== null
    );
    if (hasGrades) {
      // check if this is a formative assignment
      if (isFormativeAssignment(assignment.categories)) {
        assignment.formative = true;
      }
      assignments.push(assignment);
    }
  }

  return assignments.reverse(); // Recent first
};

export const hasFeedback = (assignment: Assignment): boolean => {
  return !!(assignment.feedback && assignment.feedback.length > 0);
};

export const getFeedbackPreview = (
  feedback: string,
  maxLength: number = 100
): string => {
  if (!feedback) return "";
  if (feedback.length <= maxLength) return feedback;
  return feedback.substring(0, maxLength).trim() + "...";
};

export const formatFeedback = (feedback: string): string => {
  if (!feedback) return "";

  // Split by common sentence endings and rejoin with proper spacing
  return feedback
    .replace(/\.\s+/g, ". ")
    .replace(/\?\s+/g, "? ")
    .replace(/!\s+/g, "! ")
    .replace(/,\s+/g, ", ")
    .trim();
};

// Parse summary data from HTML - improved error handling
const parseSummary = (dom: any): Summary => {
  const summaryTables = findAll((el) => el.tagName === "table", dom);

  let termText = "";
  let courseText = "";

  // Find the table with large percentage displays
  const overallMarkTable = summaryTables.find((table) => {
    const tableText = safeGetText(table);
    return tableText.includes("Term") || tableText.includes("Course");
  });

  if (overallMarkTable) {
    const all64ptDivs = findAll(
      (el) => el.attribs?.style?.includes("font-size:64pt"),
      overallMarkTable.children
    );

    for (const div of all64ptDivs) {
      const text = safeGetText(div);
      const parentText = safeGetText(div.parent || {});

      if (parentText.toLowerCase().includes("term")) {
        termText = text;
      } else if (parentText.toLowerCase().includes("course")) {
        courseText = text;
      }
    }

    // Fallback: if we have divs but couldn't match by parent text
    if (!termText && !courseText && all64ptDivs.length > 0) {
      if (all64ptDivs.length >= 2) {
        termText = safeGetText(all64ptDivs[0]);
        courseText = safeGetText(all64ptDivs[1]);
      } else {
        courseText = safeGetText(all64ptDivs[0]);
      }
    }
  }

  // Find the breakdown table
  const breakdownTable = summaryTables.find((table) =>
    safeGetText(table).includes("Student Achievement")
  );

  const breakdownRows = breakdownTable
    ? findAll((el) => el.tagName === "tr", breakdownTable.children)
    : [];

  const categoryBreakdown = breakdownRows
    .slice(1)
    .map((row) => {
      const cells = findAll((el) => el.tagName === "td", row.children);
      return {
        name: safeGetText(cells[0]) || "",
        weighting: safeGetText(cells[1]) || "",
        achievement: safeGetText(cells[3]) || "",
      };
    })
    .filter((cat) => cat.name); // Filter out empty categories

  // Parse percentages more safely
  // Parse course weightings
  const courseWeightings = parseCourseWeightings(dom);

  return {
    term: parsePercentageValue(termText),
    course: parsePercentageValue(courseText),
    categories: categoryBreakdown,
    courseWeightings: courseWeightings,
  };
};

// Main parsing function that returns JSON data
export const parseGradeData = (htmlContent: string): ParsedCourseData => {
  if (!htmlContent) {
    return {
      assignments: [],
      summary: {
        term: null,
        course: null,
        categories: [],
        courseWeightings: { ...DEFAULT_COURSE_WEIGHTINGS },
      },
      courseName: "Course",
      success: false,
      error: "No HTML content provided",
    };
  }

  try {
    const dom = parseDocument(htmlContent);
    const reportType = isOverallExpectationReport(dom) ? "oe" : "standard";
    const courseName =
      reportType === "oe"
        ? extractOverallExpectationCourseName(dom)
        : extractCourseName(dom);
    const assignments =
      reportType === "oe"
        ? parseOverallExpectationAssignments(dom)
        : parseAssignments(dom);
    const summary =
      reportType === "oe"
        ? parseOverallExpectationSummary(dom)
        : parseSummary(dom);

    return {
      assignments,
      summary,
      courseName,
      success: true,
      reportType,
    };
  } catch (error) {
    return {
      assignments: [],
      summary: {
        term: null,
        course: null,
        categories: [],
        courseWeightings: { ...DEFAULT_COURSE_WEIGHTINGS },
      },
      courseName: "Course",
      success: false,
      error: error instanceof Error ? error.message : "Unknown parsing error",
    };
  }
};

// Utility functions for calculations
export const calculateOverallMark = (categories: {
  [key: string]: { score: string; percentage: string; weight: string } | null;
}): number => {
  const validCategories = Object.values(categories).filter(
    (cat) => cat !== null
  );
  if (validCategories.length === 0) return 0;

  const totalPercentage = validCategories.reduce((sum, cat) => {
    if (cat) {
      const percentage = parseInt(cat.percentage.replace("%", ""));
      return sum + (isNaN(percentage) ? 0 : percentage);
    }
    return sum;
  }, 0);

  return Math.round(totalPercentage / validCategories.length);
};

export const getCategoryFullName = (key: string): string => {
  const categoryNames: { [key: string]: string } = {
    K: "Knowledge & Understanding",
    T: "Thinking",
    C: "Communication",
    A: "Application",
    O: "Other/Culminating",
  };
  if (/^[A-D]\d+$/i.test(key)) {
    return `Overall Expectation ${key.toUpperCase()}`;
  }
  return categoryNames[key] || key;
};

export const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return "bg-baccent";
  if (percentage >= 80) return "bg-success";
  if (percentage >= 70) return "bg-caution";
  if (percentage >= 60) return "bg-warning";
  return "bg-danger";
};

export const getPerformanceText = (percentage: number): string => {
  if (percentage >= 100) return "Perfect Performance";
  if (percentage >= 90) return "Excellent Performance";
  if (percentage >= 80) return "Strong Performance";
  if (percentage >= 70) return "Good Performance";
  if (percentage >= 50) return "Satisfactory Performance";
  return "Needs Improvement";
};
