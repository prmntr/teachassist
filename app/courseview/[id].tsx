import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AnimatedProgressWheel from "react-native-progress-wheel";
import { LineChart, BarChart } from "react-native-gifted-charts";
import TeachAssistAuthFetcher, { SecureStorage } from "../(auth)/taauth";
import {
  calculateOverallMark,
  getCategoryFullName,
  getPerformanceText,
  getProgressColor,
  parseGradeData,
  type ParsedCourseData,
} from "../(components)/GradeParser";

const CourseViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const subjectID = id ? parseInt(id as string, 10) : null;

  const [courseData, setCourseData] = useState<ParsedCourseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Loading...");
  const [userName, setUserName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"courses" | "analytics">(
    "courses"
  );
  const [expandedAssignments, setExpandedAssignments] = useState<Set<number>>(
    new Set()
  );

  const getUser = async () => {
    const userName = await SecureStorage.load("ta_username");
    setUserName(userName);
    return userName;
  };

  const toggleAssignmentExpansion = (index: number) => {
    const newExpanded = new Set(expandedAssignments);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedAssignments(newExpanded);
  };

  const onFetchResult = (result: string) => {
    if (result.includes("Login Failed")) {
      setMessage("Session expired. Please log in again.");
      setTimeout(() => router.replace("/signin"), 2000);
    } else {
      // Parse the HTML and extract course data
      const parsedData = parseGradeData(result);
      setCourseData(parsedData);
      setIsLoading(false);

      if (parsedData.success) {
        setMessage("Course data loaded from network.");
        // Save the raw HTML for future use
        if (subjectID) {
          SecureStorage.save(`course_${subjectID}`, result);
        }
      } else {
        setMessage(`Error parsing course data: ${parsedData.error}`);
      }
    }
  };

  const onError = (error: string) => {
    setMessage(`Error: ${error}`);
    setTimeout(() => router.replace("/signin"), 2000);
  };

  const onLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  useEffect(() => {
    const loadCourseData = async () => {
      const currentUserName = await getUser();

      // Check if this is the test user first
      if (currentUserName?.includes("123456789")) {
        setCourseData({
          assignments: [
            {
              name: "Final Exam",
              categories: {
                K: null,
                T: null,
                C: null,
                A: null,
                O: {
                  score: "42 / 44",
                  percentage: "95%",
                  weight: "20",
                },
              },
            },
            {
              name: "Bad Research Report",
              categories: {
                K: null,
                T: null,
                C: null,
                A: null,
                O: {
                  score: "40 / 65",
                  percentage: "61%",
                  weight: "10",
                },
              },
            },
            {
              name: "Test with good mark",
              categories: {
                K: {
                  score: "7 / 8",
                  percentage: "88%",
                  weight: "10",
                },
                T: {
                  score: "8 / 8",
                  percentage: "100%",
                  weight: "10",
                },
                C: {
                  score: "5 / 5",
                  percentage: "100%",
                  weight: "10",
                },
                A: {
                  score: "8 / 8",
                  percentage: "100%",
                  weight: "10",
                },
                O: null,
              },
            },
            {
              name: "Test with bad mark",
              categories: {
                K: {
                  score: "2 / 10",
                  percentage: "20%",
                  weight: "10",
                },
                T: {
                  score: "5 / 10",
                  percentage: "50%",
                  weight: "10",
                },
                C: {
                  score: "4 / 6",
                  percentage: "66%",
                  weight: "10",
                },
                A: {
                  score: "6 / 10",
                  percentage: "60%",
                  weight: "10",
                },
                O: null,
              },
            },
            {
              name: "Generic test",
              categories: {
                K: {
                  score: "12 / 13",
                  percentage: "92%",
                  weight: "10",
                },
                T: {
                  score: "9 / 9",
                  percentage: "100%",
                  weight: "10",
                },
                C: {
                  score: "6 / 6",
                  percentage: "100%",
                  weight: "10",
                },
                A: {
                  score: "12 / 12",
                  percentage: "100%",
                  weight: "10",
                },
                O: null,
              },
            },
          ],
          summary: {
            term: 92,
            course: 93,
            categories: [
              {
                name: "",
                weighting: "",
                achievement: "",
              },
              {
                name: "Knowledge/Understanding",
                weighting: "35%",
                achievement: "92.9%",
              },
              {
                name: "Thinking",
                weighting: "15%",
                achievement: "95.4%",
              },
              {
                name: "Communication",
                weighting: "15%",
                achievement: "94.7%",
              },
              {
                name: "Application",
                weighting: "35%",
                achievement: "90.4%",
              },
              {
                name: "Other",
                weighting: "0%",
                achievement: "0%",
              },
              {
                name: "Final/Culminating",
                weighting: "30%",
                achievement: "",
              },
            ],
          },
          courseName: "Example Course",
          success: true,
        });
        setIsLoading(false);
        setMessage("Test course data loaded");
        return;
      }

      // Handle regular users
      if (subjectID === null) {
        setMessage("Error: No course ID provided.");
        setIsLoading(false);
        return;
      }

      const cachedHtml = await SecureStorage.load(`course_${subjectID}`);
      if (cachedHtml) {
        // Parse cached HTML data
        const parsedData = parseGradeData(cachedHtml);
        console.log(JSON.stringify(parsedData));
        setCourseData(parsedData);
        setIsLoading(false);

        if (parsedData.success) {
          setMessage(`Last updated ${new Date().toLocaleTimeString()}`);
        } else {
          setMessage(`Error parsing cached data: ${parsedData.error}`);
        }
      } else {
        setMessage(
          `No cached data for course ${subjectID}. Fetching from network...`
        );
        setIsLoading(true);
      }
    };

    loadCourseData();
  }, [subjectID]);

  // Determine if we need to render the fetcher component
  // Only fetch if we have a real user (not test user) and no course data
  const shouldFetch =
    !courseData && isLoading && userName && !userName.includes("123456789");

  const renderTabButton = (tab: "courses" | "analytics", label: string) => (
    <TouchableOpacity
      className={`flex-1 py-3 px-4 rounded-lg ${
        activeTab === tab ? "bg-4" : "bg-3"
      }`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setActiveTab(tab);
      }}
    >
      <Text
        className={`text-center font-semibold ${
          activeTab === tab ? "text-baccent" : "text-appwhite/60"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderCoursesTab = () => (
    <View className="w-full">
      {/* Assignments List */}
      {courseData?.assignments.map((assignment, index) => {
        const isExpanded = expandedAssignments.has(index);

        return (
          <TouchableOpacity
            key={index}
            className="bg-3 rounded-xl p-5 mb-4 shadow-lg"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleAssignmentExpansion(index);
            }}
            activeOpacity={1}
          >
            {/* Header with assignment name and overall mark - Always visible */}
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-appwhite text-xl font-bold mb-1">
                  {assignment.name}
                </Text>
                <Text className="text-appwhite/60 text-sm">
                  {getPerformanceText(
                    calculateOverallMark(assignment.categories)
                  )}
                </Text>
              </View>

              <View className="flex-row items-center">
                <View className="mr-3">
                  <AnimatedProgressWheel
                    size={70}
                    width={6}
                    color={"#2faf7f"}
                    backgroundColor={"#1e1e1e"}
                    progress={
                      calculateOverallMark(assignment.categories) ?? NaN
                    }
                    max={100}
                    rounded={true}
                    rotation={"-90deg"}
                    duration={400}
                    showProgressLabel={true}
                    labelStyle={{
                      color: "#2faf7f",
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                    showPercentageSymbol={true}
                  />
                </View>

                {/* Expand/Collapse Indicator */}
                <Image
                  className="w-6 h-6"
                  style={{
                    tintColor: "#edebea",
                    transform: [{ rotate: isExpanded ? "90deg" : "0deg" }],
                  }}
                  source={require("../../assets/images/arrow-icon.png")}
                />
              </View>
            </View>

            {/* Expanded Content - Only visible when expanded */}
            {isExpanded && (
              <>
                {/* Category Progress Bars */}
                <View className="space-y-3 mt-4">
                  {Object.entries(assignment.categories).map(([key, value]) =>
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
                        <View className="rounded-full h-2 overflow-hidden">
                          <View
                            className={`h-full rounded-full ${getProgressColor(
                              parseInt(value.percentage.replace("%", ""))
                            )}`}
                            style={{
                              width: `${Math.min(
                                parseInt(value.percentage.replace("%", "")),
                                100
                              )}%`,
                            }}
                          />
                        </View>

                        {/* Weight and Score Information */}
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

                {/* Footer with Performance Indicator */}
                <View className="mt-4 pt-4 border-t  border-[#292929]">
                  <View className="flex-row items-center justify-center">
                    <Text className="text-appwhite/60 text-xs">
                      {
                        Object.values(assignment.categories).filter(
                          (cat) => cat !== null
                        ).length
                      }{" "}
                      {Object.values(assignment.categories).filter(
                        (cat) => cat !== null
                      ).length === 1
                        ? "category"
                        : "categories"}{" "}
                      graded
                    </Text>
                  </View>
                </View>
              </>
            )}
          </TouchableOpacity>
        );
      })}

      {/* No Assignments Found */}
      {courseData?.assignments.length === 0 && (
        <View className="bg-3 rounded-xl p-6 text-center">
          <Text className="text-appwhite/60 text-center">
            No assignments found for this course.
          </Text>
        </View>
      )}
    </View>
  );

  const renderAnalyticsTab = () => {
    if (!courseData?.assignments || courseData.assignments.length === 0) {
      return (
        <View className="bg-3 rounded-xl p-6 text-center">
          <Text className="text-appwhite/60 text-center text-lg">
            No data available for analytics
          </Text>
        </View>
      );
    }

    // Prepare chart data helper functions
    const getCategoryLineData = (categoryKey: string) => {
      return courseData.assignments
        .map((assignment, index) => {
          const category = assignment.categories[categoryKey];
          return {
            value: category
              ? parseInt(category.percentage.replace("%", ""))
              : 0,
            label: (index + 1).toString(),
            labelTextStyle: { color: "#edebea", fontSize: 10 },
          };
        })
        .filter((item) => item.value > 0);
    };

    const assignmentData = courseData.assignments.map((assignment, index) => ({
      value: calculateOverallMark(assignment.categories) || 0,
      label: `${index + 1}`,
      frontColor: "#27b1fa",
      gradientColor: "#2faf7f",
      topLabelComponent: () => (
        <Text style={{ color: "#edebea", fontSize: 10, marginBottom: 2 }}>
          {Math.round(calculateOverallMark(assignment.categories) || 0)}%
        </Text>
      ),
    }));

    const overallLineData = courseData.assignments.map((assignment, index) => ({
      value: calculateOverallMark(assignment.categories) || 0,
      label: (index + 1).toString(),
      labelTextStyle: { color: "#edebea", fontSize: 10 },
    })).reverse();


    const categories = [
      { key: "K", name: "Knowledge/Understanding", color: "#27b1fa" },
      { key: "T", name: "Thinking", color: "#2faf7f" },
      { key: "C", name: "Communication", color: "#f59e0b" },
      { key: "A", name: "Application", color: "#ef4444" },
    ];

    return (
      <View className="w-full">
        {/* Grade Progression Line Chart */}
        <View className="bg-3 rounded-xl p-4 mb-6">
          <Text className="text-appwhite text-xl font-bold mb-4">
            Grade Progression
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-1">
              <LineChart
                data={overallLineData}
                height={180}
                color="#27b1fa"
                thickness={3}
                startFillColor="#27b1fa"
                endFillColor="#2faf7f"
                startOpacity={0.3}
                endOpacity={0.1}
                curved
                dataPointsColor="#27b1fa"
                dataPointsRadius={5}
                hideDataPoints={false}
                textColor="#edebea"
                textFontSize={10}
                yAxisTextStyle={{ color: "#edebea", fontSize: 10 }}
                xAxisLabelTextStyle={{ color: "#27b1fa" }}
                rulesColor="#4a5568"
                rulesType="solid"
                yAxisLabelSuffix="%"
                maxValue={100}
                areaChart
                noOfSections={4}
                hideRules={true}
                xAxisThickness={0}
                yAxisThickness={0}
              />
            </View>
          </ScrollView>
        </View>

        <Text className="text-appwhite text-xl font-bold mb-1">
          Learning Categories
        </Text>
        {/* Individual Category Line Charts */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6"
        >
          <View className="flex-row">
            {categories.map((category) => {
              const categoryData = getCategoryLineData(category.key);
              if (categoryData.length === 0) return null;

              return (
                <View
                  key={category.key}
                  className="bg-3 rounded-xl p-4 mr-4"
                  style={{ width: 280 }}
                >
                  <Text className="text-appwhite text-lg font-bold mb-3">
                    {category.name}
                  </Text>
                  <LineChart
                    data={categoryData}
                    width={240}
                    height={150}
                    spacing={categoryData.length > 4 ? 35 : 45}
                    initialSpacing={15}
                    endSpacing={15}
                    color={category.color}
                    thickness={3}
                    curved
                    dataPointsColor={category.color}
                    dataPointsRadius={4}
                    hideDataPoints={false}
                    textColor="#edebea"
                    textFontSize={10}
                    xAxisColor="#4a5568"
                    yAxisColor="#4a5568"
                    yAxisTextStyle={{ color: "#edebea", fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: "transparent" }}
                    rulesColor="#4a5568"
                    yAxisLabelSuffix="%"
                    maxValue={100}
                    noOfSections={4}
                    hideRules={true}
                    xAxisThickness={0}
                    yAxisThickness={0}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Assignment Scores Bar Chart */}
        <View className="bg-3 rounded-xl p-4 mb-6">
          <Text className="text-appwhite text-xl font-bold mb-4">
            Assignment Overview
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="mr-4 flex items-center justify-center">
              <BarChart
                data={assignmentData}
                height={180}
                barWidth={30}
                spacing={12}
                roundedTop
                hideRules={true}
                xAxisThickness={0}
                yAxisThickness={0}
                xAxisColor="#292929"
                yAxisColor="#292929"
                yAxisTextStyle={{ color: "#edebea", fontSize: 10 }}
                xAxisLabelTextStyle={{ color: "transparent" }}
                noOfSections={4}
                maxValue={100}
                yAxisLabelSuffix="%"
                isAnimated
                animationDuration={600}
                initialSpacing={15}
                endSpacing={15}
              />
            </View>
          </ScrollView>
        </View>

        {/* Performance Summary */}
        <View className="bg-3 rounded-xl p-4">
          <Text className="text-appwhite text-xl font-bold mb-4">
            Performance Summary
          </Text>

          <View className="flex-row justify-between mb-3">
            <Text className="text-appwhite/70">Highest Score:</Text>
            <Text className="text-green-400 font-bold">
              {Math.max(
                ...courseData.assignments.map(
                  (a) => calculateOverallMark(a.categories) || 0
                )
              )}
              %
            </Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-appwhite/70">Lowest Score:</Text>
            <Text className="text-red-400 font-bold">
              {Math.min(
                ...courseData.assignments.map(
                  (a) => calculateOverallMark(a.categories) || 0
                )
              )}
              %
            </Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-appwhite/70">Average:</Text>
            <Text className="text-blue-400 font-bold">
              {Math.round(
                courseData.assignments.reduce(
                  (sum, a) => sum + (calculateOverallMark(a.categories) || 0),
                  0
                ) / courseData.assignments.length
              )}
              %
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-appwhite/70">Total Assignments:</Text>
            <Text className="text-appwhite font-bold">
              {courseData.assignments.length}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="bg-2 flex-1">
      <TouchableOpacity
        className="absolute top-15 left-5 flex flex-row items-center gap-2 bg-gray-700/80 rounded-lg px-4 py-2 shadow-lg z-50 backdrop-blur-xl"
        onPress={() => {
          router.replace("/courses");
        }}
      >
        <Image
          className="w-8 h-8"
          style={{ tintColor: "#edebea" }}
          source={require("../../assets/images/arrow-icon-left.png")}
        />
        <Text className="text-white font-semibold text-lg">Back</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="pt-20 px-5 pb-10 mt-13">
          <Text className="text-center text-appwhite text-4xl font-semibold">
            {isLoading && !courseData
              ? "Loading..."
              : courseData?.courseName || "Course"}
          </Text>
          <Text className=" text-center rounded-lg font-medium mb-5 text-appwhite/70">
            {message}
          </Text>

          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#27b1fa" />
              {shouldFetch && subjectID !== null && (
                <View style={{ display: "none" }}>
                  <TeachAssistAuthFetcher
                    fetchWithCookies
                    subjectID={subjectID}
                    onResult={onFetchResult}
                    onError={onError}
                    onLoadingChange={onLoadingChange}
                  />
                </View>
              )}
            </>
          ) : courseData && courseData.success ? (
            <View className="w-full">
              {/* grade summary */}
              {courseData.summary && (
                <View className="mb-6 flex-row justify-around bg-3 shadow-lg p-3 pt-6 pb-5 rounded-xl">
                  {courseData.summary.term && (
                    <View className="items-center">
                      <AnimatedProgressWheel
                        size={100}
                        width={10}
                        color={"#27b1fa"}
                        backgroundColor={"#1e1e1e"}
                        progress={
                          !courseData.summary.term ||
                          courseData.summary.term === 0
                            ? NaN
                            : courseData.summary.term
                        }
                        max={100}
                        rounded={true}
                        rotation={"-90deg"}
                        duration={400}
                        showProgressLabel={true}
                        labelStyle={{
                          color: "#27b1fa",
                          fontSize: 20,
                          fontWeight: "600",
                        }}
                        showPercentageSymbol={true}
                      />
                      <Text className="text-appwhite/70 text-lg font-semibold mt-2">
                        Term Average
                      </Text>
                    </View>
                  )}
                  <View className="items-center">
                    <AnimatedProgressWheel
                      size={100}
                      width={10}
                      color={"#2faf7f"}
                      backgroundColor={"#1e1e1e"}
                      progress={
                        !courseData.summary.course ||
                        courseData.summary.course === 0
                          ? NaN
                          : courseData.summary.course
                      }
                      max={100}
                      rounded={true}
                      rotation={"-90deg"}
                      duration={400}
                      showProgressLabel={true}
                      labelStyle={{
                        color: "#2faf7f",
                        fontSize: 20,
                        fontWeight: "600",
                      }}
                      showPercentageSymbol={true}
                    />
                    <Text className="text-appwhite/70 text-lg font-semibold mt-2">
                      Course Average
                    </Text>
                  </View>
                </View>
              )}

              {/* Tab Navigation */}
              <View className="flex-row mb-6 gap-2 bg-3 p-3 rounded-lg">
                {renderTabButton("courses", "Courses")}
                {renderTabButton("analytics", "Analytics")}
              </View>

              {/* Tab Content */}
              {activeTab === "courses"
                ? renderCoursesTab()
                : renderAnalyticsTab()}
            </View>
          ) : (
            /* Error State */
            <View className="bg-red-500/20 border-red-500/30 border rounded-xl p-6">
              <Text className="text-red-400 text-center text-lg font-semibold mb-2">
                Unable to Load Course Data
              </Text>
              <Text className="text-red-400/80 text-center">
                {courseData?.error ||
                  "Unknown error occurred while parsing course data."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default CourseViewScreen;
