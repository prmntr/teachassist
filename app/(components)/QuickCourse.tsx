import { useMemo } from "react";
import { Text, View } from "react-native";
import { Course } from "./CourseParser";
import AnimatedProgressWheel from "react-native-progress-wheel";

interface CourseInfoBoxProps {
  course: Course; // pass the course directly instead of loading it
}

interface DisplayCourse {
  courseName: string;
  courseCode: string;
  courseMark: string;
  block: string;
  room: string;
  termMark: string | null;
  semester: number;
  hasGrade: boolean;
}

export const CourseInfoBox = ({ course }: CourseInfoBoxProps) => {
  const displayCourse = useMemo((): DisplayCourse => {
    // Convert Course to DisplayCourse format
    return {
      courseName: course.courseName,
      courseCode: course.courseCode,
      courseMark:
        course.hasGrade && course.grade !== "See teacher"
          ? course.grade
          : "N/A",
      termMark: null, // The parser doesn't extract term marks, only final grades
      block: course.block,
      room: course.room,
      semester: course.semester,
      hasGrade: course.hasGrade,
    };
  }, [course]);

  // No course found or no grade available
  if (
    !displayCourse ||
    (!displayCourse.hasGrade && displayCourse.courseMark === "See teacher")
  ) {
    return (
      <View className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full">
        <View className="mb-2">
          <View className="flex-row items-center justify-start">
            <View className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
            <Text className="text-appwhite/60 text-sm">
              Grades Not Available
            </Text>
          </View>
          <Text className="text-appwhite text-2xl font-bold mb-1">
            {displayCourse?.courseName || "Course Not Found"}
          </Text>
          {displayCourse && (
            <Text className="text-appwhite/80 text-sm mb-2">
              {displayCourse.courseCode} • Semester {displayCourse.semester}
            </Text>
          )}
        </View>

        <View className="flex-row justify-center items-center">
          <View className="flex-1">
            <View className="bg-gray-500/20 rounded-lg p-4 border border-gray-500/30">
              <Text className="text-gray-400/80 text-sm font-medium mb-1 text-center">
                Current Status
              </Text>
              <Text className="text-gray-400 text-lg font-medium text-center">
                Please see teacher for current status regarding achievement in
                this course
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Helper function to get performance status
  const getPerformanceStatus = (mark: string): string => {
    const numericMark = parseFloat(mark.replace("%", ""));
    if (isNaN(numericMark)) {
      if (
        displayCourse.courseName.toLocaleLowerCase().includes("lunch") ||
        displayCourse.courseCode.toLocaleLowerCase().includes("lunch")
      ) {
        return "No Food Available Yet";
      }
      return "No Grade Available Yet";
    }

    if (numericMark >= 80) return "Excellent Performance";
    if (numericMark >= 70) return "Good Performance";
    if (numericMark >= 60) return "Satisfactory Performance";
    return "Needs Improvement";
  };

  return (
    <View className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full flex-row items-center justify-between flex-wrap">
      <View className="flex-1 min-w-0 pr-4">
        <View className="flex-row items-center justify-start mb-1">
          <View className="w-2 h-2 bg-baccent rounded-full mr-2" />
          <Text className="text-appwhite/60 text-sm">
            {getPerformanceStatus(displayCourse.courseMark)}
          </Text>
        </View>
        <Text className="text-appwhite">Period {displayCourse.block}</Text>
        <Text className="text-appwhite text-2xl font-bold">
          {displayCourse.courseName}
        </Text>
        <Text className="text-baccent/90 text-lg">
          {displayCourse.courseCode} • Room {displayCourse.room}
        </Text>
        {displayCourse.termMark &&
          (() => {
            return (
              <View
                className="bg-emerald-500/20 rounded-lg px-3 py-1 border border-emerald-500/30 mt-1"
                style={{ alignSelf: "flex-start" }}
              >
                <Text className="text-emerald-400/80 text-sm font-medium">
                  Term Mark: {displayCourse.courseMark}
                </Text>
              </View>
            );
          })()}
      </View>

      <View className="flex-row justify-end items-end flex-shrink-0">
        <View>
          {(() => {
            const mark = parseFloat(displayCourse.courseMark) || 0;
            return (
              <AnimatedProgressWheel
                size={90}
                width={13}
                color={"#2faf7f"}
                backgroundColor={"#292929"}
                progress={!mark || mark === 0 ? NaN : mark}
                max={100}
                rounded={true}
                rotation={"-90deg"}
                duration={400}
                showProgressLabel={true}
                labelStyle={{
                  color: "#2faf7f",
                  fontSize: 16,
                  fontWeight: "600",
                }}
                showPercentageSymbol={true}
              />
            );
          })()}
        </View>
      </View>
    </View>
  );
};

interface QuickCourseProps {
  courses: Course[];
  courseCode?: string;
  subjectId?: string;
}

export const QuickCourse = ({
  courses,
  courseCode,
  subjectId,
}: QuickCourseProps) => {
  const selectedCourse = useMemo((): Course | null => {
    if (courses.length === 0) return null;

    let targetCourse: Course | undefined;

    if (courseCode) {
      // Find by course code
      targetCourse = courses.find((course) => course.courseCode === courseCode);
    } else if (subjectId) {
      // Find by subject ID
      targetCourse = courses.find((course) => course.subjectId === subjectId);
    } else {
      // if no specific course requested, find the first course with a grade
      targetCourse = courses.find(
        (course) => course.hasGrade && course.grade !== "See teacher"
      );

      // If no course with grades, just take the first one
      if (!targetCourse) {
        targetCourse = courses[0];
      }
    }

    return targetCourse || null;
  }, [courses, courseCode, subjectId]);

  if (!selectedCourse) {
    return (
      <View className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full">
        <Text className="text-appwhite text-center">
          Course not found. Check your internet connection and try again.
        </Text>
      </View>
    );
  }

  return <CourseInfoBox course={selectedCourse} />;
};

export default CourseInfoBox;
