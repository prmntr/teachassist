import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SectionList,
  StyleSheet,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import {
  compareGradeSnapshots,
  loadGradeHistory,
  seedGradeHistoryFromStorage,
  type GradeHistoryChange,
  type GradeHistorySnapshot,
} from "@/utils/gradeHistory";
import { hapticsImpact } from "@/utils/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";

// Toggle this to true to fill the timeline with mock changes for each type of grade update
const MOCK_GRADE_UPDATES = false;

type TimelineEntry = {
  id: string;
  snapshot: GradeHistorySnapshot;
  change: GradeHistoryChange;
  subjectId?: string;
};

type TimelineSection = {
  label: string;
  entries: TimelineEntry[];
};

type UpdateFilter = "all" | "assignments" | "courses" | "average";

const FILTER_OPTIONS: { label: string; value: UpdateFilter }[] = [
  { label: "All updates", value: "all" },
  { label: "Assignments", value: "assignments" },
  { label: "Courses", value: "courses" },
  { label: "Average", value: "average" },
];

const formatCompactGrade = (value: string | null) => value ?? "--";

const formatChangeDelta = (change: GradeHistoryChange) => {
  if (change.delta === null) return null;
  const absoluteDelta = Math.abs(change.delta).toFixed(1).replace(/\.0$/, "");
  if (
    change.type === "average-changed" ||
    change.type === "grade-changed" ||
    change.type === "assignment-changed"
  ) {
    return `${absoluteDelta}%`;
  }
  if (change.type === "grade-posted" || change.type === "assignment-added") {
    return `${absoluteDelta}%`;
  }
  return null;
};

const CHANGE_CATEGORY_COLORS = {
  assignment: "#8b5cf699",
  course: "#27b1fa99",
  average: "#f59e0b99",
};

const CHANGE_DIRECTION_COLORS = {
  positive: "#2faf7f",
  negative: "#ef4444",
};

const changeAccentColor = (change: GradeHistoryChange) => {
  if (change.type === "average-changed") {
    return CHANGE_CATEGORY_COLORS.average;
  }

  if (
    change.type === "assignment-added" ||
    change.type === "assignment-changed" ||
    change.type === "assignment-removed"
  ) {
    return CHANGE_CATEGORY_COLORS.assignment;
  }

  return CHANGE_CATEGORY_COLORS.course;
};

const changeDirectionColor = (change: GradeHistoryChange) => {
  const hasDirectionalDelta =
    change.type === "average-changed" ||
    change.type === "grade-changed" ||
    change.type === "assignment-added" ||
    change.type === "assignment-changed";

  if (!hasDirectionalDelta || change.delta === null) {
    return changeAccentColor(change);
  }

  return change.delta >= 0
    ? CHANGE_DIRECTION_COLORS.positive
    : CHANGE_DIRECTION_COLORS.negative;
};

const getChangeTitle = (change: GradeHistoryChange) => {
  if (change.type === "average-changed") return "Overall Average";
  if (change.assignmentName) return change.assignmentName;
  return change.courseName ?? change.courseCode;
};

const getChangeSubtitle = (change: GradeHistoryChange) => {
  switch (change.type) {
    case "average-changed":
      return "Average changed";
    case "assignment-added":
      return "Assignment added";
    case "assignment-changed":
      return "Assignment changed";
    case "assignment-removed":
      return "Assignment removed";
    case "grade-changed":
      return "Mark changed";
    case "grade-posted":
      return "Mark posted";
    case "grade-hidden":
      return "Mark hidden";
    case "course-added":
      return "Course added";
    case "course-removed":
      return "Course removed";
    default:
      return change.summary;
  }
};

const getChangeDetail = (change: GradeHistoryChange) => {
  if (change.type === "average-changed") {
    return "";
  }
  if (
    change.type === "assignment-added" ||
    change.type === "assignment-changed" ||
    change.type === "assignment-removed"
  ) {
    return `${change.courseName} | ${change.courseCode}`;
  }
  if (change.type === "grade-posted") {
    return change.courseCode;
  }
  if (change.type === "grade-hidden") {
    return "Mark no longer visible";
  }
  if (change.type === "course-added" || change.type === "course-removed") {
    return change.courseCode;
  }
  return change.courseCode;
};

const getSectionLabel = (capturedAt: string) => {
  const target = new Date(capturedAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const targetDay = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );

  if (targetDay.getTime() === today.getTime()) return "Today";
  if (targetDay.getTime() === yesterday.getTime()) return "Yesterday";

  return target.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
};

const getTimeLabel = (capturedAt: string) =>
  new Date(capturedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const getChangeIcon = (change: GradeHistoryChange) => {
  switch (change.type) {
    case "average-changed":
      return <Ionicons name="stats-chart" size={22} color="#edebea" />;
    case "assignment-added":
    case "assignment-changed":
      return <Ionicons name="reader" size={24} color="#edebea" />;
    case "assignment-removed":
      return <Ionicons name="document" size={24} color="#edebea" />;
    case "grade-changed":
      return (
        <MaterialCommunityIcons name="percent" size={24} color="#edebea" />
      );
    case "grade-posted":
      return <Ionicons name="document-text" size={24} color="#edebea" />;
    case "grade-hidden":
      return <Ionicons name="eye-off" size={24} color="#edebea" />;
    case "course-added":
      return <Ionicons name="add-circle" size={24} color="#edebea" />;
    case "course-removed":
      return <Ionicons name="remove-circle" size={24} color="#edebea" />;
    default:
      return <Ionicons name="ellipse" size={16} color="#edebea" />;
  }
};

const GradeUpdatesScreen = () => {
  const { isDark, activeTone } = useTheme();
  const router = useRouter();
  const [history, setHistory] = useState<GradeHistorySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<UpdateFilter>("all");

  useEffect(() => {
    const loadTimeline = async () => {
      setLoading(true);
      if (MOCK_GRADE_UPDATES) {
        const now = Date.now();
        const baseCourse = {
          key: "code:HFA4U1-3",
          courseCode: "ENG2D1",
          courseName: "English",
          semester: 1,
          subjectId: "1",
          room: "203",
          block: "3",
          grade: "83.3%",
          numericGrade: 83.3,
          hasVisibleGrade: true,
        };
        const snapshots: GradeHistorySnapshot[] = [
          {
            id: `${now}-a`,
            capturedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
            source: "cache" as const,
            average: 85.0,
            courseCount: 1,
            courses: [baseCourse],
          },
          {
            id: `${now}-b`,
            capturedAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
            source: "cache" as const,
            average: 85.5,
            courseCount: 1,
            courses: [{ ...baseCourse, grade: "84.8%", numericGrade: 84.8 }],
          },
          {
            id: `${now}-c`,
            capturedAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
            source: "cache" as const,
            average: 85.5,
            courseCount: 1,
            courses: [{ ...baseCourse, grade: "86.3%", numericGrade: 86.3 }],
          },
          {
            id: `${now}-d`,
            capturedAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
            source: "cache" as const,
            average: 85.5,
            courseCount: 2,
            courses: [
              { ...baseCourse, grade: "86.3%", numericGrade: 86.3 },
              {
                key: "code:HFA4U1-3-assignment",
                courseCode: "CHC2D1-3",
                courseName: "Canadian History Since WW2",
                semester: 1,
                subjectId: "2",
                room: "203",
                block: "3",
                grade: "69.6%",
                numericGrade: 69.6,
                hasVisibleGrade: true,
              },
            ],
          },
        ];
        setHistory(snapshots);
        setLoading(false);
        return;
      }
      await seedGradeHistoryFromStorage("cache");
      const storedHistory = await loadGradeHistory();
      setHistory(storedHistory);
      setLoading(false);
    };
    loadTimeline();
  }, []);

  const sections = useMemo((): TimelineSection[] => {
    const entries = history
      .map((snapshot, index) => {
        const previous = index > 0 ? history[index - 1] : null;
        return compareGradeSnapshots(previous, snapshot).map(
          (change, changeIndex) => ({
            id: `${snapshot.id}-${change.summary}-${changeIndex}`,
            snapshot,
            change,
            subjectId:
              snapshot.courses.find((course) => course.key === change.courseKey)
                ?.subjectId ??
              previous?.courses.find(
                (course) => course.key === change.courseKey,
              )?.subjectId,
          }),
        );
      })
      .flat()
      .reverse()
      .filter((entry) => {
        if (selectedFilter === "all") return true;
        if (selectedFilter === "average") {
          return entry.change.type === "average-changed";
        }
        if (selectedFilter === "assignments") {
          return entry.change.type.startsWith("assignment-");
        }
        return (
          entry.change.type === "grade-changed" ||
          entry.change.type === "grade-posted" ||
          entry.change.type === "grade-hidden" ||
          entry.change.type === "course-added" ||
          entry.change.type === "course-removed"
        );
      });

    return entries.reduce<TimelineSection[]>((groups, entry) => {
      const label = getSectionLabel(entry.snapshot.capturedAt);
      const currentGroup = groups[groups.length - 1];
      if (currentGroup?.label === label) {
        currentGroup.entries.push(entry);
        return groups;
      }
      groups.push({ label, entries: [entry] });
      return groups;
    }, []);
  }, [history, selectedFilter]);

  const totalUpdates = useMemo(
    () => sections.reduce((sum, section) => sum + section.entries.length, 0),
    [sections],
  );

  const renderHeader = () => (
    <View>
      <Text
        className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
      >
        Grade Updates
      </Text>
      <Text
        className={`mt-3 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
      >
        A timeline of detected changes to your average, courses, and
        assignments.
      </Text>

      <View className="mt-5 flex-row items-center justify-between gap-3">
        <Text
          className={`text-lg font-semibold ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          {totalUpdates} {totalUpdates === 1 ? "update" : "updates"}
        </Text>
        <View style={{ width: 168 }} className="">
          <Dropdown
            style={[
              styles.dropdown,
              { backgroundColor: activeTone.bg3 },
              isDark ? styles.dropdownDark : styles.dropdownLight,
            ]}
            onFocus={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Soft);
            }}
            data={FILTER_OPTIONS}
            labelField="label"
            valueField="value"
            mode="auto"
            dropdownPosition="bottom"
            placeholder="Filter"
            value={selectedFilter}
            placeholderStyle={
              isDark ? styles.dropdownTextDark : styles.dropdownTextLight
            }
            selectedTextStyle={
              isDark ? styles.dropdownTextDark : styles.dropdownTextLight
            }
            itemTextStyle={
              isDark ? styles.dropdownItemDark : styles.dropdownItemLight
            }
            containerStyle={[
              isDark ? styles.dropdownDark : styles.dropdownLight,
              {
                backgroundColor: activeTone.bg4,
                borderColor: activeTone.bg4,
                borderRadius: 8,
                overflow: "hidden",
              },
            ]}
            activeColor={`${activeTone.accent}85`}
            renderItem={(item) => (
              <View style={styles.dropdownItem}>
                <Text
                  style={[
                    isDark ? styles.dropdownItemDark : styles.dropdownItemLight,
                    { lineHeight: 16 },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            )}
            itemContainerStyle={
              isDark ? styles.dropdownMenuDark : styles.dropdownMenuLight
            }
            onChange={(item: { value: UpdateFilter }) => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              setSelectedFilter(item.value);
            }}
          />
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <LiquidGlassView
      containerClassName="flex-1 mt-6 mb-2"
      className={`${isDark ? "bg-dark3" : "bg-light3"} flex-1 rounded-xl p-5`}
      fallbackBackgroundColor={activeTone.bg3}
      glassTintColor={activeTone.bg3}
      glassEffectStyle="clear"
    >
      <View className="flex-1 items-center justify-center px-8 py-12">
        <Image
          source={require("../assets/images/not_found.png")}
          className="w-25 h-25 mb-3"
          style={{ tintColor: activeTone.accent }}
        />
        <Text
          className={`${isDark ? "text-light3" : "text-dark3"} text-xl font-semibold text-center mb-2`}
        >
          No updates yet
        </Text>
        <Text className="text-gray-400 text-center text-lg leading-6">
          No grade changes match the current filter.
        </Text>
      </View>
    </LiquidGlassView>
  );

  const renderUpdate = ({
    item,
  }: {
    item: TimelineEntry;
    section: TimelineSection;
  }) => {
    const { snapshot, change, subjectId } = item;
    const accentColor = changeAccentColor(change);
    const directionColor = changeDirectionColor(change);
    const deltaLabel = formatChangeDelta(change);
    const isPressable = change.type !== "average-changed" && Boolean(subjectId);
    const isTrend =
      change.type === "average-changed" ||
      change.type === "grade-changed" ||
      change.type === "assignment-added" ||
      change.type === "assignment-changed";
    const showTransition =
      change.previousGrade !== null && change.currentGrade !== null;
    const showCurrentOnly =
      !showTransition &&
      change.currentGrade !== null &&
      change.type !== "course-removed" &&
      change.type !== "grade-hidden" &&
      change.type !== "assignment-removed";

    return (
      <LiquidGlassButton
        activeOpacity={isPressable ? 0.88 : 1}
        disabled={!isPressable}
        onPress={() => {
          if (!subjectId) return;
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          router.push(`/courseview/${subjectId}`);
        }}
        fallbackBackgroundColor={activeTone.bg3}
        glassTintColor={activeTone.bg2}
        glassEffectStyle="clear"
        className="mb-3 overflow-hidden rounded-xl p-4 "
      >
        <View className="flex-row items-start gap-3">
          <View
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            {getChangeIcon(change)}
          </View>

          <View className="flex-1 min-w-0">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 min-w-0">
                <Text
                  numberOfLines={2}
                  className={`text-[17px] font-bold leading-6 ${isDark ? "text-appwhite" : "text-appblack"}`}
                >
                  {getChangeTitle(change)}
                </Text>
                <Text
                  numberOfLines={1}
                  className={`mt-1 text-sm font-semibold ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
                >
                  {getChangeSubtitle(change)}
                </Text>
              </View>

              {deltaLabel ? (
                <View
                  className="flex-row items-center rounded-full px-3 py-1.5"
                  style={{ backgroundColor: `${directionColor}20` }}
                >
                  {isTrend && (
                    <Ionicons
                      name={
                        (change.delta ?? 0) >= 0 ? "arrow-up" : "arrow-down"
                      }
                      size={15}
                      color={directionColor}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    className="text-sm font-bold"
                    style={{ color: directionColor }}
                  >
                    {deltaLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            {showTransition ? (
              <View className="mt-3 flex-row items-center gap-2">
                <Text
                  className={`text-lg font-semibold ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
                >
                  {formatCompactGrade(change.previousGrade)}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={isDark ? "#6d6e77" : "#85868e"}
                />
                <Text
                  className={`text-xl font-bold ${isDark ? "text-appwhite" : "text-appblack"}`}
                >
                  {formatCompactGrade(change.currentGrade)}
                </Text>
              </View>
            ) : showCurrentOnly ? (
              <Text
                className={`mt-3 text-xl font-bold ${isDark ? "text-appwhite" : "text-appblack"}`}
              >
                {formatCompactGrade(change.currentGrade)}
              </Text>
            ) : null}

            <View className="mt-3 flex-row items-center justify-between gap-3">
              <Text
                numberOfLines={1}
                className={`flex-1 text-sm ${isDark ? "text-appgraydark" : "text-appgraydark"}`}
              >
                {getChangeDetail(change)}
              </Text>
              <View className="flex-row items-center gap-1">
                <Text
                  className={`text-xs font-medium ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
                >
                  {getTimeLabel(snapshot.capturedAt)}
                </Text>
                {isPressable ? (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isDark ? "#85868e" : "#6d6e77"}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </LiquidGlassButton>
    );
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/courses" />
      <SectionList
        showsVerticalScrollIndicator={false}
        sections={
          loading
            ? []
            : sections.map((section) => ({
                ...section,
                data: section.entries,
              }))
        }
        keyExtractor={(item) => item.id}
        renderItem={renderUpdate}
        renderSectionHeader={({ section }) => (
          <Text
            className={`mb-3 mt-6 px-1 text-xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
          >
            {section.label}
          </Text>
        )}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {loading ? (
              <View className="py-20">
                <ActivityIndicator color={activeTone.accent} size="large" />
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        ListFooterComponent={
          !loading && totalUpdates > 0 ? (
            <Text
              className={`pt-6 pb-3 text-center text-base font-medium ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
            >
              you{`'`}ve reached the end
            </Text>
          ) : null
        }
        className="px-5"
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40, flexGrow: 1 }}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        stickySectionHeadersEnabled={false}
        removeClippedSubviews
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
  dropdownItem: {
    justifyContent: "center",
    paddingHorizontal: 12, // Use padding instead of margin
    paddingVertical: 10, 
  },
  dropdownItemDark: {
    color: "#edebea",
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownItemLight: {
    color: "#2f3035",
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownMenuDark: {
    padding: 1,
    borderRadius: 0,
  },
  dropdownMenuLight: {
    borderRadius: 0,
  },
});

export default GradeUpdatesScreen;
