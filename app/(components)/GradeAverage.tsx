import React, { useEffect, useState } from "react";
import { Text, View, Image } from "react-native";
import { SecureStorage } from "../(auth)/taauth";
import { Course } from "./CourseParser";

interface GradeStats {
  currentAverage: number;
  previousAverage: number | null;
  courseCount: number;
  lastUpdated: string;
  trend: "up" | "down" | "same" | "new";
}

interface GradeAverageTrackerProps {
  showTrend?: boolean;
  showCourseCount?: boolean;
  showLastUpdated?: boolean;
}

const GradeAverageTracker: React.FC<GradeAverageTrackerProps> = ({
  showTrend = true,
  showCourseCount = true,
  showLastUpdated = false,
}) => {
  const [gradeStats, setGradeStats] = useState<GradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateAverageFromCourses = (courses: Course[]): number | null => {
    const gradedCourses = courses.filter((course) => {
      if (!course.hasGrade || course.grade === "See teacher") return false;

      // get # from grade
      const numericGrade = parseFloat(course.grade.replace("%", ""));
      return !isNaN(numericGrade) && numericGrade >= 0 && numericGrade <= 100;
    });

    if (gradedCourses.length === 0) return null;

    const total = gradedCourses.reduce((sum, course) => {
      const numericGrade = parseFloat(course.grade.replace("%", ""));
      return sum + numericGrade;
    }, 0);

    return Math.round((total / gradedCourses.length) * 10) / 10; // round to 1
  };

  const determineGradeTrend = (
    current: number,
    previous: number | null
  ): "up" | "down" | "same" | "new" => {
    if (previous === null) return "new";
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "same";
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case "up":
        return "text-emerald-400";
      case "down":
        return "text-red-400";
      case "same":
        return "text-baccent";
      default:
        return "text-baccent";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return (
          <Image
            source={require("../../assets/images/caret-arrow-up.png")}
            className="w-4 h-4 object-fill"
            style={{ tintColor: "#27b1fa" }}
          />
        );
      case "down":
        return (
          <Image
            source={require("../../assets/images/caret-arrow-down.png")}
            className="w-4 h-4 object-fill"
            style={{ tintColor: "#27b1fa" }}
          />
        );
      case "same":
        return (
          <Image
            source={require("../../assets/images/caret-arrow-none.png")}
            className="w-4 h-4 object-fill"
            style={{ tintColor: "#27b1fa" }}
          />
        );
      default:
        return (
          <Image
            source={require("../../assets/images/caret-arrow-up.png")}
            className="w-4 h-4 object-fill"
            style={{ tintColor: "#27b1fa" }}
          />
        );
    }
  };

  const updateGradeAverage = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // load current courses
      const coursesJson = await SecureStorage.load("ta_courses");
      if (!coursesJson) {
        throw new Error("No courses found in storage");
      }

      const courses: Course[] = JSON.parse(coursesJson);
      let currentAverage = calculateAverageFromCourses(courses);

      if (currentAverage === null) {
        currentAverage = 0.0;
      }

      // Load previous average
      let previousAverage: number | null = null;
      try {
        const previousAverageStr = await SecureStorage.load(
          "grade_previous_average"
        );
        previousAverage = previousAverageStr
          ? parseFloat(previousAverageStr)
          : null;
      } catch {
        // no previous average exists; fine ok
      }

      // so we save the rn average as last avg
      await SecureStorage.save(
        "grade_previous_average",
        currentAverage.toString()
      );
      await SecureStorage.save("grade_last_updated", new Date().toISOString());

      const gradedCourseCount = courses.filter(
        (course) =>
          course.hasGrade &&
          course.grade !== "See teacher" &&
          !isNaN(parseFloat(course.grade.replace("%", "")))
      ).length;

      const stats: GradeStats = {
        currentAverage,
        previousAverage,
        courseCount: gradedCourseCount,
        lastUpdated: new Date().toISOString(),
        trend: determineGradeTrend(currentAverage, previousAverage),
      };

      setGradeStats(stats);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to calculate grade average"
      );
      console.error("Error calculating grade average:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateGradeAverage();
  }, []);

  if (loading) {
    return (
      <View className="bg-3 rounded-xl p-4 mb-4 mt-6 py-9">
        <Text className="text-appwhite/60 text-center">
          {/*calculating avg*/}
        </Text>
      </View>
    );
  }

  if (error || !gradeStats) {
    return (
      <View className="bg-3 rounded-xl p-4 mb-4 mt-6">
        <Text className="text-red-400/80 text-center text-sm">
          {error || "Unable to calculate grade average"}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-3 rounded-xl p-4 mt-1 flex-row items-center justify-start">
      <View className="flex-column items-center justify-center mr-5">
        
      </View>
      <View className="flex-column justify-start items-start">
        <Text className="text-appwhite/80 text-lg font-semibold">
          Grade Average
        </Text>
        {gradeStats.previousAverage !== null && (
          <View className="flex-row items-center">
            {getTrendIcon(gradeStats.trend)}
            <Text
              className={`text-2xl font-bold ml-1 ${getTrendColor(gradeStats.trend)}`}
            >
              {gradeStats.currentAverage > gradeStats.previousAverage
                ? "+"
                : ""}
              {(gradeStats.currentAverage - gradeStats.previousAverage).toFixed(
                1
              )}
              %
            </Text>
          </View>
        )}
        <View className="flex-column justify-start items-start">
          {showCourseCount && (
            <Text className="text-appwhite/50 text-sm">
              Based on {gradeStats.courseCount} course
              {gradeStats.courseCount !== 1 ? "s" : ""}
            </Text>
          )}
          {showLastUpdated && (
            <Text className="text-appwhite/50 text-sm">
              Last updated{" "}
              {new Date(gradeStats.lastUpdated).toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default GradeAverageTracker;
