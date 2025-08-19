import { useMemo } from "react";
import { View, Text } from "react-native";
import { parseDocument } from "htmlparser2";
import {findAll, textContent } from "domutils";

// the component thing on courses

interface CourseInfo {
  courseName: string;
  courseCode: string;
  courseMark: string;
  termMark: string | null;
}

// helper to safely get text from element
const safeGetText = (el: any): string => (el ? textContent(el).trim() : "");

export const CourseInfoBox = ({ htmlContent }: { htmlContent: string }) => {
  const courseInfo = useMemo((): CourseInfo | null => {
    if (htmlContent === "") {
      return null;
    }

    const dom = parseDocument(htmlContent);

    // we can get the course name and code from the html
    let courseName = "";
    let courseCode = "";

    // look for the course code in h2 tags
    const h2Elements = findAll((el) => el.tagName === "h2", dom);
    if (h2Elements.length > 0) {
      courseCode = safeGetText(h2Elements[0]);
    }

    // TODO: get a db of course names so people dont just see FISJWK-44m-1
    courseName = courseCode;

    // Extract marks from the summary table with 64pt font divs
    let courseMark = "";
    let termMark: string | null = null;

    // find term and course tables
    const summaryTables = findAll((el) => el.tagName === "table", dom);
    const overallMarkTable = summaryTables.find((table) => {
      const tableText = safeGetText(table);
      return tableText.includes("Term") && tableText.includes("Course");
    });

    if (overallMarkTable) {
      // marks are 64pt
      const markDivs = findAll(
        (el) => el.attribs?.style?.includes("font-size:64pt"),
        overallMarkTable
      );

      // get the label to figure out which is which
      const labelDivs = findAll(
        (el) => el.attribs?.style?.includes("font-size:24pt"),
        overallMarkTable
      );

      // match marks to labels
      for (let i = 0; i < Math.min(markDivs.length, labelDivs.length); i++) {
        const mark = safeGetText(markDivs[i]);
        const label = safeGetText(labelDivs[i]).toLowerCase();

        if (label.includes("term")) {
          termMark = mark;
        } else if (label.includes("course")) {
          courseMark = mark;
        }
      }

      // Fallback: if we have marks but couldn't match labels properly
      if (!courseMark && markDivs.length > 0) {
        // If we have 2 marks, assume first is term, second is course
        if (markDivs.length >= 2) {
          termMark = safeGetText(markDivs[0]);
          courseMark = safeGetText(markDivs[1]);
        } else {
          // if only one mark, assume it's the course mark (term mark only for end sem)
          courseMark = safeGetText(markDivs[0]);
        }
      }
    }

    return {
      courseName,
      courseCode,
      courseMark,
      termMark,
    };
  }, [htmlContent]);

  if (!courseInfo || !courseInfo.courseMark) {
    return (
      <View className="bg-3 rounded-xl p-6 shadow-lg w-full">
        <Text className="text-appwhite text-center">
          {`This course could not be retreived. Check your internet connection and try again.`}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full">
      {/* Course Header */}
      <View className="mb-2">
        <View className="flex-row items-center justify-start">
          <View className="w-2 h-2 bg-emerald-400 rounded-full mr-2" />
          <Text className="text-appwhite/60 text-sm">
            {parseFloat(courseInfo.courseMark.replace("%", "")) >= 80
              ? "Excellent Performance"
              : parseFloat(courseInfo.courseMark.replace("%", "")) >= 70
                ? "Good Performance"
                : parseFloat(courseInfo.courseMark.replace("%", "")) >= 60
                  ? "Satisfactory Performance"
                  : "Needs Improvement"}
          </Text>
        </View>
        <Text className="text-appwhite text-2xl font-bold mb-1">
          {courseInfo.courseCode ?? "Course could not be found, check your internet and try again."}
        </Text>
      </View>

      {/* actual marks */}
      <View className="flex-row justify-center items-center">
        {/* term mark */}
        {courseInfo.termMark && (
          <View className="flex-1 mr-4">
            <View className="bg-baccent/20 rounded-lg p-4 border border-baccent/30">
              <Text className="text-baccent/80 text-sm font-medium mb-1">
                Term Mark
              </Text>
              <Text className="text-baccent text-3xl font-bold">
                {courseInfo.termMark ?? "NaN%"}
              </Text>
            </View>
          </View>
        )}

        {/* Course Mark */}
        <View className={courseInfo.termMark ? "flex-1" : "flex-1"}>
          <View className="bg-emerald-500/20 rounded-lg p-4 border border-emerald-500/30">
            <Text className="text-emerald-400/80 text-sm font-medium mb-1">
              Course Mark
            </Text>
            <Text className="text-emerald-400 text-3xl font-bold">
              {courseInfo.courseMark ?? "NaN%"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default CourseInfoBox;
