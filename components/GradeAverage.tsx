import { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AnimatedProgressWheel from "react-native-progress-wheel";
import { LineChart } from "react-native-gifted-charts";
import { SecureStorage } from "@/app/(auth)/taauth";
import { DEFAULT_STATUS_COLORS } from "@/utils/themeSystem";
import { useAFoolVisualGrades } from "@/contexts/AFoolVisualGradesContext";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import { Course } from "@/utils/CourseParser";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import {
  getScopedCourses,
  loadGradeHistory,
  type GradeHistorySnapshot,
} from "@/utils/gradeHistory";

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
  fillHeight?: boolean;
}

const getChartRange = (values: number[]) => {
  if (values.length === 0) return { min: 0, max: 100 };
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const spread = maxVal - minVal;
  const padding = Math.max(3, spread * 0.2);
  let min = Math.floor(minVal - padding);
  let max = Math.ceil(maxVal + padding);
  if (max - min < 10) {
    const mid = (minVal + maxVal) / 2;
    min = Math.floor(mid - 5);
    max = Math.ceil(mid + 5);
  }
  return { min: Math.max(0, min), max: Math.min(100, max) };
};

const getAxisConfig = (values: number[]) => {
  const range = getChartRange(values);
  const yAxisOffset = Math.max(0, Math.floor(range.min));
  const top = Math.min(100, Math.ceil(range.max));
  const maxValue = Math.max(1, top - yAxisOffset);
  return { yAxisOffset, maxValue };
};

const formatRelativeTime = (dateStr: string, now: number): string => {
  const diffSeconds = Math.max(
    0,
    Math.floor((now - new Date(dateStr).getTime()) / 1000),
  );

  if (diffSeconds < 5) return "Just now";

  if (diffSeconds < 60) {
    let seconds: number;

    if (diffSeconds < 20) seconds = 10;
    else if (diffSeconds < 30) seconds = 20;
    else if (diffSeconds < 40) seconds = 30;
    else if (diffSeconds < 50) seconds = 40;
    else seconds = 50;

    return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return new Date(dateStr).toLocaleDateString();
};

const GradeAverageTracker: React.FC<GradeAverageTrackerProps> = ({
  showTrend = true,
  showCourseCount = true,
  showLastUpdated = false,
  hideMarksUntilTap = false,
  refreshToken,
  fillHeight = false,
}) => {
  const { activeTone, isDark, fontPresetId } = useTheme();
  const { shouldForceVisualHundreds } = useAFoolVisualGrades();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Tablet-sized screens get the tall side-panel chart; phones (including phone
  // landscape) use the compact 2-tab paging layout.
  const isBigScreen = Math.min(screenWidth, screenHeight) >= 600;
  const useFillLayout = fillHeight && isBigScreen;
  const selectedValueFontSize = isBigScreen ? 22 : 17;
  const selectedDateFontSize = isBigScreen ? 13 : 11;
  const selectedRowHeight = isBigScreen ? 30 : 24;

  const [gradeStats, setGradeStats] = useState<GradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealAverage, setRevealAverage] = useState(false);
  const [revealChange, setRevealChange] = useState(false);
  const [history, setHistory] = useState<GradeHistorySnapshot[]>([]);
  const [pageWidth, setPageWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [statsHeight, setStatsHeight] = useState(0);
  const [historyAreaHeight, setHistoryAreaHeight] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [selectedHistoryChartValue, setSelectedHistoryChartValue] = useState<
    number | null
  >(null);
  const [selectedHistoryCapturedAt, setSelectedHistoryCapturedAt] = useState<
    string | null
  >(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (hideMarksUntilTap) {
      setRevealAverage(false);
      setRevealChange(false);
    }
  }, [
    hideMarksUntilTap,
    gradeStats?.currentAverage,
    gradeStats?.previousAverage,
  ]);

  useEffect(() => {
    if (!showLastUpdated || !gradeStats?.lastRetrieved) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [showLastUpdated, gradeStats?.lastRetrieved]);

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
    previous: number | null,
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
            source={require("../assets/images/caret-arrow-up.png")}
            className={`w-4 h-4 object-fill`}
            style={{ tintColor: "#00d492" }}
          />
        );
      case "down":
        return (
          <Image
            source={require("../assets/images/caret-arrow-down.png")}
            className={`w-4 h-4 object-fill`}
            style={{ tintColor: "#d6363f" }}
          />
        );
      case "same":
        return (
          <Image
            source={require("../assets/images/caret-arrow-none.png")}
            className={`w-4 h-4 object-fill`}
            style={{ tintColor: activeTone.accent }}
          />
        );
      default:
        return (
          <Image
            source={require("../assets/images/caret-arrow-up.png")}
            className={`w-4 h-4 object-fill`}
            style={{ tintColor: activeTone.accent }}
          />
        );
    }
  };

  const updateGradeAverage = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // load current courses + trend inputs in one parallel batch; each
      // SecureStore read is a native keychain round trip
      const [
        coursesJson,
        savedLastRetrieved,
        lastKnownStr,
        previousAverageStr,
      ] = await Promise.all([
        SecureStorage.load("ta_courses"),
        SecureStorage.load("marks_last_retrieved").catch(() => null),
        SecureStorage.load("grade_last_known_average").catch(() => null),
        SecureStorage.load("grade_previous_average").catch(() => null),
      ]);
      if (!coursesJson) {
        throw new Error("No courses found in storage");
      }

      const courses: Course[] = JSON.parse(coursesJson);
      // Scope to the active term (summer school included) via the shared helper
      // so the average tile and grade history always agree.
      const scopedCourses = getScopedCourses(courses);
      let currentAverage = calculateAverageFromCourses(scopedCourses);

      let lastRetrieved: string | null = savedLastRetrieved;
      if (!lastRetrieved) {
        try {
          lastRetrieved = await SecureStorage.load("grade_last_updated");
        } catch {
          // no legacy last updated exists
        }
      }

      // Last known current average (to detect actual changes)
      let lastKnownAverage: number | null = lastKnownStr
        ? parseFloat(lastKnownStr)
        : null;

      // Previous average (for trend display - stays until there's a real change)
      let previousAverage: number | null = previousAverageStr
        ? parseFloat(previousAverageStr)
        : null;

      // Check if this is a REAL change (not just a refresh)
      if (currentAverage !== null) {
        const isRealChange =
          lastKnownAverage !== null && lastKnownAverage !== currentAverage;

        if (isRealChange) {
          // Real change detected - update the previous average to the last known value
          if (lastKnownAverage !== null) {
            await SecureStorage.save(
              "grade_previous_average",
              lastKnownAverage.toString(),
            );
            previousAverage = lastKnownAverage; // Update for current calculation
          }
        }

        // Always update the last known current average
        if (lastKnownAverage !== currentAverage) {
          await SecureStorage.save(
            "grade_last_known_average",
            currentAverage.toString(),
          );
        }

        // Handle first-time setup
        if (lastKnownAverage === null && previousAverage === null) {
          await SecureStorage.save(
            "grade_last_known_average",
            currentAverage.toString(),
          );
        }

        // Only update previous average when there's actually a change
        if (previousAverage !== null && previousAverage !== currentAverage) {
          // Keep the old previousAverage, don't overwrite it with currentAverage
        } else if (previousAverage === null) {
          // First time setup
          await SecureStorage.save(
            "grade_previous_average",
            currentAverage.toString(),
          );
        }
      } else {
        previousAverage = null;
      }

      const gradedCourseCount = scopedCourses.filter(
        (course) =>
          course.hasGrade &&
          course.grade !== "See teacher" &&
          !isNaN(parseFloat(course.grade.replace("%", ""))),
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
        err instanceof Error
          ? err.message
          : "Failed to calculate grade average",
      );
      console.error("Error calculating grade average:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateGradeAverage();
    loadGradeHistory().then(setHistory);
  }, [refreshToken]);

  if (loading && !gradeStats) {
    return (
      <View
        className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 mb-4 mt-6 py-9`}
      ></View>
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
  const displayCurrentAverage = shouldForceVisualHundreds
    ? 100
    : gradeStats.currentAverage;
  const displayPreviousAverage =
    gradeStats.previousAverage === null
      ? null
      : shouldForceVisualHundreds
        ? 100
        : gradeStats.previousAverage;
  const displayTrend = shouldForceVisualHundreds ? "same" : gradeStats.trend;
  const hasAverage = displayCurrentAverage !== null;
  const averageColor = hasAverage
    ? displayCurrentAverage < 50
      ? DEFAULT_STATUS_COLORS.danger
      : activeTone.accent
    : activeTone.muted;
  const averageLabel = hasAverage
    ? `${displayCurrentAverage.toFixed(1)}%`
    : "N/A";

  const validHistory = history.filter((s) => s.average !== null).slice(-20);
  const chartData = validHistory.map((snapshot, i) => {
    const date = new Date(snapshot.capturedAt);
    const step = Math.max(1, Math.ceil(validHistory.length / 5));
    const showLabel =
      validHistory.length <= 5 ||
      i % step === 0 ||
      i === validHistory.length - 1;
    return {
      value: snapshot.average!,
      capturedAt: snapshot.capturedAt,
      label: showLabel
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "",
    };
  });
  const historyAxisConfig = getAxisConfig(
    chartData.length >= 2 ? chartData.map((d) => d.value) : [],
  );

  const axisTextColor = isDark ? "#94959c" : "#6d6e77";

  const statsContent = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
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
                backgroundColor={activeTone.bg4}
                progress={hasAverage ? displayCurrentAverage : 0}
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
        {displayPreviousAverage !== null && (
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
                {getTrendIcon(displayTrend)}
                <Text
                  className={`text-2xl font-bold ml-1 ${getTrendColor(displayTrend)}`}
                >
                  {Math.abs(
                    (displayCurrentAverage ?? 0) - displayPreviousAverage,
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
              Last updated{` `}
              {fontPresetId === "JetBrainsMono" ? "\n" : undefined}
              {gradeStats.lastRetrieved
                ? formatRelativeTime(gradeStats.lastRetrieved, now)
                : "NEVER RETRIEVED"}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const landscapeChartHeight = 200;
  // In the landscape side panel the grade average is pinned to the top and the
  // history chart fills whatever vertical space is left below it. Size the chart
  // from the measured history area minus the section's non-chart chrome
  // (header + selected-value row + padding). No x-axis labels to reserve for.
  const filledHistoryChartHeight =
    historyAreaHeight > 0
      ? Math.max(140, historyAreaHeight - 115)
      : landscapeChartHeight;

  const historyChartSection = (chartWidth: number, chartHeight: number) => (
    <View className={`px-4 pb-1 ${isBigScreen ? "pt-5" : "pt-2"}`}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-lg `}
        >
          Grade History
        </Text>
        <Text
          className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-xs`}
        >
          {validHistory.length} snapshot{validHistory.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <View style={{ height: selectedRowHeight, justifyContent: "center" }}>
        {selectedHistoryChartValue !== null && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: averageColor,
                fontWeight: "700",
                fontSize: selectedValueFontSize,
              }}
            >
              {Math.min(
                selectedHistoryChartValue + historyAxisConfig.yAxisOffset,
                100,
              ).toFixed(1)}
              %
            </Text>
            {selectedHistoryCapturedAt && (
              <Text
                style={{
                  color: axisTextColor,
                  fontSize: selectedDateFontSize,
                  marginLeft: 6,
                }}
              >
                {new Date(selectedHistoryCapturedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            )}
          </View>
        )}
      </View>
      {chartData.length >= 2 ? (
        <View className="mt-2 items-center">
          <LineChart
            data={chartData}
            width={chartWidth}
            height={chartHeight}
            color={averageColor}
            thickness={2.5}
            curved
            startFillColor={averageColor}
            endFillColor={averageColor}
            startOpacity={0.28}
            endOpacity={0.03}
            focusEnabled
            onFocus={(item: { value?: number; capturedAt?: string }) => {
              if (typeof item?.value === "number") {
                setSelectedHistoryChartValue(item.value);
                if (item.capturedAt) {
                  setSelectedHistoryCapturedAt(item.capturedAt);
                } else {
                  const actual = item.value + historyAxisConfig.yAxisOffset;
                  const match = validHistory.find(
                    (s) =>
                      s.average !== null && Math.abs(s.average - actual) < 0.11,
                  );
                  setSelectedHistoryCapturedAt(match?.capturedAt ?? null);
                }
              }
            }}
            showStripOnFocus
            unFocusOnPressOut={false}
            focusedDataPointColor={averageColor}
            focusedDataPointRadius={5}
            hideDataPoints={chartData.length > 12}
            dataPointsColor={averageColor}
            dataPointsRadius={3}
            xAxisLabelTextStyle={{ color: "transparent", fontSize: 8 }}
            xAxisLabelsHeight={0}
            noOfSections={3}
            maxValue={historyAxisConfig.maxValue}
            yAxisOffset={historyAxisConfig.yAxisOffset}
            hideYAxisText
            yAxisLabelWidth={0}
            initialSpacing={12}
            endSpacing={12}
            spacing={
              chartData.length > 1
                ? (chartWidth - 24) / (chartData.length - 1)
                : 0
            }
            xAxisColor="transparent"
            yAxisColor="transparent"
            yAxisThickness={0}
            xAxisThickness={1}
            rulesColor={"transparent"}
          />
        </View>
      ) : (
        // Sized to chartHeight (not just centered by content) so this fills
        // and centers within whatever space the chart would've taken — in
        // the landscape side panel that's tall, so bump the icon up too.
        <View
          className="items-center justify-center"
          style={{ height: chartHeight }}
        >
          <Image
            source={require("../assets/images/graph.png")}
            className={chartHeight > 120 ? "w-20 h-20 mb-3" : "w-13 h-13 mb-2"}
            style={{ tintColor: activeTone.accent }}
          />
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-center mb-3`}
          >
            Nothing yet.{`\n`} Let&apos;s make some history!
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <LiquidGlassView
      containerStyle={useFillLayout ? { flex: 1 } : undefined}
      className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-2 mt-1 justify-center`}
      style={useFillLayout ? { flex: 1 } : { minHeight: 158 }}
      fallbackBackgroundColor={activeTone.bg3}
      glassTintColor={activeTone.bg1}
      glassEffectStyle="clear"
    >
      <View
        style={{ flex: 1 }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          const h = e.nativeEvent.layout.height;
          if (w > 0 && w !== pageWidth) setPageWidth(w);
          if (useFillLayout && h > 0 && h !== containerHeight)
            setContainerHeight(h);
        }}
      >
        {useFillLayout ? (
          pageWidth > 0 ? (
            <View style={{ flex: 1 }}>
              <View
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && h !== statsHeight) setStatsHeight(h);
                }}
                className="pt-4 pb-5"
              >
                {statsContent}
              </View>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} mx-4 mb-1 h-px`}
              />
              <View
                style={{ flex: 1, overflow: "hidden" }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && h !== historyAreaHeight) setHistoryAreaHeight(h);
                }}
              >
                {historyChartSection(pageWidth - 36, filledHistoryChartHeight)}
              </View>
            </View>
          ) : (
            <View
              style={{
                paddingVertical: 24,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {statsContent}
            </View>
          )
        ) : // PORTRAIT: paging horizontal scroll
        pageWidth > 0 ? (
          <>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={200}
              onMomentumScrollEnd={(e) => {
                const page = Math.round(
                  e.nativeEvent.contentOffset.x / pageWidth,
                );
                setActivePage(page);
                if (page === 0) {
                  setSelectedHistoryChartValue(null);
                  setSelectedHistoryCapturedAt(null);
                }
              }}
            >
              <View
                style={{
                  width: pageWidth,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {statsContent}
              </View>
              <View style={{ width: pageWidth }}>
                {historyChartSection(pageWidth - 36, 92)}
              </View>
            </ScrollView>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 4,
              }}
            >
              {[0, 1].map((page) => (
                <View
                  key={page}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    marginHorizontal: 3,
                    backgroundColor:
                      activePage === page
                        ? averageColor
                        : isDark
                          ? "#3a3b42"
                          : "#d0d1d8",
                  }}
                />
              ))}
            </View>
          </>
        ) : (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              minHeight: 125,
            }}
          >
            {statsContent}
          </View>
        )}
      </View>
    </LiquidGlassView>
  );
};

export default GradeAverageTracker;
