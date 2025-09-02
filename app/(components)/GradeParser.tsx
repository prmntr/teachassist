import { parseDocument } from "htmlparser2";
import { findAll, textContent } from "domutils";

// Structure for parsed assignment
interface Assignment {
  name: string;
  categories: {
    [key: string]: {
      score: string;
      percentage: string;
      weight: string;
    } | null;
  };
}

// Structure for the final summary
interface Summary {
  term: number;
  course: number;
  categories: {
    name: string;
    weighting: string;
    achievement: string;
  }[];
}

// Complete parsed course data
export interface ParsedCourseData {
  assignments: Assignment[];
  summary: Summary;
  courseName: string;
  success: boolean;
  error?: string;
}

// Helper to safely get text from an element
const safeGetText = (el: any): string => (el ? textContent(el).trim() : "");

// Helper to parse score cells ex 12 / 13 = 92% weight=10
const parseScoreCell = (cellText: string) => {
  if (!cellText || !cellText.includes("/") || !cellText.includes("%"))
    return null;

  const scoreMatch = cellText.match(/([\d\.]+\s*\/\s*[\d\.]+)/);
  const percentageMatch = cellText.match(/(\d+%)/);
  const weightMatch = cellText.match(/weight=(\d+)/);

  return {
    score: scoreMatch ? scoreMatch[1] : "N/A",
    percentage: percentageMatch ? percentageMatch[1] : "",
    weight: weightMatch ? weightMatch[1] : "",
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
};

// Extract course name from HTML
const extractCourseName = (dom: any): string => {
  const h2Elements = findAll((el) => el.tagName === "h2", dom);
  return h2Elements.length > 0 ? safeGetText(h2Elements[0]) : "Course";
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
      assignments.push(assignment);
    }
  }

  return assignments.reverse(); // Recent first
};

// Parse summary data from HTML
const parseSummary = (dom: any): Summary => {
  const summaryTables = findAll((el) => el.tagName === "table", dom);

  let termText = "";
  let courseText = "";
  const overallMarkTable = summaryTables.find((table) =>
    safeGetText(table).includes("Term")
  );

  if (overallMarkTable) {
    const all64ptDivs = findAll(
      (el) => el.attribs?.style?.includes("font-size:64pt"),
      overallMarkTable.children
    );

    if (all64ptDivs.length > 1) {
      termText = safeGetText(all64ptDivs[0]);
      courseText = safeGetText(all64ptDivs[1]);
    } else if (all64ptDivs.length === 1) {
      courseText = safeGetText(all64ptDivs[0]);
    }
  }

  const breakdownTable = summaryTables.find((table) =>
    safeGetText(table).includes("Student Achievement")
  );
  const breakdownRows = breakdownTable
    ? findAll((el) => el.tagName === "tr", breakdownTable.children)
    : [];

  const categoryBreakdown = breakdownRows.slice(1).map((row) => {
    const cells = findAll((el) => el.tagName === "td", row.children);
    return {
      name: safeGetText(cells[0]),
      weighting: safeGetText(cells[1]),
      achievement: safeGetText(cells[3]),
    };
  });

  return {
    term: parseInt(termText),
    course: parseInt(courseText),
    categories: categoryBreakdown,
  };
};

// Main parsing function that returns JSON data
export const parseGradeData = (htmlContent: string): ParsedCourseData => {
  if (!htmlContent) {
    return {
      assignments: [],
      summary: { term: NaN, course: NaN, categories: [] },
      courseName: "Course",
      success: false,
      error: "No HTML content provided",
    };
  }

  try {
    const dom = parseDocument(htmlContent);

    const courseName = extractCourseName(dom);
    const assignments = parseAssignments(dom);
    const summary = parseSummary(dom);

    return {
      assignments,
      summary,
      courseName,
      success: true,
    };
  } catch (error) {
    return {
      assignments: [],
      summary: { term: NaN, course: NaN, categories: [] },
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
  return categoryNames[key] || key;
};

export const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return "bg-[#2faf7f]/60";
  if (percentage >= 80) return "bg-blue-500/60";
  if (percentage >= 70) return "bg-yellow-500/60";
  if (percentage >= 60) return "bg-orange-500/60";
  return "bg-red-500";
};

export const getPerformanceText = (percentage: number): string => {
  if (percentage >= 90) return "Excellent Performance";
  if (percentage >= 80) return "Strong Performance";
  if (percentage >= 70) return "Good Performance";
  if (percentage >= 50) return "Satisfactory Performance";
  return "Needs Improvement";
};
