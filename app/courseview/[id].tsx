import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import AnimatedProgressWheel from "react-native-progress-wheel";
import TeachAssistAuthFetcher, { SecureStorage } from "../(auth)/taauth";
import BackButton from "../(components)/Back";
import {
  calculateOverallMark,
  getCategoryFullName,
  getPerformanceText,
  getProgressColor,
  parseGradeData,
  type ParsedCourseData,
} from "../(components)/GradeParser";
import { useTheme } from "../contexts/ThemeContext";

const CourseViewScreen = () => {
  // no check for internet needed b/c cached from first view and course page blocks refresh that clears this
  const router = useRouter();
  const { isDark } = useTheme();
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
  const [courseUrl, setCourseUrl] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignmentIndex, setEditingAssignmentIndex] = useState<
    number | null
  >(null);

  const getUser = async () => {
    const userName = await SecureStorage.load("ta_username");
    setUserName(userName);
    return userName;
  };

  // calc course average including added ones
  const calculateCourseAverage = () => {
    if (!courseData?.assignments || courseData.assignments.length === 0) {
      return courseData?.summary?.course || 0;
    }

    // filter formative assignments for course average calculation
    const gradedAssignments = courseData.assignments.filter(
      (assignment) => !assignment.formative
    );

    if (gradedAssignments.length === 0) {
      return courseData?.summary?.course || 0;
    }

    const total = gradedAssignments.reduce((sum, assignment) => {
      const mark = calculateOverallMark(assignment.categories);
      return sum + (mark || 0);
    }, 0);

    return Math.round(total / gradedAssignments.length);
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

  const addAssignment = (assignmentData: any) => {
    if (!courseData) return;

    const newAssignment = {
      name: assignmentData.name,
      categories: assignmentData.categories,
      formative: assignmentData.formative || false,
    };

    setCourseData({
      ...courseData,
      assignments: [...courseData.assignments, newAssignment],
    });

    setShowAssignmentModal(false);
    setShowAddAssignment(false);
  };

  const editAssignment = (index: number, assignmentData: any) => {
    if (!courseData) return;

    const updatedAssignments = [...courseData.assignments];
    updatedAssignments[index] = {
      ...updatedAssignments[index],
      name: assignmentData.name,
      categories: assignmentData.categories,
      formative: assignmentData.formative,
    };

    setCourseData({
      ...courseData,
      assignments: updatedAssignments,
    });

    setEditingAssignmentIndex(null);
  };

  const deleteAssignment = (index: number) => {
    if (!courseData) return;

    const updatedAssignments = courseData.assignments.filter(
      (_, i) => i !== index
    );
    setCourseData({
      ...courseData,
      assignments: updatedAssignments,
    });

    // remove from expanded if it was expanded
    const newExpanded = new Set(expandedAssignments);
    newExpanded.delete(index);
    // Update indices for remaining expanded items
    const updatedExpanded = new Set<number>();
    newExpanded.forEach((expandedIndex) => {
      if (expandedIndex < index) {
        updatedExpanded.add(expandedIndex);
      } else if (expandedIndex > index) {
        updatedExpanded.add(expandedIndex - 1);
      }
    });
    setExpandedAssignments(updatedExpanded);
  };

  const onFetchResult = (result: string) => {
    if (result.includes("Login Failed")) {
      setMessage("Session expired. Please log in again.");
      setTimeout(() => router.replace("/signin"), 2000);
    } else if (
      result
        .toLowerCase()
        .includes("have reports that are available for viewing")
    ) {
      setMessage(
        "Course data has been recently updated. Please refresh to see the latest information."
      );
      setIsLoading(false);
    } else if (result.length < 200) {
      // something is wrong
      setMessage("Received incomplete data. Please try again.");
      setIsLoading(false);
    } else {
      // normal
      const parsedData = parseGradeData(result);
      setCourseData(parsedData);
      setIsLoading(false);

      if (parsedData.success) {
        setMessage(`Freshly Retrieved ${new Date().toLocaleTimeString()}`);
        // cache html
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

  // make the url to send
  const buildCourseUrl = async (subjectId: number): Promise<string | null> => {
    try {
      const savedStudentId = await SecureStorage.load("ta_student_id");
      const savedSchoolId = await SecureStorage.load("school_id");

      if (!savedStudentId || !savedSchoolId) {
        console.error("Missing student ID or school ID");
        return null;
      }

      const url = `https://ta.yrdsb.ca/live/students/viewReport.php?subject_id=${subjectId}&student_id=${savedStudentId}&school_id=${savedSchoolId}`;
      return url;
    } catch (error) {
      console.error("Error building course URL:", error);
      return null;
    }
  };

  // Types for assignment modal
  type CategoryKey = "K" | "T" | "C" | "A" | "O";

  interface CategoryState {
    percentage: string;
    weight: string;
    enabled: boolean;
  }

  type CategoriesState = Record<CategoryKey, CategoryState>;

  // assignment modal
  const AssignmentModal = ({
    visible,
    onClose,
    onSave,
    initialData = null,
  }: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
  }) => {
    const [assignmentName, setAssignmentName] = useState(
      initialData?.name || ""
    );
    const [isFormative, setIsFormative] = useState(
      initialData?.formative || false
    );
    const [categories, setCategories] = useState<CategoriesState>({
      K: initialData?.categories.K
        ? {
            percentage: initialData.categories.K.percentage.replace("%", ""),
            weight: initialData.categories.K.weight || "",
            enabled: true,
          }
        : { percentage: "", weight: "", enabled: false },
      T: initialData?.categories.T
        ? {
            percentage: initialData.categories.T.percentage.replace("%", ""),
            weight: initialData.categories.T.weight || "",
            enabled: true,
          }
        : { percentage: "", weight: "", enabled: false },
      C: initialData?.categories.C
        ? {
            percentage: initialData.categories.C.percentage.replace("%", ""),
            weight: initialData.categories.C.weight || "",
            enabled: true,
          }
        : { percentage: "", weight: "", enabled: false },
      A: initialData?.categories.A
        ? {
            percentage: initialData.categories.A.percentage.replace("%", ""),
            weight: initialData.categories.A.weight || "",
            enabled: true,
          }
        : { percentage: "", weight: "", enabled: false },
      O: initialData?.categories.O
        ? {
            percentage: initialData.categories.O.percentage.replace("%", ""),
            weight: initialData.categories.O.weight || "",
            enabled: true,
          }
        : { percentage: "", weight: "", enabled: false },
    });

    const handleSave = () => {

      let finalCategories: any = {};

      (Object.entries(categories) as [CategoryKey, CategoryState][]).forEach(
        ([key, value]) => {
          if (
            value.enabled &&
            value.percentage &&
            !isNaN(parseInt(value.percentage))
          ) {
            finalCategories[key] = {
              percentage: `${value.percentage}%`,
              weight: value.weight,
              score: `${value.percentage}/100`,
            };
          } else {
            finalCategories[key] = null;
          }
        }
      );

      onSave({
        name: !assignmentName.trim() ? "Untitled Assignment" : assignmentName,
        categories: finalCategories,
        formative: isFormative,
      });

      // Reset form
      setAssignmentName("");
      setIsFormative(false);
      setCategories({
        K: { percentage: "", weight: "", enabled: false },
        T: { percentage: "", weight: "", enabled: false },
        C: { percentage: "", weight: "", enabled: false },
        A: { percentage: "", weight: "", enabled: false },
        O: { percentage: "", weight: "", enabled: false },
      });
    };

    return (
      <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl py-6 w-full max-w-md`}
            style={{
              maxHeight: "80%",
              minHeight: "70%",
            }}
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-4 px-6`}
            >
              {initialData ? "Edit Assignment" : "Add Assignment"}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              <View className="mb-7 px-6">
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2 font-medium`}
                >
                  Assignment Name
                </Text>
                <TextInput
                  className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded-lg p-3`}
                  value={assignmentName}
                  onChangeText={setAssignmentName}
                  placeholder="my great assignment"
                  placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
                />
              </View>

              {/* Formative Toggle */}
              <View className="mb-7 mx-6">
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md font-medium`}
                  >
                    Formative Assignment
                  </Text>
                  <TouchableOpacity
                    className={`w-12 h-6 rounded-full ${isFormative ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setIsFormative(!isFormative);
                    }}
                  >
                    <View
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                        isFormative ? "ml-6" : "ml-0.5"
                      }`}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm mt-1`}
                >
                  Formative assignments have a weight of 0.
                </Text>
              </View>

              <View className="mb-4 px-6">
                {(
                  Object.entries(categories) as [CategoryKey, CategoryState][]
                ).map(([key, value]) => (
                  <View key={key} className="mb-5">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className={`${isDark ? "text-appgraylight" : "text-appgraydark"} font-medium`}
                      >
                        {getCategoryFullName(key)}
                      </Text>
                      <TouchableOpacity
                        className={`w-8 h-8 rounded ${value.enabled ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} items-center justify-center`}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium
                          );
                          setCategories((prev) => ({
                            ...prev,
                            [key]: {
                              ...prev[key],
                              enabled: !prev[key].enabled,
                            },
                          }));
                        }}
                      >
                        {value.enabled && (
                          <Image
                            source={require("../../assets/images/checkmark.png")}
                            className={`w-6 h-6`}
                            style={{
                              tintColor: "#fafafa",
                            }}
                          />
                        )}
                      </TouchableOpacity>
                    </View>

                    {value.enabled && (
                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <Text
                            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-xs mb-1`}
                          >
                            Grade (%)
                          </Text>
                          <TextInput
                            className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded p-2 text-sm`}
                            value={value.percentage}
                            onChangeText={(text) => {
                              const num = parseInt(text);
                              if (!isNaN(num)) {
                                setCategories((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    percentage: Math.max(
                                      0,
                                      Math.min(100, num)
                                    ).toString(),
                                  },
                                }));
                              } else if (text === "") {
                                setCategories((prev) => ({
                                  ...prev,
                                  [key]: { ...prev[key], percentage: "" },
                                }));
                              }
                            }}
                            placeholder="0"
                            placeholderTextColor={
                              isDark ? "#85868e" : "#6d6e77"
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-xs mb-1`}
                          >
                            Weight
                          </Text>
                          <TextInput
                            className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded p-2 text-sm`}
                            value={value.weight}
                            onChangeText={(text) => {
                              const num = parseInt(text);
                              if (!isNaN(num)) {
                                setCategories((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    weight: Math.max(0, num).toString(),
                                  },
                                }));
                              } else if (text === "") {
                                setCategories((prev) => ({
                                  ...prev,
                                  [key]: { ...prev[key], weight: "" },
                                }));
                              }
                            }}
                            placeholder="0"
                            placeholderTextColor={
                              isDark ? "#85868e" : "#6d6e77"
                            }
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>

            <View className="flex-row gap-3 mt-4 px-6">
              <TouchableOpacity
                className={`flex-1 ${isDark ? "bg-dark4" : "bg-light4"} rounded-lg p-3`}
                onPress={() => {
                  onClose();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-center font-medium`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-baccent rounded-lg p-3"
                onPress={() => {
                  handleSave();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Text className="text-white text-center font-medium">
                  {initialData ? "Save Changes" : "Add Assignment"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  useEffect(() => {
    const loadCourseData = async () => {
      const currentUserName = await getUser();

      // test users courses
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

      // reg users
      if (subjectID === null) {
        setMessage("Error: No course ID provided.");
        setIsLoading(false);
        return;
      }

      // first look to see if there is cached
      const cachedHtml = await SecureStorage.load(`course_${subjectID}`);

      // see if its html
      const isValidHtml =
        cachedHtml &&
        cachedHtml.includes("<html") &&
        cachedHtml.includes("</html>");

      if (isValidHtml) {
        console.log("Found valid cached HTML, parsing...");
        // parse
        const parsedData = parseGradeData(cachedHtml);
        console.log("Parsed cached data:", JSON.stringify(parsedData, null, 2));
        setCourseData(parsedData);
        setIsLoading(false);

        if (parsedData.success) {
          // cached, dont say last updated
          setMessage(`View your marked assignments`);
        } else {
          setMessage(`Error parsing cached data: ${parsedData.error}`);
          // if parse failed, clear and just fetch fresh data
          await SecureStorage.delete(`course_${subjectID}`);
        }
      }

      // no good cached data
      // TODO: fix
      if (!isValidHtml) {
        setMessage(`Fetching course data from server...`);

        // make url
        const url = await buildCourseUrl(subjectID);
        if (url) {
          setCourseUrl(url);
          setIsLoading(true);
        } else {
          setMessage(
            "Error: Could not build course URL. Please try logging in again."
          );
          setIsLoading(false);
        }
      }
    };

    loadCourseData();
  }, [subjectID]);

  // choose if we need to render the fetcher component
  // only fetch if we have a real user (not test user), no course data, and a course URL to fetch
  const shouldFetch =
    courseUrl &&
    !courseData &&
    isLoading &&
    userName &&
    !userName.includes("123456789");

  const renderTabButton = (tab: "courses" | "analytics", label: string) => (
    <TouchableOpacity
      className={`flex-1 py-3 px-4 rounded-lg ${
        activeTab === tab
          ? isDark
            ? "bg-dark4"
            : "bg-light4"
          : isDark
            ? "bg-dark3"
            : "bg-light3"
      }`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setActiveTab(tab);
      }}
    >
      <Text
        className={`text-center font-semibold ${
          activeTab === tab
            ? "text-baccent"
            : `${isDark ? "text-light3" : "text-dark3"}`
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderCoursesTab = () => (
    <View className={`w-full`}>
      {courseData?.assignments.map((assignment, index) => {
        const isExpanded = expandedAssignments.has(index);

        return (
          <TouchableOpacity
            key={index}
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-5 mb-4 shadow-lg`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleAssignmentExpansion(index);
            }}
            activeOpacity={1}
          >
            <View className={`flex-row justify-between items-center`}>
              <View className={`flex-1`}>
                {assignment.formative && (
                  <Text
                    className={`text-baccent text-xs font-semibold mb-1 uppercase tracking-wide`}
                  >
                    Formative
                  </Text>
                )}
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-1`}
                >
                  {assignment.name}
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm font-light`}
                >
                  {getPerformanceText(
                    calculateOverallMark(assignment.categories)
                  )}
                </Text>
              </View>

              <View className={`flex-row items-center`}>
                <View className={`mr-3`}>
                  <AnimatedProgressWheel
                    size={70}
                    width={6}
                    color={
                      calculateOverallMark(assignment.categories) >= 50
                        ? "#2faf7f"
                        : "#d6363f"
                    }
                    backgroundColor={isDark ? "#232427" : "#e7e7e9"}
                    progress={
                      calculateOverallMark(assignment.categories) ?? NaN
                    }
                    max={100}
                    rounded={true}
                    rotation={"-90deg"}
                    delay={75}
                    duration={400}
                    showProgressLabel={true}
                    labelStyle={{
                      color:
                        calculateOverallMark(assignment.categories) >= 50
                          ? "#2faf7f"
                          : "#d6363f",
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                    showPercentageSymbol={true}
                  />
                </View>

                {/* button to make big/small */}
                <Image
                  className={`w-6 h-6`}
                  style={{
                    tintColor: `${isDark ? "#85868e" : "#6d6e77"}`,
                    transform: [{ rotate: isExpanded ? "90deg" : "0deg" }],
                  }}
                  source={require("../../assets/images/arrow-icon.png")}
                />
              </View>
            </View>

            {isExpanded && (
              <>
                <View className={`space-y-3 mt-4`}>
                  {Object.entries(assignment.categories).map(([key, value]) =>
                    value ? (
                      <View key={key} className={`mb-3`}>
                        <View
                          className={`flex-row justify-between items-center mb-1`}
                        >
                          <Text
                            className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-sm`}
                          >
                            {getCategoryFullName(key)}
                          </Text>
                          <View className={`flex-row items-center`}>
                            <Text
                              className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-bold`}
                            >
                              {value.percentage}
                            </Text>
                          </View>
                        </View>

                        <View
                          className={`rounded-full h-2 overflow-hidden ${isDark ? "bg-dark4" : "bg-light4"}`}
                        >
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

                        <View
                          className={`flex-row justify-between items-center mt-1`}
                        >
                          {value.weight && (
                            <Text
                              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm`}
                            >
                              Weight: {value.weight}
                            </Text>
                          )}
                          <Text
                            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm`}
                          >
                            {value.score}
                          </Text>
                        </View>
                      </View>
                    ) : null
                  )}
                </View>
                <View
                  className={`mt-4 pt-4 border-t border-1 ${isDark ? "border-appgraydark" : "border-appgraylight"}`}
                >
                  <View className={`flex-row items-center justify-center mb-3`}>
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-xs font-light`}
                    >
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

                  {/* edit and delete btns */}
                  {isEditMode && (
                    <View className="flex-row gap-3 mt-2">
                      <TouchableOpacity
                        className={`flex-1 ${isDark ? "bg-dark4" : "bg-light4"} rounded-lg p-3 flex-row items-center justify-center gap-2`}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium
                          );
                          setEditingAssignmentIndex(index);
                        }}
                      >
                        <Image
                          className="w-4 h-4"
                          style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
                          source={require("../../assets/images/pencil.png")}
                        />
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"} font-medium`}
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-danger/20 rounded-lg p-3 flex-row items-center justify-center gap-2"
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Heavy
                          );
                          deleteAssignment(index);
                        }}
                      >
                        <Image
                          className="w-4 h-4"
                          style={{ tintColor: "#ef4444" }}
                          source={require("../../assets/images/trash-bin.png")}
                        />
                        <Text className="text-danger font-medium">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
        );
      })}

      {/* no assignments */}
      {courseData?.assignments.length === 0 && (
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 text-center`}
        >
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-center`}
          >
            No assignments found for this course.
          </Text>
        </View>
      )}
    </View>
  );

  const renderAnalyticsTab = () => {
    const gradedAssignments =
      courseData?.assignments.filter((assignment) => !assignment.formative) ||
      [];
    if (
      !courseData?.assignments ||
      courseData.assignments.length === 0 ||
      gradedAssignments.length === 0
    ) {
      // i cant add shadows to this wtffffff
      return (
        <View className="">
          <View
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 text-center items-center flex-1 pb-10`}
          >
            <Image
              source={require("../../assets/images/not_found.png")}
              className={`w-30 h-30 my-3`}
              style={{ tintColor: "#27b1fa" }}
            />
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgrayblack"} text-center text-md`}
            >
              No summative assignments to analyze.{`\n`}Try tapping the pencil
              icon to add custom assignments!
            </Text>
          </View>
        </View>
      );
    }
    const hasLearningCategories = gradedAssignments.some(
      (assignment) =>
        assignment.categories.K ||
        assignment.categories.T ||
        assignment.categories.C ||
        assignment.categories.A
    );

    if (!hasLearningCategories) {
      // wtffffff
      return (
        <View className="">
          <View
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 text-center items-center flex-1 pb-10`}
          >
            <Image
              source={require("../../assets/images/not_found.png")}
              className={`w-30 h-30 my-3`}
              style={{ tintColor: "#27b1fa" }}
            />
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgrayblack"} text-center text-md`}
            >
              No learning categories found in assignments.{`\n`}Analytics work
              best with at least 1 category.
            </Text>
          </View>
        </View>
      );
    }

    const getCategoryLineData = (categoryKey: string) => {
      const categoryAssignments = gradedAssignments
        .map((assignment, index) => ({
          assignment,
          index,
          category: assignment.categories[categoryKey],
        }))
        .filter((item) => item.category !== null);

      return categoryAssignments.map((item, arrayIndex) => {
        // get avg for this category up to this point
        const assignmentsUpToHere = categoryAssignments.slice(
          0,
          arrayIndex + 1
        );
        const cumulativeAverage = Math.round(
          assignmentsUpToHere.reduce((sum, a) => {
            const percentage = a.category
              ? parseInt(a.category.percentage.replace("%", ""))
              : 0;
            return sum + percentage;
          }, 0) / assignmentsUpToHere.length
        );

        return {
          value: cumulativeAverage,
          label: (arrayIndex + 1).toString(),
          labelTextStyle: { color: "#edebea", fontSize: 10 },
        };
      });
    };

    const assignmentData = gradedAssignments.map((assignment, index) => ({
      value: calculateOverallMark(assignment.categories) || 0,
      label: `${index + 1}`,
      frontColor: "#27b1fa",
      gradientColor: "#2faf7f",
      topLabelComponent: () => (
        <Text style={{ color: "#edebea", fontSize: 10, marginBottom: 2 }}>
          {calculateOverallMark(assignment.categories) || 0}%
        </Text>
      ),
    }));

    // cumulative
    const overallLineData = gradedAssignments.map((assignment, index) => {
      // Calculate cumulative average up to this point
      const assignmentsUpToHere = gradedAssignments.slice(0, index + 1);
      const cumulativeAverage = Math.round(
        assignmentsUpToHere.reduce(
          (sum, a) => sum + (calculateOverallMark(a.categories) || 0),
          0
        ) / assignmentsUpToHere.length
      );

      return {
        value: cumulativeAverage,
        label: (index + 1).toString(),
        labelTextStyle: { color: "#edebea", fontSize: 10 },
      };
    });
    console.log(overallLineData);

    const categories = [
      { key: "K", name: "Knowledge/Understanding", color: "#27b1fa" },
      { key: "T", name: "Thinking", color: "#2faf7f" },
      { key: "C", name: "Communication", color: "#f59e0b" },
      { key: "A", name: "Application", color: "#ef4444" },
    ];

    return (
      <View className={`w-full`}>
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 mb-6 shadow-md`}
        >
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-4`}
          >
            Grade Progression
          </Text>
          <ScrollView showsHorizontalScrollIndicator={false}>
            <View className={`flex-1 pb-3`}>
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
                yAxisTextStyle={{
                  color: `${isDark ? "#edebea" : "#2f3035"}`,
                  fontSize: 11,
                }}
                xAxisLabelsHeight={0}
                rulesColor="#4a5568"
                rulesType="solid"
                yAxisLabelSuffix="%"
                maxValue={100}
                noOfSections={4}
                hideRules={true}
                xAxisThickness={0}
                yAxisThickness={0}
                formatYLabel={(value) => `${Math.round(Number(value))}`}
              />
            </View>
          </ScrollView>
        </View>

        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-1`}
        >
          Learning Categories
        </Text>
        <View className="flex shadow-md">
          {!categories ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className={`mb-6`}
            >
              <View
                className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 mr-4 pb-7`}
                style={{ width: 280 }}
              >
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-bold mb-3`}
                >
                  No categories available
                </Text>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className={`mb-6`}
            >
              <View className={`flex-row`}>
                {categories.map((category) => {
                  const categoryData = getCategoryLineData(category.key);
                  if (categoryData.length === 0) return null;

                  return (
                    <View
                      key={category.key}
                      className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 mr-4 pb-7`}
                      style={{ width: 280 }}
                    >
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-bold mb-3`}
                      >
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
                        disableScroll={true}
                        onlyPositive={true}
                        textColor="#edebea"
                        textFontSize={10}
                        xAxisColor="#4a5568"
                        yAxisColor="#4a5568"
                        yAxisTextStyle={{
                          color: `${isDark ? "#edebea" : "#2f3035"}`,
                          fontSize: 11,
                        }}
                        xAxisLabelsHeight={0}
                        rulesColor="#4a5568"
                        yAxisLabelSuffix="%"
                        maxValue={100}
                        noOfSections={4}
                        hideRules={true}
                        xAxisThickness={0}
                        yAxisThickness={0}
                        formatYLabel={(value) => `${Math.round(Number(value))}`}
                      />
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 pb-1 mb-6 shadow-md`}
        >
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-4`}
          >
            Assignment Overview
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className={`mr-4 flex items-center justify-center`}>
              <BarChart
                data={assignmentData}
                height={180}
                barWidth={30}
                spacing={12}
                roundedTop
                hideRules={true}
                disableScroll={true}
                xAxisThickness={0}
                yAxisThickness={0}
                xAxisColor="#292929"
                yAxisColor="#292929"
                yAxisTextStyle={{
                  color: `${isDark ? "#edebea" : "#2f3035"}`,
                  fontSize: 11,
                }}
                topLabelTextStyle={{
                  color: `${isDark ? "#edebea" : "#2f3035"}`,
                  fontSize: 13,
                }}
                showValuesAsTopLabel
                xAxisLabelTextStyle={{ color: "transparent" }}
                noOfSections={4}
                maxValue={100}
                yAxisLabelSuffix="%"
                isAnimated
                animationDuration={1000}
                initialSpacing={15}
                endSpacing={15}
                formatYLabel={(value) => `${Math.round(Number(value))}`}
              />
            </View>
          </ScrollView>
        </View>
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 shadow-md`}
        >
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-4`}
          >
            Performance Summary
          </Text>

          <View className={`flex-row justify-between mb-3`}>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
            >
              Highest Score:
            </Text>
            <Text className={`text-success font-bold`}>
              {Math.max(
                ...gradedAssignments.map(
                  (a) => calculateOverallMark(a.categories) || 0
                )
              )}
              %
            </Text>
          </View>

          <View className={`flex-row justify-between mb-3`}>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
            >
              Lowest Score:
            </Text>
            <Text className={`text-danger font-bold`}>
              {Math.min(
                ...gradedAssignments.map(
                  (a) => calculateOverallMark(a.categories) || 0
                )
              )}
              %
            </Text>
          </View>

          <View className={`flex-row justify-between mb-3`}>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
            >
              Average:
            </Text>
            <Text className={`text-baccent font-bold`}>
              {Math.round(
                gradedAssignments.reduce(
                  (sum, a) => sum + (calculateOverallMark(a.categories) || 0),
                  0
                ) / gradedAssignments.length
              )}
              %
            </Text>
          </View>

          <View className={`flex-row justify-between`}>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
            >
              Total Assignments:
            </Text>
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} font-bold`}
            >
              {courseData.assignments.length}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className={`${isDark ? "bg-dark1" : "bg-light1"} flex-1`}>
      <BackButton path={"/courses"} />
      <TouchableOpacity
        className={`absolute top-15 right-5 flex flex-row items-center z-50 gap-2 ${isEditMode ? "bg-baccent" : `${isDark ? "bg-dark4" : "bg-light4"}`} rounded-lg p-2 shadow-md`}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setIsEditMode(!isEditMode);
        }}
      >
        <Image
          className={`w-7 h-7`}
          style={{
            tintColor: isDark
              ? isEditMode
                ? "#111113"
                : "#fafafa"
              : isEditMode
                ? "#fbfbfb"
                : "#2f3035",
          }}
          source={require("../../assets/images/pencil.png")}
        />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className={`pt-20 px-5 pb-10 mt-13`}>
          <Text
            className={`text-center ${isDark ? "text-appwhite" : "text-appblack"} text-4xl font-semibold`}
          >
            {isLoading && !courseData
              ? "Loading..."
              : courseData?.courseName || "Course"}
          </Text>
          <Text
            className={` text-center rounded-lg font-medium mb-5 ${isDark ? "text-appgraydark" : "text-appgraydark"}`}
          >
            {message}
          </Text>

          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#27b1fa" />
              {shouldFetch && (
                <TeachAssistAuthFetcher
                  fetchCourseUrl={courseUrl}
                  onResult={onFetchResult}
                  onError={onError}
                  onLoadingChange={onLoadingChange}
                />
              )}
            </>
          ) : courseData && courseData.success ? (
            <View className={`w-full`}>
              {/* grade summary */}
              {courseData.summary && (
                <View
                  className={`mb-6 flex-row justify-around ${isDark ? "bg-dark3" : "bg-light3"} shadow-lg p-3 pt-6 pb-5 rounded-xl`}
                >
                  {courseData.summary.term && (
                    <View className={`items-center`}>
                      <AnimatedProgressWheel
                        size={115}
                        width={13}
                        color={"#27b1fa"}
                        backgroundColor={isDark ? "#232427" : "#e7e7e9"}
                        progress={
                          courseData.summary.term === 999
                            ? NaN
                            : courseData.summary.term
                        }
                        max={100}
                        rounded={true}
                        rotation={"-90deg"}
                        delay={75}
                        duration={400}
                        showProgressLabel={true}
                        labelStyle={{
                          color: "#27b1fa",
                          fontSize: 20,
                          fontWeight: "600",
                        }}
                        showPercentageSymbol={true}
                      />
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold mt-2`}
                      >
                        Term Average
                      </Text>
                    </View>
                  )}
                  <View className={`items-center`}>
                    <AnimatedProgressWheel
                      size={115}
                      width={13}
                      color={"#2faf7f"}
                      backgroundColor={isDark ? "#232427" : "#e7e7e9"}
                      progress={calculateCourseAverage()}
                      max={100}
                      rounded={true}
                      rotation={"-90deg"}
                      delay={75}
                      duration={400}
                      showProgressLabel={true}
                      labelStyle={{
                        color: "#2faf7f",
                        fontSize: 20,
                        fontWeight: "600",
                      }}
                      showPercentageSymbol={true}
                    />
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold mt-2`}
                    >
                      Course Average
                    </Text>
                  </View>
                </View>
              )}

              {/* tabs */}
              <View
                className={`flex-row mb-6 gap-2 ${isDark ? "bg-dark3" : "bg-light3"} p-3 rounded-lg shadow-md`}
              >
                {renderTabButton("courses", "Courses")}
                {renderTabButton("analytics", "Analytics")}
              </View>

              {/* Add Assignment Button (shown when edit mode is active and on courses tab) */}
              {isEditMode && activeTab === "courses" && (
                <View className="mb-6">
                  {!showAddAssignment ? (
                    <View className="shadow-md">
                      <TouchableOpacity
                        className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 items-center`}
                        onPress={() => {
                          setShowAssignmentModal(true);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium
                          );
                        }}
                      >
                        <Text
                          className={`text-baccent text-lg font-semibold mb-1`}
                        >
                          + Add Assignment
                        </Text>
                        <Text
                          className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm`}
                        >
                          Project your performance with custom assignments
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Tab Content */}
              {activeTab === "courses"
                ? renderCoursesTab()
                : renderAnalyticsTab()}
            </View>
          ) : (
            /* Error State */
            <View className={`bg-danger/20  rounded-xl p-6`}>
              <Text
                className={`text-danger text-center text-lg font-semibold mb-2`}
              >
                Unable to Load Course Data
              </Text>
              <Text className={`text-danger/80 text-center`}>
                {courseData?.error ||
                  "Unknown error occurred while parsing course data."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <AssignmentModal
        visible={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        onSave={addAssignment}
      />

      {/* edit assignment modal */}
      <AssignmentModal
        visible={editingAssignmentIndex !== null}
        onClose={() => setEditingAssignmentIndex(null)}
        onSave={(data) => editAssignment(editingAssignmentIndex!, data)}
        initialData={
          editingAssignmentIndex !== null
            ? courseData?.assignments[editingAssignmentIndex]
            : null
        }
      />
    </View>
  );
};

export default CourseViewScreen;
