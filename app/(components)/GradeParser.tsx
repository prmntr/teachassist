import { useMemo } from "react";
import { View, Text } from "react-native";
import { parseDocument } from "htmlparser2";
import {findAll, textContent } from "domutils";

// much more complicated then realized; a million tables

// structure for parsed assignment
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

// structure for the final summary
interface Summary {
  term: string;
  course: string;
  categories: {
    name: string;
    weighting: string;
    achievement: string;
  }[];
}

// helper to goodly get text from an element
const safeGetText = (el: any): string => (el ? textContent(el).trim() : "");

// helper to parse score cells ex 12 / 13 = 92% weight=10
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

const calculateOverallMark = (categories: {
  [key: string]: { score: string; percentage: string; weight: string } | null;
}) => {
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

// simple thing to expand the name
const getCategoryFullName = (key: string): string => {
  const categoryNames: { [key: string]: string } = {
    K: "Knowledge & Understanding",
    T: "Thinking",
    C: "Communication", 
    A: "Application",
    O: "Other/Culminating",
  };
  return categoryNames[key] || key;
};

// consider removing
const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return "bg-emerald-500/60";
  if (percentage >= 80) return "bg-blue-500/60";
  if (percentage >= 70) return "bg-yellow-500/60";
  if (percentage >= 60) return "bg-orange-500/60";
  return "bg-red-500";
};


// Map background colors to category keys and names
const categoryMap: { [key: string]: { key: string; name: string } } = {
  ffffaa: { key: "K", name: "Knowledge / Understanding" },
  c0fea4: { key: "T", name: "Thinking" },
  afafff: { key: "C", name: "Communication" },
  ffd490: { key: "A", name: "Application" },
  "#dedede": { key: "O", name: "Other/Culminating" }, // idk
  dedede: { key: "O", name: "Other/Culminating" },
};

export const GradesParser = ({ htmlContent }: { htmlContent: string }) => {
  const { assignments, summary } = useMemo(() => {
    if (!htmlContent) {
      return { assignments: [], summary: null };
    }

    const dom = parseDocument(htmlContent);

    // --- 1. Extract Assignments (Fixed Logic) ---
    let assignments: Assignment[] = [];

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

      // find the parent row of this assignment cell
      const parentRow = assignmentCell.parent;
      if (!parentRow) continue;

      // Get all TD elements in this row (excluding the assignment name cell)
      const rowCells = findAll(
        (el) => el.tagName === "td" && el !== assignmentCell,
        parentRow.children
      );

      // do each cell by bg colour
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

    // --- 2. Extract Summary (Keep your existing logic, it looks correct) ---
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

    const summaryData: Summary = {
      term: termText,
      course: courseText,
      categories: categoryBreakdown,
    };

    // reverse for recent first
    assignments = assignments.reverse();

    return { assignments, summary: summaryData };
  }, [htmlContent]);

  if (!htmlContent || !assignments.length) {
    return (
      <View>
        <Text className="text-appwhite text-center">
          Could not parse grade data.
        </Text>
      </View>
    );
  }

  return (
    <View className="w-full">
      {/* Overall Grades */}
      {summary && (
        <View className="mb-6 flex-row justify-around bg-baccent/15 p-4 rounded-xl">
          {summary.term && (
            <View className="items-center">
              <Text className="text-appwhite/70 text-lg font-semibold">
                Term
              </Text>
              <Text className="text-baccent text-5xl font-bold">
                {summary.term}
              </Text>
            </View>
          )}
          <View className="items-center">
            <Text className="text-appwhite/70 text-lg font-semibold">
              Course
            </Text>
            <Text className="text-appwhite text-5xl font-bold">
              {summary.course}
            </Text>
          </View>
        </View>
      )}

      {/* Assignments List */}
      {assignments.map((item, index) => (
        // The rewritten assignment card component
        <View key={index} className="bg-3 rounded-xl p-5 mb-4 shadow-lg">
          {/* Header with assignment name and overall mark */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1">
              <Text className="text-appwhite text-xl font-bold mb-1">
                {item.name}
              </Text>
              <Text className="text-appwhite/60 text-sm">
                {
                  Object.values(item.categories).filter((cat) => cat !== null)
                    .length
                }{" "}
                {Object.values(item.categories).filter((cat) => cat !== null)
                  .length === 1
                  ? "category"
                  : "categories"}{" "}
                graded
              </Text>
            </View>

            <View className="py-2 bg-baccent/20 rounded-lg border border-baccent/30 px-4">
              <Text className="text-baccent/80 text-xs font-medium ">
                Overall
              </Text>
              <Text className="text-appwhite text-2xl font-bold">
                {calculateOverallMark(item.categories)}%
              </Text>
            </View>
          </View>

          {/* progress bars */}
          <View className="space-y-3">
            {Object.entries(item.categories).map(([key, value]) =>
              value ? (
                <View key={key} className="mb-3">
                  {/* Category Header */}
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-appwhite/70 font-semibold text-sm">
                      {getCategoryFullName(key)}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-appwhite text-lg font-bold">
                        {value.percentage}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View className="bg-slate-700 rounded-full h-2 overflow-hidden">
                    <View
                      className={`h-full rounded-full ${getProgressColor(parseInt(value.percentage.replace("%", "")))}`}
                      style={{
                        width: `${Math.min(parseInt(value.percentage.replace("%", "")), 100)}%`,
                      }}
                    />
                  </View>

                  {/* Weight indicator */}
                  <View className="flex-row justify-between items-center mt-1">
                    {value.weight && (
                      <Text className="text-appwhite/70 text-sm">
                        Weight: {value.weight}
                      </Text>
                    )}
                    <Text className="text-appwhite/70 text-sm">
                      {value.score}
                    </Text>
                  </View>
                </View>
              ) : null
            )}
          </View>

          {/* Footer with grade distribution visualization */}
          <View className="mt-4 pt-4 border-t border-slate-700">
            <View className="flex-row items-center justify-center">
              <View className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
              <Text className="text-appwhite/60 text-xs">
                {calculateOverallMark(item.categories) >= 90
                  ? "Excellent Performance"
                  : calculateOverallMark(item.categories) >= 80
                    ? "Strong Performance"
                    : calculateOverallMark(item.categories) >= 70
                      ? "Good Performance"
                      : calculateOverallMark(item.categories) >= 50
                        ? "Satisfactory Performance"
                        : "Needs Improvement"}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export default GradesParser;
