import { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import AnimatedProgressWheel from "react-native-progress-wheel";
import { SecureStorage } from "../(auth)/taauth";
import { useTheme } from "../contexts/ThemeContext";
import { Course } from "./CourseParser";

// gets grade average
// TODO: connect w/ notifs

interface GradeStats {
  currentAverage: number | null;
  previousAverage: number | null;
  courseCount: number;
  lastRetrieved: string | null;
  trend: "up" | "down" | "same" | "new";
}

interface GradeAverageTrackerProps {
  showTrend?: boolean;
  showCourseCount?: boolean;
  showLastUpdated?: boolean;
  hideMarksUntilTap?: boolean;
  refreshToken?: string;
}

const GradeAverageTracker: React.FC<GradeAverageTrackerProps> = ({
  showTrend = true,
  showCourseCount = true,
  showLastUpdated = false,
  hideMarksUntilTap = false,
  refreshToken,
}) => {
  const { isDark } = useTheme();

  const [gradeStats, setGradeStats] = useState<GradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealAverage, setRevealAverage] = useState(false);
  const [revealChange, setRevealChange] = useState(false);

  useEffect(() => {
    if (hideMarksUntilTap) {
      setRevealAverage(false);
      setRevealChange(false);
    }
  }, [hideMarksUntilTap, gradeStats?.currentAverage, gradeStats?.previousAverage]);

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

  const isDateWithinRange = (date: Date, start?: string, end?: string) => {
    if (!start || !end) return false;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T23:59:59`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return false;
    }
    return date >= startDate && date <= endDate;
  };

  const getActiveSemester = (courses: Course[]): 1 | 2 => {
    const now = new Date();
    const activeCourse = courses.find((course) =>
      isDateWithinRange(now, course.startDate, course.endDate)
    );
    if (activeCourse?.semester === 1 || activeCourse?.semester === 2) {
      return activeCourse.semester;
    }

    const year = now.getFullYear();
    const month = now.getMonth();
    const schoolYearStart = month >= 7 ? year : year - 1;
    const bufferMs = 5 * 24 * 60 * 60 * 1000;
    const sem1Start = new Date(schoolYearStart, 7, 1); // Aug 1
    const sem1End = new Date(schoolYearStart + 1, 0, 31, 23, 59, 59, 999);
    const sem2Start = new Date(schoolYearStart + 1, 1, 1); // Feb 1
    const sem2End = new Date(schoolYearStart + 1, 5, 30, 23, 59, 59, 999);

    if (
      now.getTime() >= sem2Start.getTime() - bufferMs &&
      now.getTime() <= sem2End.getTime() + bufferMs
    ) {
      return 2;
    }
    if (
      now.getTime() >= sem1Start.getTime() - bufferMs ||
      now.getTime() <= sem1End.getTime() + bufferMs
    ) {
      return 1;
    }
    return 2;
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case "up":
        return "text-emerald-400";
      case "down":
        return "text-danger";
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
            className={`w-4 h-4 object-fill`}
            style={{ tintColor: "#00d492" }}
          />
        );
      case "down":
        return (
          <Image
            source={require("../../assets/images/caret-arrow-down.png")}
            className={`w-4 h-4 object-fill`}
            style={{ tintColor: "#d6363f" }}
          />
        );
      case "same":
        return (
          <Image
            source={require("../../assets/images/caret-arrow-none.png")}
            className={`w-4 h-4 object-fill`}
            style={{ tintColor: "#27b1fa" }}
          />
        );
      default:
        return (
          <Image
            source={require("../../assets/images/caret-arrow-up.png")}
            className={`w-4 h-4 object-fill`}
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
      const hasSemesterCourses = courses.some(
        (course) => course.semester === 1 || course.semester === 2
      );
      const hasSchoolYearCourses = courses.some(
        (course) => course.semester === 0
      );
      const useSchoolYearOnly = hasSchoolYearCourses && !hasSemesterCourses;
      const scopedCourses = useSchoolYearOnly
        ? courses
        : courses.filter((course) => course.semester === getActiveSemester(courses));
      let currentAverage = calculateAverageFromCourses(scopedCourses);

      let lastRetrieved: string | null = null;
      try {
        lastRetrieved = await SecureStorage.load("marks_last_retrieved");
      } catch {
        // no last retrieved time exists
      }
      if (!lastRetrieved) {
        try {
          lastRetrieved = await SecureStorage.load("grade_last_updated");
        } catch {
          // no legacy last updated exists
        }
      }

      // Replace the problematic section with this fixed version:

      // Load the last known current average (to detect actual changes)
      let lastKnownAverage: number | null = null;
      try {
        const lastKnownStr = await SecureStorage.load(
          "grade_last_known_average"
        );
        lastKnownAverage = lastKnownStr ? parseFloat(lastKnownStr) : null;
      } catch {
        // no last known average exists
      }

      // Load the previous average (for trend display - this stays until there's a real change)
      let previousAverage: number | null = null;
      try {
        const previousAverageStr = await SecureStorage.load(
          "grade_previous_average"
        );
        previousAverage = previousAverageStr
          ? parseFloat(previousAverageStr)
          : null;
      } catch {
        // no previous average exists
      }

      // Check if this is a REAL change (not just a refresh)
      if (currentAverage !== null) {
        const isRealChange =
          lastKnownAverage !== null && lastKnownAverage !== currentAverage;

        if (isRealChange) {
          // Real change detected - update the previous average to the last known value
          if (lastKnownAverage !== null) {
            await SecureStorage.save(
              "grade_previous_average",
              lastKnownAverage.toString()
            );
            previousAverage = lastKnownAverage; // Update for current calculation
          }
        }

        // Always update the last known current average
        if (lastKnownAverage !== currentAverage) {
          await SecureStorage.save(
            "grade_last_known_average",
            currentAverage.toString()
          );
        }

        // Handle first-time setup
        if (lastKnownAverage === null && previousAverage === null) {
          await SecureStorage.save(
            "grade_last_known_average",
            currentAverage.toString()
          );
        }

        // so we save the rn average as last avg
        console.log(previousAverage, currentAverage);
        // Only update previous average when there's actually a change
        if (previousAverage !== null && previousAverage !== currentAverage) {
          // Keep the old previousAverage, don't overwrite it with currentAverage
        } else if (previousAverage === null) {
          // First time setup
          await SecureStorage.save(
            "grade_previous_average",
            currentAverage.toString()
          );
        }
        // so we save the rn average as last avg
      } else {
        previousAverage = null;
      }

      const gradedCourseCount = scopedCourses.filter(
        (course) =>
          course.hasGrade &&
          course.grade !== "See teacher" &&
          !isNaN(parseFloat(course.grade.replace("%", "")))
      ).length;

      const stats: GradeStats = {
        currentAverage,
        previousAverage,
        courseCount: gradedCourseCount,
        lastRetrieved,
        trend:
          currentAverage === null
            ? "new"
            : determineGradeTrend(currentAverage, previousAverage),
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
  }, [refreshToken]);

  if (loading) {
    return (
      <View
        className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 mb-4 mt-6 py-9`}
      >
      </View>
    );
  }

  if (error || !gradeStats) {
    return (
      <View
        className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 mb-4 mt-6`}
      >
        <Text className={`text-danger text-center text-sm`}>
          {error || "Unable to calculate grade average"}
        </Text>
      </View>
    );
  }

  const showAverage = !hideMarksUntilTap || revealAverage;
  const showChange = !hideMarksUntilTap || revealChange;
  const hasAverage = gradeStats.currentAverage !== null;
  const averageColor = hasAverage
    ? gradeStats.currentAverage >= 50
      ? "#27b1fa"
      : "#d6363f"
    : "#9ca3af";
  const averageLabel = hasAverage
    ? `${gradeStats.currentAverage.toFixed(1)}%`
    : "N/A";

  return (
    <View
      className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 mt-1 flex-row items-center justify-center`}
    >
      <TouchableOpacity
        activeOpacity={hideMarksUntilTap ? 0.75 : 1}
        onPress={() => {
          if (!hideMarksUntilTap) return;
          setRevealAverage((prev) => !prev);
        }}
        disabled={!hideMarksUntilTap}
        className="mr-5"
      >
        <View className="items-center justify-center">
          {showAverage ? (
            <View className="items-center justify-center">
              <AnimatedProgressWheel
                size={125}
                width={13}
                color={averageColor}
                backgroundColor={isDark ? "#232427" : "#e7e7e9"}
                progress={hasAverage ? gradeStats.currentAverage : 0}
                max={100}
                rounded={true}
                rotation={"-90deg"}
                delay={75}
                duration={400}
                showPercentageSymbol={hasAverage}
              />
              <View className="absolute">
                <Text
                  style={{
                    color: averageColor,
                    fontSize: 24,
                    fontWeight: "600",
                  }}
                >
                  {averageLabel}
                </Text>
              </View>
            </View>
          ) : (
            <View
              className={`${isDark ? "bg-dark4 " : "bg-light4 "} items-center justify-center`}
              style={{ width: 125, height: 125, borderRadius: 999 }}
            >
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-center font-semibold px-3`}
              >
                Tap to reveal average
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <View className={`flex-column justify-start items-start`}>
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold`}
        >
          Grade Average
        </Text>
        {gradeStats.previousAverage !== null && (
          <TouchableOpacity
            activeOpacity={hideMarksUntilTap ? 0.75 : 1}
            onPress={() => {
              if (!hideMarksUntilTap) return;
              setRevealChange((prev) => !prev);
            }}
            disabled={!hideMarksUntilTap}
          >
            {showChange ? (
              <View className={`flex-row items-center`}>
                {getTrendIcon(gradeStats.trend)}
                <Text
                  className={`text-2xl font-bold ml-1 ${getTrendColor(gradeStats.trend)}`}
                >
                  {Math.abs(
                    gradeStats.currentAverage - gradeStats.previousAverage
                  ).toFixed(1)}
                  %
                </Text>
              </View>
            ) : (
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} px-3 py-1 rounded-full`}
              >
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm font-semibold`}
                >
                  Tap to reveal change
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <View className={`flex-column justify-start items-start`}>
          {showCourseCount && (
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm`}
            >
              Based on {gradeStats.courseCount} course
              {gradeStats.courseCount !== 1 ? "s" : ""}
            </Text>
          )}
          {showLastUpdated && (
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm`}
            >
              Last retrieved{" "}
              {gradeStats.lastRetrieved
                ? new Date(gradeStats.lastRetrieved).toLocaleTimeString()
                : "N/A"}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default GradeAverageTracker;
