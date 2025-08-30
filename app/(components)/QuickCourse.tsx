import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { SecureStorage } from "../(auth)/taauth";
import { Course } from "./CourseParser";
import AnimatedProgressWheel from "react-native-progress-wheel";

interface CourseInfoBoxProps {
  courseCode?: string; // Optional: specify which course to display
  subjectId?: string; // Optional: specify by subject ID
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

export const CourseInfoBox = ({
  courseCode,
  subjectId,
}: CourseInfoBoxProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const storedCourses = await SecureStorage.load("ta_courses");
        if (storedCourses) {
          const parsedCourses: Course[] = JSON.parse(storedCourses);
          setCourses(parsedCourses);
        } else {
          setError("No courses found in storage");
        }
      } catch (err) {
        setError("Failed to load courses from storage");
        console.error("Error loading courses:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const selectedCourse = useMemo((): DisplayCourse | null => {
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

    if (!targetCourse) return null;

    // Convert Course to DisplayCourse format
    return {
      courseName: targetCourse.courseName,
      courseCode: targetCourse.courseCode,
      courseMark:
        targetCourse.hasGrade && targetCourse.grade !== "See teacher"
          ? targetCourse.grade
          : "N/A",
      termMark: null, // The parser doesn't extract term marks, only final grades
      block: targetCourse.block,
      room: targetCourse.room,
      semester: targetCourse.semester,
      hasGrade: targetCourse.hasGrade,
    };
  }, [courses, courseCode, subjectId]);

  // Loading state
  if (loading) {
    return (
      <View className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full">
        {/*loading*/}
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full">
        <Text className="text-appwhite text-center">
          {error}. Check your internet connection and try again.
        </Text>
      </View>
    );
  }

  // No course found or no grade available
  if (
    !selectedCourse ||
    (!selectedCourse.hasGrade && selectedCourse.courseMark === "See teacher")
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
            {selectedCourse?.courseName || "Course Not Found"}
          </Text>
          {selectedCourse && (
            <Text className="text-appwhite/80 text-sm mb-2">
              {selectedCourse.courseCode} • Semester {selectedCourse.semester}
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
                {selectedCourse
                  ? "Please see teacher for current status regarding achievement in this course"
                  : "No courses found. Check your internet connection and try again."}
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
    if (isNaN(numericMark)) return "Grade Not Available";

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
            {getPerformanceStatus(selectedCourse.courseMark)}
          </Text>
        </View>
        <Text className="text-appwhite">Period {selectedCourse.block}</Text>
        <Text className="text-appwhite text-2xl font-bold">
          {selectedCourse.courseName}
        </Text>
        <Text className="text-baccent/90 text-lg">
          {selectedCourse.courseCode} • Room {selectedCourse.room}
        </Text>
        {selectedCourse.termMark &&
          (() => {
            return (
              <View
                className="bg-emerald-500/20 rounded-lg px-3 py-1 border border-emerald-500/30 mt-1"
                style={{ alignSelf: "flex-start" }}
              >
                <Text className="text-emerald-400/80 text-sm font-medium">
                  Term Mark: {selectedCourse.courseMark}
                </Text>
              </View>
            );
          })()}
      </View>

      <View className="flex-row justify-end items-end flex-shrink-0">
        <View>
          {(() => {
            const mark = parseFloat(selectedCourse.courseMark) || 0;
            return (
              <AnimatedProgressWheel
                size={90}
                width={13}
                color={"#2faf7f"}
                backgroundColor={"#292929"}
                progress={mark}
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

export default CourseInfoBox;
