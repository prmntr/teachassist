import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { BarChart, LineChart } from "react-native-gifted-charts";
import AnimatedProgressWheel from "react-native-progress-wheel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SecureStorage } from "../(auth)/taauth";
import Text from "@/components/ui/AppText";
import AppTextInput from "@/components/ui/AppTextInput";
import BackButton from "@/components/ui/Back";
import { type Course } from "@/utils/CourseParser";
import { VIEW_REPORT_OE_FIXTURE } from "@/utils/fixtures/viewReportOEFixture";
import {
  getCategoryFullName,
  getPerformanceText,
  getProgressColor,
  parseGradeData,
  type ParsedCourseData,
} from "@/utils/GradeParser";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { QuickCourse } from "@/components/QuickCourse";
import {
  deleteParsedCourseReport,
  loadParsedCourseReport,
} from "@/utils/courseReportCache";
import { hapticsImpact } from "@/utils/haptics";
import { useLiquidGlassActive } from "@/utils/liquidGlass";
import { getGradeBucketColor } from "@/utils/themeSystem";
import { useAFoolVisualGrades } from "@/contexts/AFoolVisualGradesContext";
import { useTheme } from "@/contexts/ThemeContext";

type CategoryKey = "K" | "T" | "C" | "A" | "O";
const USE_LOCAL_OE_TEST_DATA = false; // test
const DEFAULT_WEIGHTINGS = {
  knowledge: "0%",
  thinking: "0%",
  communication: "0%",
  application: "0%",
  other: "0%",
  final: "0%",
};
const CATEGORY_COLOR_PALETTE = [
  "#27b1fa",
  "#2faf7f",
  "#f59e0b",
  "#ef4444",
  "#6b7280",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

const CourseViewScreen = () => {
  // no check for internet needed b/c cached from first view and course page blocks refresh that clears this
  const { activeTone, isDark, themePresetId } = useTheme(); // needed as some things need specific HEX values
  const { shouldForceVisualHundreds } = useAFoolVisualGrades();
  const liquidGlassEnabled = useLiquidGlassActive();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;
  const { id } = useLocalSearchParams();
  const subjectIdValue = Array.isArray(id) ? id[0] : id;
  const subjectID = subjectIdValue ? parseInt(subjectIdValue, 10) : null;

  const [courseData, setCourseData] = useState<ParsedCourseData | null>(null);
  const [storedCourses, setStoredCourses] = useState<Course[]>([]);
  const [hasLoadedStoredCourses, setHasLoadedStoredCourses] = useState(false);
  const [isDemoAccount, setIsDemoAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Loading...");
  const [activeTab, setActiveTab] = useState<"courses" | "analytics">(
    "courses",
  );
  const [expandedAssignments, setExpandedAssignments] = useState<Set<number>>(
    new Set(),
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignmentIndex, setEditingAssignmentIndex] = useState<
    number | null
  >(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("K");
  const [selectedOverallValue, setSelectedOverallValue] = useState<
    number | null
  >(null);
  const [selectedCategoryValue, setSelectedCategoryValue] = useState<
    number | null
  >(null);

  useEffect(() => {
    setSelectedCategoryValue(null);
  }, [selectedCategoryKey]);

  useEffect(() => {
    const loadStoredCourses = async () => {
      try {
        const storedCoursesJson = await SecureStorage.load("ta_courses");
        const demoFlag = await SecureStorage.load("ta_is_demo");
        if (demoFlag === "true") {
          setIsDemoAccount(true);
        } else {
          const username = await SecureStorage.load("ta_username");
          const password = await SecureStorage.load("ta_password");
          setIsDemoAccount(username === "123456789" && password === "password");
        }

        if (!storedCoursesJson) {
          setStoredCourses([]);
          return;
        }

        const parsedCourses = JSON.parse(storedCoursesJson);
        setStoredCourses(Array.isArray(parsedCourses) ? parsedCourses : []);
      } catch {
        setStoredCourses([]);
      } finally {
        setHasLoadedStoredCourses(true);
      }
    };

    loadStoredCourses();
  }, []);

  const getUser = async () => {
    return await SecureStorage.load("ta_username");
  };

  const parseGradeInput = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const fractionMatch = trimmed.match(
      /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/,
    );
    if (fractionMatch) {
      const earned = parseFloat(fractionMatch[1]);
      const possible = parseFloat(fractionMatch[2]);
      if (
        Number.isFinite(earned) &&
        Number.isFinite(possible) &&
        possible > 0
      ) {
        const rawPercentage = (earned / possible) * 100;
        if (rawPercentage > 999) return null;
        const percentage = Math.round(rawPercentage);
        const score = `${earned}/${possible}`;
        return {
          score,
          percentage: `${percentage}%`,
        };
      }
      return null;
    }

    const percentageMatch = trimmed.match(/^(\d+(?:\.\d+)?)%?$/);
    if (percentageMatch) {
      const value = parseFloat(percentageMatch[1]);
      if (Number.isFinite(value)) {
        const bounded = Math.min(999, Math.max(0, value));
        const rounded = Number.isInteger(bounded)
          ? bounded
          : Number(bounded.toFixed(1));
        return {
          score: `${rounded}/100`,
          percentage: `${rounded}%`,
        };
      }
    }

    return null;
  };

  const getInitialGradeInputValue = (
    category: { score?: string; percentage?: string } | null | undefined,
  ) => {
    if (!category) return "";
    const scoreRaw = category.score?.trim() ?? "";
    const percentageRaw = category.percentage?.replace("%", "").trim() ?? "";
    const scoreMatch = scoreRaw.match(
      /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/,
    );

    if (scoreMatch && parseFloat(scoreMatch[2]) !== 100) {
      return scoreRaw;
    }

    if (percentageRaw) {
      return percentageRaw;
    }

    return scoreRaw;
  };

  const getVisualGradeValue = (value: number) =>
    shouldForceVisualHundreds ? 100 : value;

  const getVisualGradeLabel = (value: number) =>
    `${getVisualGradeValue(value).toFixed(1)}%`;

  const getVisualPercentage = (value?: string | null) => {
    if (!value) return "";
    const numericValue = parseFloat(value.replace("%", ""));
    if (isNaN(numericValue)) return value;
    return `${getVisualGradeValue(numericValue).toFixed(0)}%`;
  };

  const getAssignmentTotalWeight = (categories: Record<string, any>) =>
    Object.values(categories).reduce((total, category: any) => {
      if (!category?.weight) return total;
      const weight = parseFloat(category.weight);
      return Number.isFinite(weight) && weight > 0 ? total + weight : total;
    }, 0);

  const parseWeightingValue = (value?: string) => {
    const parsed = parseFloat((value ?? "").replace("%", ""));
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatWeightingValue = (value: number) =>
    `${value.toFixed(1).replace(/\.0$/, "")}%`;

  const hasCourseWeightings = (weightings?: typeof DEFAULT_WEIGHTINGS) =>
    Boolean(
      weightings &&
      Object.values(weightings).some((value) => parseWeightingValue(value) > 0),
    );

  const calculateWeightedMark = (categories: any): number => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    Object.values(categories).forEach((value: any) => {
      if (value && value.weight && value.percentage) {
        const percentage = parseFloat(value.percentage.replace("%", ""));
        const weight = parseFloat(value.weight);
        // Only include categories that have a weight greater than 0
        if (!isNaN(percentage) && !isNaN(weight) && weight > 0) {
          totalWeightedScore += percentage * weight;
          totalWeight += weight;
        }
      }
    });

    // If totalWeight is 0 (e.g., formative assignment or no weighted categories),
    // calculate a simple average of the percentages present.
    if (totalWeight === 0) {
      const percentages = Object.values(categories)
        .filter((cat: any) => cat && cat.percentage)
        .map((cat: any) => parseFloat(cat.percentage.replace("%", "")));

      if (percentages.length === 0) return 0;

      const sum = percentages.reduce((a, b) => a + b, 0);
      return Math.round(sum / percentages.length);
    }

    return Math.round(totalWeightedScore / totalWeight);
  };

  const calculateFallbackAssignmentAverage = (assignments: any[]) => {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const unweightedMarks: number[] = [];

    assignments.forEach((assignment) => {
      const assignmentMark = calculateWeightedMark(assignment.categories);
      const assignmentWeight = getAssignmentTotalWeight(assignment.categories);

      if (assignmentWeight > 0) {
        totalWeightedScore += assignmentMark * assignmentWeight;
        totalWeight += assignmentWeight;
      } else {
        unweightedMarks.push(assignmentMark);
      }
    });

    if (totalWeight > 0) {
      return parseFloat((totalWeightedScore / totalWeight).toFixed(1));
    }

    if (unweightedMarks.length > 0) {
      return parseFloat(
        (
          unweightedMarks.reduce((sum, mark) => sum + mark, 0) /
          unweightedMarks.length
        ).toFixed(1),
      );
    }

    return null;
  };

  // calc course average including added ones with weighted calculation
  const calculateCourseAverage = () => {
    if (!courseData?.assignments || !courseData.summary?.courseWeightings) {
      return courseData?.summary?.course || 0;
    }

    const weightings = courseData.summary.courseWeightings;
    const gradedAssignments = courseData.assignments.filter(
      (assignment) => !assignment.formative,
    );

    if (gradedAssignments.length === 0) {
      return courseData?.summary?.course || 0;
    }

    if (!hasCourseWeightings(weightings)) {
      return (
        calculateFallbackAssignmentAverage(gradedAssignments) ??
        courseData?.summary?.course ??
        0
      );
    }

    // Step 1: Calculate the weighted achievement for each category across all assignments
    const categoryTotals: Record<
      string,
      { totalWeightedScore: number; totalWeight: number }
    > = {
      K: { totalWeightedScore: 0, totalWeight: 0 },
      T: { totalWeightedScore: 0, totalWeight: 0 },
      C: { totalWeightedScore: 0, totalWeight: 0 },
      A: { totalWeightedScore: 0, totalWeight: 0 },
      O: { totalWeightedScore: 0, totalWeight: 0 },
    };

    gradedAssignments.forEach((assignment) => {
      Object.entries(assignment.categories).forEach(([key, value]) => {
        if (value && value.weight) {
          const percentage = parseFloat(value.percentage.replace("%", ""));
          const weight = parseFloat(value.weight);
          if (!isNaN(percentage) && !isNaN(weight) && weight > 0) {
            categoryTotals[key].totalWeightedScore += percentage * weight;
            categoryTotals[key].totalWeight += weight;
          }
        }
      });
    });

    const categoryAchievements: Record<string, number> = {};
    Object.keys(categoryTotals).forEach((key) => {
      if (categoryTotals[key].totalWeight > 0) {
        categoryAchievements[key] =
          categoryTotals[key].totalWeightedScore /
          categoryTotals[key].totalWeight;
      }
    });

    // Step 2 & 3: Apply course weightings to calculate the final mark
    const otherWeight =
      parseWeightingValue(weightings.other) +
      parseWeightingValue(weightings.final);
    const courseWeightMap = {
      K: parseWeightingValue(weightings.knowledge),
      T: parseWeightingValue(weightings.thinking),
      C: parseWeightingValue(weightings.communication),
      A: parseWeightingValue(weightings.application),
      O: otherWeight,
    };

    let totalWeightedAchievement = 0;
    let totalAssessedWeight = 0;

    Object.entries(categoryAchievements).forEach(([key, achievement]) => {
      const courseWeight = courseWeightMap[key as keyof typeof courseWeightMap];
      if (courseWeight > 0) {
        totalWeightedAchievement += achievement * courseWeight;
        totalAssessedWeight += courseWeight;
      }
    });

    if (totalAssessedWeight === 0) {
      return (
        calculateFallbackAssignmentAverage(gradedAssignments) ??
        courseData?.summary?.course ??
        0
      );
    }

    const finalMark = totalWeightedAchievement / totalAssessedWeight;
    // Using toFixed(1) and parseFloat to get closer to the 90.5 example
    return parseFloat(finalMark.toFixed(1));
  };

  const getCategoryDisplayName = (key: string) => {
    const normalizedKey = key.toUpperCase();
    const summaryCategory = courseData?.summary.categories.find(
      (category) => category.key?.toUpperCase() === normalizedKey,
    );

    if (summaryCategory?.description) {
      return `${normalizedKey} - ${summaryCategory.description}`;
    }

    if (summaryCategory?.name) {
      return summaryCategory.name;
    }

    return getCategoryFullName(normalizedKey);
  };

  useEffect(() => {
    const availableKeys = Array.from(
      new Set(
        courseData?.assignments.flatMap((assignment) =>
          Object.entries(assignment.categories)
            .filter(([, value]) => value !== null)
            .map(([key]) => key.toUpperCase()),
        ) ?? ["K"],
      ),
    );

    if (!availableKeys.includes(selectedCategoryKey)) {
      setSelectedCategoryKey(availableKeys[0] ?? "K");
    }
  }, [courseData, selectedCategoryKey]);

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
      assignments: [newAssignment, ...courseData.assignments],
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
      (_, i) => i !== index,
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

  // Types for assignment modal
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
    const getCategoryInputValue = (
      category: { score?: string; percentage?: string } | null | undefined,
    ) => getInitialGradeInputValue(category);

    const [assignmentName, setAssignmentName] = useState(
      initialData?.name || "",
    );
    const [isFormative, setIsFormative] = useState(
      initialData?.formative || false,
    );
    const [categories, setCategories] = useState<CategoriesState>(() => ({
      K: initialData?.categories.K
        ? {
            percentage: getCategoryInputValue(initialData.categories.K),
            weight: initialData.categories.K.weight || "0",
            enabled: true,
          }
        : { percentage: "", weight: "", enabled: false },
      T: initialData?.categories.T
        ? {
            percentage: getCategoryInputValue(initialData.categories.T),
            weight: initialData.categories.T.weight || "0",
            enabled: true,
          }
        : { percentage: "", weight: "", enabled: false },
      C: initialData?.categories.C
        ? {
            percentage: getCategoryInputValue(initialData.categories.C),
            weight: initialData.categories.C.weight || "0",
            enabled: true,
          }
        : { percentage: "", weight: "", enabled: false },
      A: initialData?.categories.A
        ? {
            percentage: getCategoryInputValue(initialData.categories.A),
            weight: initialData.categories.A.weight || "0",
            enabled: true,
          }
        : { percentage: "", weight: "", enabled: false },
      O: initialData?.categories.O
        ? {
            percentage: getCategoryInputValue(initialData.categories.O),
            weight: initialData.categories.O.weight || "0",
            enabled: true,
          }
        : { percentage: "", weight: "", enabled: false },
    }));

    useEffect(() => {
      setAssignmentName(initialData?.name || "");
      setIsFormative(initialData?.formative || false);
      setCategories({
        K: initialData?.categories.K
          ? {
              percentage: getCategoryInputValue(initialData.categories.K),
              weight: initialData.categories.K.weight || "0",
              enabled: true,
            }
          : { percentage: "", weight: "", enabled: false },
        T: initialData?.categories.T
          ? {
              percentage: getCategoryInputValue(initialData.categories.T),
              weight: initialData.categories.T.weight || "0",
              enabled: true,
            }
          : { percentage: "", weight: "", enabled: false },
        C: initialData?.categories.C
          ? {
              percentage: getCategoryInputValue(initialData.categories.C),
              weight: initialData.categories.C.weight || "0",
              enabled: true,
            }
          : { percentage: "", weight: "", enabled: false },
        A: initialData?.categories.A
          ? {
              percentage: getCategoryInputValue(initialData.categories.A),
              weight: initialData.categories.A.weight || "0",
              enabled: true,
            }
          : { percentage: "", weight: "", enabled: false },
        O: initialData?.categories.O
          ? {
              percentage: getCategoryInputValue(initialData.categories.O),
              weight: initialData.categories.O.weight || "0",
              enabled: true,
            }
          : { percentage: "", weight: "", enabled: false },
      });
    }, [initialData]);

    const handleSave = () => {
      let finalCategories: any = {};

      (Object.entries(categories) as [CategoryKey, CategoryState][]).forEach(
        ([key, value]) => {
          if (value.enabled && value.percentage) {
            const parsed = parseGradeInput(value.percentage);
            if (parsed) {
              finalCategories[key] = {
                percentage: parsed.percentage,
                weight: value.weight || "0",
                score: parsed.score,
              };
            } else {
              finalCategories[key] = null;
            }
          } else {
            finalCategories[key] = null;
          }
        },
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
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          className="flex-1 mb-10"
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
        >
          <View className="flex-1 bg-black/50 items-center justify-end px-4 pt-6">
            <LiquidGlassView
              containerClassName="w-full max-w-md"
              className="rounded-xl py-6"
              contentStyle={{
                maxHeight: "80%",
                minHeight: "70%",
              }}
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="regular"
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-4 px-6`}
              >
                {initialData ? "Edit Assignment" : "Add Assignment"}
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 4 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
              >
                <View className="mb-7 px-6">
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2 font-medium`}
                  >
                    Assignment Name
                  </Text>
                  <AppTextInput
                    className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded-xl p-3`}
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
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                        setIsFormative(!isFormative);
                      }}
                    >
                      <View
                        className={`w-5 h-5 rounded-full bg-white  transition-all duration-200 ${
                          isFormative ? "ml-6" : "ml-0.5"
                        }`}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm mt-1`}
                  >
                    Formative assignments have{`\n`}a weight of 0.
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
                            hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
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
                              Grade
                            </Text>
                            <AppTextInput
                              className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded p-2 text-md`}
                              value={value.percentage}
                              onChangeText={(text) => {
                                const cleaned = text.replace(
                                  /[^0-9\/%\.\s]/g,
                                  "",
                                );
                                setCategories((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    percentage: cleaned,
                                  },
                                }));
                              }}
                              placeholder="e.g. 92, or 42/44"
                              placeholderTextColor={
                                isDark ? "#85868e" : "#6d6e77"
                              }
                              keyboardType="numbers-and-punctuation"
                            />
                          </View>
                          <View className="flex-1">
                            <Text
                              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-xs mb-1`}
                            >
                              Weight
                            </Text>
                            <AppTextInput
                              className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded p-2 text-md`}
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
                <LiquidGlassButton
                  containerStyle={{ flex: 1 }}
                  contentStyle={{
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  glassTintColor={activeTone.bg4}
                  fallbackBackgroundColor={activeTone.bg4}
                  onPress={() => {
                    onClose();
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  }}
                >
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-center font-medium`}
                  >
                    Cancel
                  </Text>
                </LiquidGlassButton>
                <LiquidGlassButton
                  containerStyle={{ flex: 1 }}
                  contentStyle={{
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  glassTintColor={activeTone.accent}
                  fallbackBackgroundColor={activeTone.accent}
                  onPress={() => {
                    handleSave();
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  }}
                >
                  <Text
                    className={`${isDark ? "text-appblack" : "text-appwhite"} text-center font-medium`}
                  >
                    {initialData ? "Save Changes" : "Add Assignment"}
                  </Text>
                </LiquidGlassButton>
              </View>
            </LiquidGlassView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  useEffect(() => {
    const loadCourseData = async () => {
      if (USE_LOCAL_OE_TEST_DATA) {
        const parsedData = parseGradeData(VIEW_REPORT_OE_FIXTURE);
        setCourseData(parsedData);
        setIsLoading(false);
        setMessage("Loaded local OE parser test data.");
        return;
      }

      const currentUserName = await getUser();

      // test users courses
      if (currentUserName?.includes("123456789")) {
        setCourseData({
          assignments: [
            {
              name: "21st Century Essay",
              categories: {
                K: null,
                T: null,
                C: null,
                A: null,
                O: {
                  score: "40 / 44",
                  percentage: "90%",
                  weight: "20",
                },
              },
              feedback:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent rutrum cursus eleifend. Aliquam eleifend eleifend nunc, sit amet interdum dui fringilla in. ",
            },
            {
              name: "Research Report: How to find Easter Eggs",
              categories: {
                K: null,
                T: null,
                C: null,
                A: null,
                O: {
                  score: "43 / 65",
                  percentage: "82%",
                  weight: "10",
                },
              },
            },
            {
              name: "Macbeth In-Class Mock Essay",
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
              formative: true,
            },
            {
              name: "Why Tim Cook is the best CEO of all time",
              categories: {
                K: {
                  score: "8 / 8",
                  percentage: "100%",
                  weight: "10",
                },
              },
              formative: true,
            },
            {
              name: "Unit 2 Test: Torque",
              categories: {
                K: {
                  score: "8 / 10",
                  percentage: "80%",
                  weight: "10",
                },
                T: {
                  score: "7 / 10",
                  percentage: "70%",
                  weight: "10",
                },
                C: {
                  score: "4 / 6",
                  percentage: "66%",
                  weight: "10",
                },
                A: {
                  score: "2 / 10",
                  percentage: "20%",
                  weight: "10",
                },
                O: null,
              },
              feedback: `perchance`,
            },
            {
              name: "Unit 1 Test: Introduction to Advanced Topology",
              categories: {
                K: {
                  score: "13 / 13",
                  percentage: "100%",
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
            term: 90,
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
            courseWeightings: {
              knowledge: "35%",
              thinking: "15%",
              communication: "15%",
              application: "35%",
              other: "0%",
              final: "30%",
            },
          },
          courseName: "ENG2D1",
          success: true,
        });
        setIsLoading(false);
        setMessage("Last updated just now");
        return;
      }

      // reg users
      if (subjectID === null) {
        setMessage("Error: No course ID provided.");
        setCourseData({
          assignments: [],
          summary: {
            term: null,
            course: null,
            categories: [],
            courseWeightings: {
              knowledge: "0%",
              thinking: "0%",
              communication: "0%",
              application: "0%",
              other: "0%",
              final: "0%",
            },
          },
          courseName: "Course",
          success: false,
          error: "Missing course ID.",
        });
        setIsLoading(false);
        return;
      }

      const cachedReport = await loadParsedCourseReport(subjectID);

      if (cachedReport) {
        const parsedData = cachedReport;
        setCourseData(parsedData);
        setIsLoading(false);

        if (parsedData.success) {
          // cached, dont say last updated
          setMessage(`View your marked assignments`);
        } else {
          setMessage(`Error parsing cached data: ${parsedData.error}`);
          // if parse failed, clear and just fetch fresh data
          await deleteParsedCourseReport(subjectID);
        }
      }

      if (!cachedReport) {
        setCourseData({
          assignments: [],
          summary: {
            term: null,
            course: null,
            categories: [],
            courseWeightings: {
              knowledge: "0%",
              thinking: "0%",
              communication: "0%",
              application: "0%",
              other: "0%",
              final: "0%",
            },
          },
          courseName: "Course",
          success: false,
          error:
            "Course data isn't synced yet. Refresh your courses to fetch it.",
        });
        setMessage("Course data isn't synced yet. Refresh courses to load.");
        setIsLoading(false);
      }
    };

    loadCourseData();
  }, [subjectID]);

  const renderTabButton = (tab: "courses" | "analytics", label: string) => {
    const isActive = activeTab === tab;

    return (
      <LiquidGlassButton
        containerStyle={{ flex: 1 }}
        contentStyle={{
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
        fallbackBackgroundColor={isActive ? activeTone.accent : activeTone.bg4}
        glassTintColor={isActive ? activeTone.accent : activeTone.bg4}
        glassEffectStyle="clear"
        onPress={() => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          setActiveTab(tab);
        }}
      >
        <Text
          className={`${isActive ? "font-bold" : ""} text-center `}
          style={{
            color: isActive ? activeTone.bg1 : isDark ? "#edebea" : "#2f3035",
          }}
        >
          {label}
        </Text>
      </LiquidGlassButton>
    );
  };

  const renderCoursesTab = () => (
    <View className={`w-full`}>
      {courseData?.assignments.map((assignment, index) => {
        const isExpanded = expandedAssignments.has(index);
        const assignmentMark = calculateWeightedMark(assignment.categories);
        const visualAssignmentMark = getVisualGradeValue(assignmentMark);
        return (
          <LiquidGlassButton
            key={index}
            className="rounded-xl p-5 mb-4 "
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
            activeOpacity={liquidGlassEnabled ? 0.2 : 1}
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              toggleAssignmentExpansion(index);
            }}
          >
            <View className={`flex-row justify-between items-center`}>
              <View className={`flex-1`}>
                <View className="flex-row">
                  {assignment.formative && (
                    <Text
                      className={`text-baccent text-xs font-semibold mb-1 uppercase tracking-wide`}
                    >
                      Formative
                    </Text>
                  )}
                  {assignment.formative && assignment.feedback && (
                    <Text
                      className={`text-baccent text-xs font-semibold mb-1 uppercase tracking-wide`}
                    >
                      {` • `}
                    </Text>
                  )}
                  {assignment.feedback && (
                    <Text
                      className={`text-baccent text-xs font-semibold mb-1 uppercase tracking-wide`}
                    >
                      Feedback
                    </Text>
                  )}
                </View>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-1`}
                >
                  {assignment.name}
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm`}
                >
                  {getPerformanceText(visualAssignmentMark)}
                </Text>
              </View>

              <View className={`flex-row items-center`}>
                <View className={`mr-3 items-center justify-center`}>
                  <AnimatedProgressWheel
                    size={70}
                    width={6}
                    color={
                      themePresetId === "default"
                        ? getGradeBucketColor(
                            visualAssignmentMark,
                            activeTone.accent,
                          )
                        : activeTone.accent
                    }
                    backgroundColor={activeTone.bg4}
                    progress={visualAssignmentMark ?? NaN}
                    max={100}
                    rounded={true}
                    rotation={"-90deg"}
                    delay={75}
                    duration={400}
                    showPercentageSymbol={true}
                  />
                  <View className="absolute">
                    <Text
                      style={{
                        color:
                          themePresetId === "default"
                            ? getGradeBucketColor(
                                visualAssignmentMark,
                                activeTone.accent,
                              )
                            : activeTone.accent,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {getVisualGradeLabel(assignmentMark)}
                      {/* TA only has up to 1 */}
                    </Text>
                  </View>
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
                  {Object.entries(assignment.categories).map(([key, value]) => {
                    if (!value) return null;
                    const rawPercentage = parseInt(
                      value.percentage.replace("%", ""),
                      10,
                    );
                    const visualPercentage = getVisualGradeValue(
                      isNaN(rawPercentage) ? 0 : rawPercentage,
                    );

                    return (
                      <View key={key} className={`mb-3`}>
                        <View
                          className={`flex-row justify-between items-center mb-1`}
                        >
                          <Text
                            className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-sm w-40`}
                            style={{
                              width: `85%`,
                            }}
                          >
                            {getCategoryDisplayName(key)}
                          </Text>
                          <View className={`flex-row items-center`}>
                            <Text
                              className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-bold`}
                            >
                              {getVisualPercentage(value.percentage)}
                            </Text>
                          </View>
                        </View>

                        <View
                          className={`rounded-full h-2 overflow-hidden ${isDark ? "bg-dark4" : "bg-light4"}`}
                        >
                          <View
                            className={`h-full rounded-full ${getProgressColor(
                              visualPercentage,
                            )}`}
                            style={{
                              width: `${Math.min(visualPercentage, 100)}%`,
                            }}
                          />
                        </View>

                        <View
                          className={`flex-row justify-between items-center mt-1`}
                        >
                          <Text
                            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm`}
                          >
                            Weight: {value.weight || "0"}
                          </Text>
                          <Text
                            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm`}
                          >
                            {value.score}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  {assignment.feedback !== undefined && (
                    <View
                      className={`${isDark ? "bg-dark4" : "bg-light4"} rounded-xl p-4 mt-1`}
                    >
                      <Text
                        className={`${isDark ? "text-baccent/95" : "text-baccent"} text-lg font-medium`}
                      >
                        Teacher Feedback
                      </Text>
                      <Text
                        className={`${isDark ? "text-appwhite/70" : "text-appblack/70"} font-light`}
                      >
                        {assignment.feedback}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  className={`mt-4 pt-4 border-t border-1 ${isDark ? "border-appgraydark" : "border-appgraylight"}`}
                >
                  <View className={`flex-row items-center justify-center mb-1`}>
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-xs font-light`}
                    >
                      {
                        Object.values(assignment.categories).filter(
                          (cat) => cat !== null,
                        ).length
                      }{" "}
                      {Object.values(assignment.categories).filter(
                        (cat) => cat !== null,
                      ).length === 1
                        ? "category"
                        : "categories"}{" "}
                      graded
                    </Text>
                  </View>

                  {/* edit and delete btns */}
                  {isEditMode && (
                    <View className="flex-row gap-3 mt-4">
                      <LiquidGlassButton
                        containerStyle={{ flex: 1 }}
                        contentStyle={{
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        glassTintColor={activeTone.bg4}
                        fallbackBackgroundColor={activeTone.bg4}
                        onPress={() => {
                          hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
                          setEditingAssignmentIndex(index);
                        }}
                      >
                        <Image
                          className="w-4 h-4"
                          style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
                          source={require("../../assets/images/pencil.png")}
                        />
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"} font-medium ml-2`}
                        >
                          Edit
                        </Text>
                      </LiquidGlassButton>
                      <LiquidGlassButton
                        containerStyle={{ flex: 1 }}
                        contentStyle={{
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        glassTintColor={"#ef444444"}
                        fallbackBackgroundColor={"#ef444477"}
                        onPress={() => {
                          hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
                          deleteAssignment(index);
                        }}
                      >
                        <Image
                          className="w-4 h-4"
                          style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
                          source={require("../../assets/images/trash-bin.png")}
                        />
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"} font-medium ml-2`}
                        >
                          Delete
                        </Text>
                      </LiquidGlassButton>
                    </View>
                  )}
                </View>
              </>
            )}
          </LiquidGlassButton>
        );
      })}

      {/* no assignments */}
      {courseData?.assignments.length === 0 && (
        <LiquidGlassView
          className="rounded-xl p-6 text-center"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-center`}
          >
            No assignments found for this course.
          </Text>
        </LiquidGlassView>
      )}
    </View>
  );

  const renderAnalyticsTab = () => {
    const gradedAssignments =
      courseData?.assignments.filter((assignment) => !assignment.formative) ||
      [];

    // reverse orders bc TA
    const chronologicalAssignments = [...gradedAssignments].reverse();

    if (chronologicalAssignments.length === 0) {
      return (
        <View>
          <LiquidGlassView
            className="rounded-xl p-6 text-center items-center flex-1 pb-10"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
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
          </LiquidGlassView>
        </View>
      );
    }

    const getChartRange = (values: number[]) => {
      if (values.length === 0) {
        return { min: 0, max: 100 };
      }

      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const spread = maxValue - minValue;
      const padding = Math.max(3, spread * 0.2);

      let min = Math.floor(minValue - padding);
      let max = Math.ceil(maxValue + padding);

      if (max - min < 10) {
        const mid = (minValue + maxValue) / 2;
        min = Math.floor(mid - 5);
        max = Math.ceil(mid + 5);
      }

      return {
        min: Math.max(0, min),
        max: Math.min(100, max),
      };
    };

    const getAxisConfig = (values: number[]) => {
      const range = getChartRange(values);
      const yAxisOffset = Number.isFinite(range.min)
        ? Math.max(0, Math.floor(range.min))
        : 0;
      const top = Number.isFinite(range.max)
        ? Math.min(100, Math.ceil(range.max))
        : 100;
      const maxValue = Math.max(1, top - yAxisOffset);

      return { yAxisOffset, maxValue };
    };

    // function to get the average based on a subset of assignments
    const calculateProgressiveCourseAverage = (
      assignments: any[],
      weightings: any,
    ) => {
      if (assignments.length === 0) return 0;

      const categoryTotals: Record<
        string,
        { totalWeightedScore: number; totalWeight: number }
      > = {};
      assignments.forEach((assignment) => {
        Object.entries(assignment.categories).forEach(
          ([key, value]: [string, any]) => {
            if (value && value.weight) {
              const percentage = parseFloat(value.percentage.replace("%", ""));
              const weight = parseFloat(value.weight);
              if (!isNaN(percentage) && !isNaN(weight) && weight > 0) {
                if (!categoryTotals[key]) {
                  categoryTotals[key] = {
                    totalWeightedScore: 0,
                    totalWeight: 0,
                  };
                }
                categoryTotals[key].totalWeightedScore += percentage * weight;
                categoryTotals[key].totalWeight += weight;
              }
            }
          },
        );
      });

      const categoryAchievements: Record<string, number> = {};
      Object.keys(categoryTotals).forEach((key) => {
        if (categoryTotals[key].totalWeight > 0) {
          categoryAchievements[key] =
            categoryTotals[key].totalWeightedScore /
            categoryTotals[key].totalWeight;
        }
      });

      const safeWeightings = weightings ?? DEFAULT_WEIGHTINGS;

      const otherWeight =
        parseWeightingValue(safeWeightings.other) +
        parseWeightingValue(safeWeightings.final);
      const courseWeightMap = {
        K: parseWeightingValue(safeWeightings.knowledge),
        T: parseWeightingValue(safeWeightings.thinking),
        C: parseWeightingValue(safeWeightings.communication),
        A: parseWeightingValue(safeWeightings.application),
        O: otherWeight,
      };

      if (!hasCourseWeightings(safeWeightings)) {
        return calculateFallbackAssignmentAverage(assignments) ?? 0;
      }
      let totalWeightedAchievement = 0;
      let totalAssessedWeight = 0;
      Object.entries(categoryAchievements).forEach(([key, achievement]) => {
        const courseWeight =
          courseWeightMap[key as keyof typeof courseWeightMap];
        if (courseWeight > 0) {
          totalWeightedAchievement += achievement * courseWeight;
          totalAssessedWeight += courseWeight;
        }
      });
      if (totalAssessedWeight === 0) {
        return calculateFallbackAssignmentAverage(assignments) ?? 0;
      }
      return totalWeightedAchievement / totalAssessedWeight;
    };

    // calc progressive data for overall course line chart
    const overallLineData = chronologicalAssignments.map((_, index) => {
      const assignmentsUpToThisPoint = chronologicalAssignments.slice(
        0,
        index + 1,
      );
      const cumulativeAverage = calculateProgressiveCourseAverage(
        assignmentsUpToThisPoint,
        courseData?.summary.courseWeightings,
      );
      return {
        value: getVisualGradeValue(cumulativeAverage),
        label: (index + 1).toString(),
        labelTextStyle: { color: isDark ? "#edebea" : "#2f3035", fontSize: 10 },
      };
    });
    const overallAxisConfig = getAxisConfig(
      overallLineData.map((point) => point.value),
    );
    const overallFinalValue =
      overallLineData[overallLineData.length - 1]?.value ?? 0;
    const overallFinalChartValue = Number.isFinite(overallFinalValue)
      ? overallFinalValue - overallAxisConfig.yAxisOffset
      : 0;
    const overallValueAdjustment = Number.isFinite(overallFinalValue)
      ? overallFinalValue - overallFinalChartValue
      : 0;

    // Calculate progressive data for category-specific line charts
    const getCategoryLineData = (categoryKey: string) => {
      const dataPoints: {
        value: number;
        label: string;
        labelTextStyle: { color: string; fontSize: number };
      }[] = [];
      // temp structure to track cumulative weighted scores and weights over time
      const progressiveTotals = { totalWeightedScore: 0, totalWeight: 0 };

      chronologicalAssignments.forEach((assignment, index) => {
        const categoryData = assignment.categories[categoryKey];
        if (
          categoryData &&
          categoryData.weight &&
          parseFloat(categoryData.weight) > 0
        ) {
          const percentage = parseFloat(
            categoryData.percentage.replace("%", ""),
          );
          const weight = parseFloat(categoryData.weight);
          if (!isNaN(percentage) && !isNaN(weight)) {
            progressiveTotals.totalWeightedScore += percentage * weight;
            progressiveTotals.totalWeight += weight;
          }
        }

        // only add a data point if this category has been done at least once
        if (progressiveTotals.totalWeight > 0) {
          const cumulativeAverage =
            progressiveTotals.totalWeightedScore /
            progressiveTotals.totalWeight;
          dataPoints.push({
            value: getVisualGradeValue(cumulativeAverage),
            label: (index + 1).toString(),
            labelTextStyle: {
              color: isDark ? "#edebea" : "#2f3035",
              fontSize: 10,
            },
          });
        }
      });
      return dataPoints;
    };

    // Data for the assignment overview bar chart, in correct oder now
    const assignmentData = chronologicalAssignments.map(
      (assignment, index) => ({
        value: getVisualGradeValue(
          calculateWeightedMark(assignment.categories) || 0,
        ),
        label: `${index + 1}`,
        frontColor: getGradeBucketColor(
          getVisualGradeValue(
            calculateWeightedMark(assignment.categories) || 0,
          ),
          activeTone.accent,
        ),
        gradientColor: getGradeBucketColor(
          getVisualGradeValue(
            calculateWeightedMark(assignment.categories) || 0,
          ),
          activeTone.accent,
        ),
      }),
    );

    const categoryKeys = Array.from(
      new Set(
        chronologicalAssignments.flatMap((assignment) =>
          Object.entries(assignment.categories)
            .filter(([, value]) => value !== null)
            .map(([key]) => key.toUpperCase()),
        ),
      ),
    ).sort((left, right) => {
      const standardOrder = ["K", "T", "C", "A", "O"];
      const leftIndex = standardOrder.indexOf(left);
      const rightIndex = standardOrder.indexOf(right);

      if (leftIndex >= 0 || rightIndex >= 0) {
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
      }

      return left.localeCompare(right, undefined, { numeric: true });
    });

    const categories = categoryKeys.map((key, index) => ({
      key,
      name: getCategoryDisplayName(key),
      color: CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length],
    }));
    const categoryOptions = categories.map((category) => ({
      label: category.name,
      value: category.key,
    }));

    const selectedCategory =
      categories.find((category) => category.key === selectedCategoryKey) ??
      categories[0];
    const selectedCategoryData = getCategoryLineData(selectedCategory.key);
    const selectedCategoryAxisConfig = getAxisConfig(
      selectedCategoryData.map((point) => point.value),
    );
    const selectedCategoryFinalValue =
      selectedCategoryData[selectedCategoryData.length - 1]?.value ?? 0;
    const selectedCategoryFinalChartValue = Number.isFinite(
      selectedCategoryFinalValue,
    )
      ? selectedCategoryFinalValue - selectedCategoryAxisConfig.yAxisOffset
      : 0;
    const selectedCategoryValueAdjustment = Number.isFinite(
      selectedCategoryFinalValue,
    )
      ? selectedCategoryFinalValue - selectedCategoryFinalChartValue
      : 0;
    const formatSelectedValue = (
      value: number | null,
      adjustment: number = 0,
    ) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return "";
      }
      if (shouldForceVisualHundreds) {
        return "100.0%";
      }
      return `${Math.min(adjustment + value, 100).toFixed(1)}%`;
    };

    return (
      <View className={`w-full`}>
        {/* Grade Progression Chart */}
        <LiquidGlassView
          className="rounded-xl p-4 mb-6 "
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
            >
              Grade Progression
            </Text>
            <Text className={`text-baccent font-bold text-lg`}>
              {formatSelectedValue(
                selectedOverallValue,
                overallValueAdjustment,
              )}
            </Text>
          </View>
          <View className={`flex-1 pb-3 pr-2`}>
            <LineChart
              data={overallLineData}
              isAnimated={!isLandscape}
              focusEnabled
              scrollAnimation={!isLandscape}
              onFocus={(item: { value?: number }) => {
                if (typeof item?.value === "number") {
                  setSelectedOverallValue(item.value);
                }
              }}
              height={180}
              color={activeTone.accent}
              thickness={3}
              startFillColor="#27b1fa"
              endFillColor="#2faf7f"
              startOpacity={0.3}
              endOpacity={0.1}
              curved
              maxValue={overallAxisConfig.maxValue}
              yAxisOffset={overallAxisConfig.yAxisOffset}
              dataPointsColor={activeTone.accent}
              dataPointsRadius={5}
              hideDataPoints={false}
              textColor="#edebea"
              textFontSize={10}
              yAxisTextStyle={{
                color: `${isDark ? "#edebea" : "#2f3035"}`,
                fontSize: 11,
              }}
              stripOpacity={0.4}
              xAxisLabelsHeight={0}
              rulesColor="#4a5568"
              rulesType="solid"
              yAxisLabelSuffix="%"
              noOfSections={4}
              hideRules={true}
              xAxisThickness={0}
              yAxisThickness={0}
              showStripOnFocus
              unFocusOnPressOut={false}
              focusedDataPointColor={activeTone.accent}
              focusedDataPointRadius={6}
              formatYLabel={(value) => `${Math.round(Number(value))}`}
            />
          </View>
        </LiquidGlassView>

        {/* learning cats */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
            >
              {courseData?.reportType === "oe"
                ? `Overall Expectations`
                : `Learning Categories`}
            </Text>

            <View style={{ minWidth: 150 }} className="">
              <Dropdown
                style={[
                  styles.dropdown,
                  isDark
                    ? [styles.dropdownDark, { backgroundColor: activeTone.bg3 }]
                    : [
                        styles.dropdownLight,
                        { backgroundColor: activeTone.bg3 },
                      ],
                ]}
                onFocus={() => {
                  // dropdown opened
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Soft);
                }}
                data={categoryOptions}
                labelField="label"
                valueField="value"
                mode="auto"
                dropdownPosition="bottom"
                placeholder="Select item"
                value={selectedCategoryKey}
                placeholderStyle={
                  isDark ? styles.dropdownTextDark : styles.dropdownTextLight
                }
                selectedTextStyle={
                  isDark ? styles.dropdownTextDark : styles.dropdownTextLight
                }
                itemTextStyle={
                  isDark ? styles.dropdownItemDark : styles.dropdownItemLight
                }
                containerStyle={
                  isDark
                    ? [
                        styles.dropdownDark,
                        {
                          backgroundColor: activeTone.bg4,
                          borderColor: activeTone.bg4,
                          borderRadius: 8,
                        },
                      ]
                    : [
                        styles.dropdownLight,
                        {
                          backgroundColor: activeTone.bg4,
                          borderColor: activeTone.bg4,
                          borderRadius: 8,
                        },
                      ]
                }
                activeColor={`${activeTone.accent}85`}
                renderItem={(item, selected) => {
                  return (
                    <View
                      style={{
                        flex: 1,
                        margin: 7,
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={[
                          isDark
                            ? styles.dropdownItemDark
                            : styles.dropdownItemLight,
                          { lineHeight: 16 },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  );
                }}
                itemContainerStyle={
                  isDark ? styles.dropdownMenuDark : styles.dropdownMenuLight
                }
                onChange={(item: { value: string }) => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  setSelectedCategoryKey(item.value);
                }}
              />
            </View>
          </View>

          {selectedCategoryData.length === 0 ? (
            <LiquidGlassView
              className="rounded-xl p-6 "
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-center text-sm`}
              >
                No data yet for this category.
              </Text>
            </LiquidGlassView>
          ) : (
            <LiquidGlassView
              className="rounded-xl p-4 pb-7 "
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
                >
                  {selectedCategory.name}
                </Text>
                <Text
                  style={{ color: selectedCategory.color }}
                  className={`font-[${selectedCategory.color} font-bold text-xl`}
                >
                  {formatSelectedValue(
                    selectedCategoryValue,
                    selectedCategoryValueAdjustment,
                  )}
                </Text>
              </View>
              <View className="pr-2">
                <LineChart
                  data={selectedCategoryData}
                  isAnimated={!isLandscape}
                  scrollAnimation={!isLandscape}
                  height={150}
                  spacing={selectedCategoryData.length > 4 ? 45 : 55}
                  initialSpacing={15}
                  endSpacing={15}
                  color={selectedCategory.color}
                  thickness={3}
                  curved
                  focusEnabled
                  onFocus={(item: { value?: number }) => {
                    if (typeof item?.value === "number") {
                      setSelectedCategoryValue(item.value);
                    }
                  }}
                  showStripOnFocus
                  showTextOnFocus={false}
                  dataPointsColor={selectedCategory.color}
                  dataPointsRadius={4}
                  yAxisTextStyle={{
                    color: `${isDark ? "#edebea" : "#2f3035"}`,
                    fontSize: 11,
                  }}
                  xAxisLabelsHeight={0}
                  yAxisLabelSuffix="%"
                  maxValue={selectedCategoryAxisConfig.maxValue}
                  yAxisOffset={selectedCategoryAxisConfig.yAxisOffset}
                  stripOpacity={0.4}
                  noOfSections={4}
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  formatYLabel={(value) => `${Math.round(Number(value))}`}
                  unFocusOnPressOut={false}
                  focusedDataPointColor={selectedCategory.color}
                  focusedDataPointRadius={6}
                />
              </View>
            </LiquidGlassView>
          )}
        </View>

        {/* assignment overview here */}
        <LiquidGlassView
          className="rounded-xl p-4 pb-1 mb-6 "
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-4`}
          >
            Assignment Overview
          </Text>
          <View className={`mr-4 flex items-center justify-center`}>
            <BarChart
              data={assignmentData}
              isAnimated={!isLandscape}
              scrollAnimation={!isLandscape}
              height={230}
              barWidth={30}
              spacing={12}
              roundedTop
              hideRules={true}
              xAxisThickness={0}
              yAxisThickness={0}
              xAxisColor="#292929"
              yAxisColor="#292929"
              yAxisTextStyle={{
                color: `${isDark ? "#edebea" : "#2f3035"}`,
                fontSize: 11,
              }}
              topLabelTextStyle={{
                color: `${isDark ? "#2f3035" : "#edebea"}`,
                fontSize: 13,
                fontWeight: "700",
              }}
              showValuesAsTopLabel
              topLabelContainerStyle={{
                marginTop: 20,
              }}
              xAxisLabelTextStyle={{ color: "#ffffff00" }}
              noOfSections={4}
              maxValue={100}
              yAxisLabelSuffix="%"
              animationDuration={1000}
              initialSpacing={15}
              endSpacing={15}
              formatYLabel={(value) => `${Math.round(Number(value))}`}
            />
          </View>
        </LiquidGlassView>

        {/* random stuff */}
        <LiquidGlassView
          className="rounded-xl p-4  mb-6"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
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
              Highest Score
            </Text>
            <Text className={`text-success font-bold`}>
              {getVisualGradeValue(
                Math.max(
                  ...chronologicalAssignments.map(
                    (a) => calculateWeightedMark(a.categories) || 0,
                  ),
                ),
              )}
              %
            </Text>
          </View>
          <View className={`flex-row justify-between mb-3`}>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
            >
              Lowest Score
            </Text>
            <Text className={`text-danger font-bold`}>
              {getVisualGradeValue(
                Math.min(
                  ...chronologicalAssignments.map(
                    (a) => calculateWeightedMark(a.categories) || 0,
                  ),
                ),
              )}
              %
            </Text>
          </View>
          <View className={`flex-row justify-between mb-3`}>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
            >
              Average Score
            </Text>
            <Text className={`text-baccent font-bold`}>
              {getVisualGradeValue(
                Math.round(
                  chronologicalAssignments.reduce(
                    (sum, a) =>
                      sum + (calculateWeightedMark(a.categories) || 0),
                    0,
                  ) / chronologicalAssignments.length,
                ),
              )}
              %
            </Text>
          </View>
          <View className={`flex-row justify-between`}>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
            >
              Total Assignments
            </Text>
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} font-bold`}
            >
              {courseData?.assignments.length ?? 0}
            </Text>
          </View>
        </LiquidGlassView>
        {courseData?.reportType === "oe" ? (
          <LiquidGlassView
            className="rounded-xl p-4  mb-2"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-4`}
            >
              Overall Expectations
            </Text>

            {courseData.summary.categories.length > 0 ? (
              courseData.summary.categories.map((category, index) => (
                <View
                  key={category.key ?? category.name}
                  className={`${index === courseData.summary.categories.length - 1 ? "" : "mb-3"}`}
                >
                  <View className="flex-row justify-between items-start gap-3">
                    <Text
                      className={`${isDark ? "text-appgraylight" : "text-appgraydark"} flex-1`}
                    >
                      {category.name}
                    </Text>
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} font-bold`}
                    >
                      {category.achievement || "--"}
                    </Text>
                  </View>
                  {category.weighting ? (
                    <Text
                      className={`${isDark ? "text-appgraydark" : "text-appgraylight"} text-xs mt-1`}
                    >
                      Total weight: {category.weighting}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm`}
              >
                No expectation summary was available in this report.
              </Text>
            )}
          </LiquidGlassView>
        ) : (
          <LiquidGlassView
            className="rounded-xl p-4  mb-2"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-4`}
            >
              Course Weightings
            </Text>

            <View className={`flex-row justify-between mb-3`}>
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
              >
                Knowledge/Understanding
              </Text>
              <Text className={`text-baccent font-bold`}>
                {courseData?.summary?.courseWeightings?.knowledge ?? ""}
              </Text>
            </View>

            <View className={`flex-row justify-between mb-3`}>
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
              >
                Thinking
              </Text>
              <Text className={`text-success font-bold`}>
                {courseData?.summary?.courseWeightings?.thinking ?? ""}
              </Text>
            </View>

            <View className={`flex-row justify-between mb-3`}>
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
              >
                Communication
              </Text>
              <Text className={`text-caution font-bold`}>
                {courseData?.summary?.courseWeightings?.communication ?? ""}
              </Text>
            </View>

            <View className={`flex-row justify-between mb-3`}>
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
              >
                Application
              </Text>
              <Text className={`text-danger font-bold`}>
                {courseData?.summary?.courseWeightings?.application ?? ""}
              </Text>
            </View>
            <View className={`flex-row justify-between`}>
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"}`}
              >
                Other/Culminating
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} font-bold`}
              >
                {otherWeightingDisplay}
              </Text>
            </View>
          </LiquidGlassView>
        )}
        <Text
          className={`${isDark ? "text-appgraydark" : "text-appgraylight"} text-center mt-3 text-xs`}
        >
          {courseData?.reportType === "oe"
            ? `OE reports do not expose KTCA weightings.${`\n`}Analytics use assignment and expectation averages instead.`
            : `Analytics are based on summative assignments only.${`\n`}The cake is a lie!`}
        </Text>
      </View>
    );
  };
  const courseAverage = calculateCourseAverage();
  const otherWeightingDisplay = courseData?.summary?.courseWeightings
    ? formatWeightingValue(
        parseWeightingValue(courseData.summary.courseWeightings.other) +
          parseWeightingValue(courseData.summary.courseWeightings.final),
      )
    : "";
  const fallbackCourseName =
    storedCourses.find(
      (course) =>
        String(course.subjectId ?? "") === String(subjectIdValue ?? ""),
    )?.courseName ?? "Course";
  const displayCourseName =
    courseData?.courseName && courseData.courseName !== "Course"
      ? courseData.courseName
      : fallbackCourseName;
  const showAddAssignmentButton =
    isEditMode && (activeTab === "courses" || isLandscape);
  const addAssignmentButton = showAddAssignmentButton ? (
    <View className="mb-4">
      {!showAddAssignment ? (
        <LiquidGlassButton
          className="rounded-xl p-4 items-center "
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
          onPress={() => {
            setShowAssignmentModal(true);
            hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <Text className={`text-baccent text-lg font-semibold mb-1`}>
            + Add Evaluation
          </Text>
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm text-center`}
          >
            Project your performance with custom evaluations
          </Text>
        </LiquidGlassButton>
      ) : null}
    </View>
  ) : null;

  return (
    <View className={`${isDark ? "bg-dark1" : "bg-light1"} flex-1`}>
      <PageBackground />
      <BackButton path={"/courses"} />
      <LiquidGlassButton
        containerStyle={{
          position: "absolute",
          top: 60,
          right: 20,
          zIndex: 50,
        }}
        contentStyle={{
          width: liquidGlassEnabled ? 48 : undefined,
          height: liquidGlassEnabled ? 48 : undefined,
          borderRadius: liquidGlassEnabled ? 999 : 12,
          padding: liquidGlassEnabled ? 0 : 8,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.18 : 0.1,
          shadowRadius: 8,
          shadowOffset: {
            width: 0,
            height: 4,
          },
          elevation: 4,
        }}
        glassTintColor={isEditMode ? activeTone.accent : activeTone.bg4}
        fallbackBackgroundColor={
          isEditMode ? activeTone.accent : activeTone.bg4
        }
        onPress={() => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          setIsEditMode(!isEditMode);
        }}
      >
        <Image
          className={liquidGlassEnabled ? "w-6 h-6" : "w-7 h-7"}
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
      </LiquidGlassButton>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {isLandscape && (
          <Text
            className={`mt-16 text-center ${isDark ? "text-appwhite" : "text-appblack"} text-3xl font-semibold`}
          >
            {isLoading && !courseData ? "Loading..." : displayCourseName}
          </Text>
        )}
        {/* i know... */}
        {!isLandscape && (
          <>
            <View className="mt-10"></View>
            <View className="mt-10"></View>
            <View className="mt-3"></View>
          </>
        )}
        {isLandscape && <View className="mt-3"></View>}
        <View className={`px-5 mt-7`}>
          {!isLandscape && (
            <Text
              className={`text-center ${isDark ? "text-appwhite" : "text-appblack"} text-4xl font-semibold mb-3`}
            >
              {isLoading && !courseData ? "Loading..." : displayCourseName}
            </Text>
          )}
          {/* 
          <Text
            className={` text-center rounded-xl font-medium mb-5 ${isDark ? "text-appgraydark" : "text-appgraydark"}`}
          >
            {message}
          </Text>*/}
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color={activeTone.accent} />
            </>
          ) : courseData && courseData.success ? (
            <View className={`w-full`}>
              {/* grade summary */}
              {courseData.summary && (
                <View className="mb-6">
                  {isDemoAccount ? (
                    <LiquidGlassView
                      className="rounded-xl p-6 w-full relative overflow-hidden"
                      fallbackBackgroundColor={activeTone.bg3}
                      glassTintColor={activeTone.bg2}
                      glassEffectStyle="clear"
                    >
                      <View className="flex-row justify-between gap-4">
                        {/* Left content - takes remaining space */}
                        <View style={{ zIndex: 1, flex: 1 }}>
                          <View className="flex-row items-center justify-between mb-1">
                            <View className="flex-row items-center">
                              <View
                                className={`w-2 h-2 ${
                                  isDark ? "bg-appwhite/60" : "bg-appblack"
                                } rounded-full mr-2`}
                              />
                              <Text
                                className={`${
                                  isDark ? "text-appwhite/60" : "text-appblack"
                                } text-sm font-normal`}
                              >
                                Excellent Performance
                              </Text>
                            </View>
                          </View>

                          <Text
                            className={`${isDark ? "text-appwhite" : "text-appblack"}`}
                          >
                            Period 2
                          </Text>

                          <Text
                            className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-bold`}
                          >
                            English
                          </Text>

                          <Text
                            className={`${isDark ? "text-appwhite/80" : "text-appblack/80"}`}
                          >
                            ENG2D1 • Room 67
                          </Text>

                          <View className="flex-row items-center mt-3 flex-wrap">
                            <View
                              className="mr-2 bg-baccent/85 rounded-xl px-3 py-1 mb-2"
                              style={{ alignSelf: "flex-start" }}
                            >
                              <Text className="text-appblack text-sm font-medium">
                                Midterm {shouldForceVisualHundreds ? 100 : 86}%
                              </Text>
                            </View>

                            <View
                              className="bg-success/90 rounded-xl px-3 py-1 mb-2"
                              style={{ alignSelf: "flex-start" }}
                            >
                              <Text className="text-appblack text-sm font-medium">
                                Final {shouldForceVisualHundreds ? 100 : 91}%
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Right content - fixed width */}
                        <View style={{ flexShrink: 0 }} className="mt-10">
                          <View className="items-center justify-center">
                            <AnimatedProgressWheel
                              size={90}
                              width={10}
                              color={"#2faf7f"}
                              backgroundColor={activeTone.bg4}
                              progress={shouldForceVisualHundreds ? 100 : 91}
                              max={100}
                              rounded={true}
                              rotation={"-90deg"}
                              duration={400}
                              delay={75}
                              // label is bad
                              showProgressLabel={false}
                            />

                            <View className="absolute">
                              <Text
                                style={{
                                  color: "#2faf7f",
                                  fontSize: 17,
                                  fontWeight: "600",
                                }}
                              >
                                {shouldForceVisualHundreds ? 100 : 90.8}%
                                {/* TA only has up to 1 */}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </LiquidGlassView>
                  ) : (
                    <QuickCourse
                      courses={storedCourses}
                      subjectId={subjectIdValue}
                      overrideCourseMark={courseAverage}
                      isLoading={!hasLoadedStoredCourses}
                    />
                  )}
                </View>
              )}

              {/* tabs */}
              {!isLandscape && (
                <LiquidGlassView
                  className="flex-row mb-6 gap-2 p-3 rounded-xl "
                  fallbackBackgroundColor={activeTone.bg3}
                  glassTintColor={activeTone.bg2}
                  glassEffectStyle="clear"
                >
                  {renderTabButton("courses", "Evaluations")}
                  {renderTabButton("analytics", "Analytics")}
                </LiquidGlassView>
              )}

              {!isLandscape && addAssignmentButton}

              {isLandscape ? (
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-bold mb-4`}
                    >
                      Evaluations
                    </Text>
                    {addAssignmentButton}
                    {renderCoursesTab()}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-bold mb-4`}
                    >
                      Analytics
                    </Text>
                    {renderAnalyticsTab()}
                  </View>
                </View>
              ) : activeTab === "courses" ? (
                renderCoursesTab()
              ) : (
                renderAnalyticsTab()
              )}
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
  },
  dropdown: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  dropdownDark: {
    borderRadius: 8,
  },
  dropdownLight: {
    borderRadius: 8,
  },
  dropdownTextDark: {
    color: "#edebea",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  dropdownTextLight: {
    color: "#2f3035",
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownItemDark: {
    color: "#edebea",
    fontSize: 13,
    fontWeight: "600",
    marginVertical: 3,
    marginHorizontal: 2,
    borderRadius: 0,
  },
  dropdownItemLight: {
    color: "#2f3035",
    fontSize: 13,
    fontWeight: "600",
    marginVertical: 3,
    marginHorizontal: 2,
    borderRadius: 0,
  },
  dropdownMenuDark: {
    padding: 1,
    borderRadius: 0,
  },
  dropdownMenuLight: {
    backgroundColor: "#e7e7e9",
    borderRadius: 0,
  },
});

export default CourseViewScreen;
