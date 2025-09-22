import { parseDocument } from "htmlparser2";
import { findAll, textContent } from "domutils";

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
}

// Structure for the final summary
interface Summary {
  term: number | null;
  course: number | null;
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

// Helper to parse score cells - now handles both "weight=X" and "no weight" cases
const parseScoreCell = (cellText: string) => {
  if (!cellText || !cellText.includes("/") || !cellText.includes("%"))
    return null;

  const scoreMatch = cellText.match(/([\d\.]+\s*\/\s*[\d\.]+)/);
  const percentageMatch = cellText.match(/(\d+%)/);

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
    percentage: percentageMatch ? percentageMatch[1] : "",
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
};

// Extract course name from HTML - improved to handle the structure better
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
      // check if this is a formative assignment
      if (isFormativeAssignment(assignment.categories)) {
        assignment.formative = true;
      }
      assignments.push(assignment);
    }
  }

  return assignments.reverse(); // Recent first
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
  const parsePercentage = (text: string): number | null => {
    if (!text) return null;

    // Remove % sign and try to parse
    const cleaned = text.replace("%", "").trim();
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? null : parsed;
  };

  return {
    term: parsePercentage(termText),
    course: parsePercentage(courseText),
    categories: categoryBreakdown,
  };
};

// Main parsing function that returns JSON data
export const parseGradeData = (htmlContent: string): ParsedCourseData => {
  if (!htmlContent) {
    return {
      assignments: [],
      summary: { term: null, course: null, categories: [] },
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
      summary: { term: null, course: null, categories: [] },
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
  if (percentage >= 90) return "bg-baccent";
  if (percentage >= 80) return "bg-success";
  if (percentage >= 70) return "bg-caution";
  if (percentage >= 60) return "bg-warning";
  return "bg-danger";
};

export const getPerformanceText = (percentage: number): string => {
  if (percentage >= 90) return "Excellent Performance";
  if (percentage >= 80) return "Strong Performance";
  if (percentage >= 70) return "Good Performance";
  if (percentage >= 50) return "Satisfactory Performance";
  return "Needs Improvement";
};
