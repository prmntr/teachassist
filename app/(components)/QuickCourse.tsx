import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AnimatedProgressWheel from "react-native-progress-wheel";
import { hapticsImpact } from "../(utils)/haptics";
import { useTheme } from "../contexts/ThemeContext";
import { Course } from "./CourseParser";

interface CourseInfoBoxProps {
  course: Course; // pass the course directly instead of loading it
  hideMarksUntilTap?: boolean;
  overrideCourseMark?: number | null;
}

interface DisplayCourse {
  courseName: string;
  courseCode: string;
  courseMark: string;
  currentMark: string | null;
  midtermMark: string | null;
  finalMark: string | null;
  block: string;
  room: string;
  semester: number;
  hasGrade: boolean;
}

const isNumericMark = (mark: string): boolean =>
  /^\d+(\.\d+)?%?$/.test(mark.trim());

const getCurrentMark = (course: Course): string | null => {
  if (!course.hasGrade) return null;
  if (!course.grade || course.grade === "See teacher") return null;
  if (!isNumericMark(course.grade)) return null;
  return course.grade.trim();
};

export const CourseInfoBox = ({
  course,
  hideMarksUntilTap = false,
  overrideCourseMark,
}: CourseInfoBoxProps) => {
  const { isDark } = useTheme();
  const [revealCourseMark, setRevealCourseMark] = useState(false);
  const [revealMidtermMark, setRevealMidtermMark] = useState(false);
  const [revealFinalMark, setRevealFinalMark] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const displayCourse = useMemo((): DisplayCourse => {
    const overrideMark =
      typeof overrideCourseMark === "number" &&
      Number.isFinite(overrideCourseMark)
        ? overrideCourseMark
        : null;
    const currentMark = getCurrentMark(course);
    const midtermMark = course.midtermMark ?? null;
    const finalMark = course.finalMark ?? null;
    const resolvedCurrentMark =
      overrideMark !== null ? overrideMark.toFixed(1) : currentMark;
    const hasGrade = resolvedCurrentMark !== null;
    const courseMark = resolvedCurrentMark ?? "N/A";

    // change course to displaycourse
    return {
      courseName: course.courseName,
      courseCode: course.courseCode,
      courseMark,
      currentMark: resolvedCurrentMark,
      midtermMark,
      finalMark,
      block: course.block,
      room: course.room,
      semester: course.semester,
      hasGrade,
    };
  }, [course, overrideCourseMark]);

  useEffect(() => {
    if (hideMarksUntilTap) {
      setRevealCourseMark(false);
      setRevealMidtermMark(false);
      setRevealFinalMark(false);
    }
  }, [
    hideMarksUntilTap,
    displayCourse.courseMark,
    displayCourse.midtermMark,
    displayCourse.finalMark,
  ]);

  const showCourseMark = !hideMarksUntilTap || revealCourseMark;
  const showMidtermMark = !hideMarksUntilTap || revealMidtermMark;
  const showFinalMark = !hideMarksUntilTap || revealFinalMark;
  const hasTermMarksWithoutCurrent = Boolean(
    !displayCourse.currentMark &&
      (displayCourse.midtermMark || displayCourse.finalMark),
  );
  const showStaleIndicator = Boolean(
    course.isGradeStale || hasTermMarksWithoutCurrent,
  );

  const staleInfoModal = (
    <Modal visible={showInfo} transparent animationType="slide">
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl py-6 px-6 w-full max-w-md`}
        >
          <View className="flex items-center mb-6">
            <Image
              source={require("../../assets/images/cobweb-book.png")}
              className="w-56 h-29 object-contain"
            ></Image>
          </View>
          <View className="flex-row items-center mb-4">
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
            >
              Stale Grades
            </Text>
          </View>
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} mb-4`}
          >
            From time to time, teachers may choose to hide courses from
            students, preventing them from checking their marks. The TeachAssist
            app attempts to store the last known version of the course, allowing
            you to check your grades.
            {`\n\n`}
            <Text className="font-semibold text-baccent">
              Note: Your mark and assignments may not reflect the most up to
              date version.
            </Text>
          </Text>
          <TouchableOpacity
            className={`mt-2 ${isDark ? "bg-baccent/80" : "bg-baccent"} rounded-lg p-3`}
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              setShowInfo(false);
            }}
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} font-medium text-center`}
            >
              Got it
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // No course found or no grade available
  if (!displayCourse || !displayCourse.hasGrade) {
    return (
      <View className="shadow-md">
        {staleInfoModal}
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 w-full relative overflow-hidden`}
        >
          <ImageBackground
            source={
              isDark
                ? require("../../assets/images/striped_bg.png")
                : require("../../assets/images/striped_bg_white.png")
            }
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 0,
              opacity: isDark ? 1 : 0.3,
            }}
            resizeMode="cover"
          />
          {showStaleIndicator && (
            <TouchableOpacity
              className="absolute top-5 right-4"
              style={{ zIndex: 2 }}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                setShowInfo(true);
              }}
            >
              <View
                className={`bg-caution rounded-full pl-3 pr-2 pt-2 pb-3 shadow-md`}
              ></View>
            </TouchableOpacity>
          )}
          <View style={{ zIndex: 1 }}>
            <View className={`flex-row items-center justify-between mb-1`}>
              <View className="flex-row items-center">
                <View
                  className={`w-2 h-2 ${isDark ? "bg-appwhite/60" : "bg-appblack"} rounded-full mr-2`}
                />
                <Text
                  className={`${isDark ? "text-appwhite/60" : "text-appblack"} text-sm font-normal`}
                >
                  {"Grade not available"}
                </Text>
              </View>
            </View>
            <Text className={`${isDark ? "text-appwhite" : "text-appblack"}`}>
              Period {displayCourse.block}
            </Text>
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-bold`}
            >
              {displayCourse.courseName}
            </Text>
            {displayCourse && (
              <Text
                className={`${isDark ? "text-appwhite/80" : "text-appblack/80"}`}
              >
                {displayCourse.courseCode} • Room {displayCourse.room}
              </Text>
            )}
            {(displayCourse?.midtermMark || displayCourse?.finalMark) && (
              <View className="flex-row items-center mt-3">
                {displayCourse?.midtermMark && (
                  <TouchableOpacity
                    activeOpacity={hideMarksUntilTap ? 0.75 : 1}
                    onPress={() => {
                      if (!hideMarksUntilTap) return;
                      setRevealMidtermMark((prev) => !prev);
                    }}
                    disabled={!hideMarksUntilTap}
                    className="mr-2"
                  >
                    {showMidtermMark ? (
                      <View
                        className={`bg-baccent/90 rounded-lg px-3 py-1`}
                        style={{ alignSelf: "flex-start" }}
                      >
                        <Text className={`text-appblack text-sm font-medium`}>
                          Midterm {displayCourse.midtermMark}%
                        </Text>
                      </View>
                    ) : (
                      <View
                        className={`${isDark ? "bg-dark4" : "bg-light4"} rounded-lg px-3 py-1`}
                        style={{ alignSelf: "flex-start" }}
                      >
                        <Text
                          className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm font-medium`}
                          numberOfLines={1}
                        >
                          Reveal midterm
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                {displayCourse?.finalMark && (
                  <TouchableOpacity
                    activeOpacity={hideMarksUntilTap ? 0.75 : 1}
                    onPress={() => {
                      if (!hideMarksUntilTap) return;
                      setRevealFinalMark((prev) => !prev);
                    }}
                    disabled={!hideMarksUntilTap}
                  >
                    {showFinalMark ? (
                      <View
                        className={`bg-success/90 rounded-lg px-3 py-1`}
                        style={{ alignSelf: "flex-start" }}
                      >
                        <Text className={`text-appblack text-sm font-medium`}>
                          Final {displayCourse.finalMark}%
                        </Text>
                      </View>
                    ) : (
                      <View
                        className={`${isDark ? "bg-dark4" : "bg-light4"} rounded-lg px-3 py-1`}
                        style={{ alignSelf: "flex-start" }}
                      >
                        <Text
                          className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm font-medium`}
                          numberOfLines={1}
                        >
                          Reveal final
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

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
    if (numericMark === 0) return "No Mark Available Yet"; // all formatives
    if (numericMark >= 100) return "Perfect Performance";
    if (numericMark >= 90) return "Excellent Performance";
    if (numericMark >= 80) return "Strong Performance";
    if (numericMark >= 70) return "Good Performance";
    if (numericMark >= 50) return "Satisfactory Performance";
    return "Needs Improvement";
  };

  return (
    <>
      {staleInfoModal}
      <View
        className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 shadow-md w-full flex-row items-center justify-between flex-wrap relative`}
      >
        {course.isGradeStale && (
          <TouchableOpacity
            className="absolute top-3 right-3 z-500"
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              setShowInfo(true);
            }}
          >
            <View
              className={`bg-caution rounded-full pl-3 pr-2 pt-2 pb-3 shadow-md`}
            ></View>
          </TouchableOpacity>
        )}
        <View className={`flex-1 min-w-0 pr-4`}>
          <View className={`flex-row items-center justify-between mb-1`}>
            <View className="flex-row items-center">
              <View className={`w-2 h-2 bg-baccent rounded-full mr-2`} />
              <Text
                className={`${isDark ? "text-appwhite/60" : "text-appblack"} text-sm font-normal`}
              >
                {showCourseMark
                  ? getPerformanceStatus(displayCourse.courseMark)
                  : "Mark has been hidden"}
              </Text>
            </View>
          </View>
          <Text className={`${isDark ? "text-appwhite" : "text-appblack"}`}>
            Period {displayCourse.block}
          </Text>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-bold`}
          >
            {displayCourse.courseName}
          </Text>
          <Text className={`text-baccent/90 text-lg`}>
            {displayCourse.courseCode} • Room {displayCourse.room}
          </Text>
          {(displayCourse.midtermMark || displayCourse.finalMark) && (
            <View className="flex-row items-center mt-2">
              {displayCourse.midtermMark && (
                <TouchableOpacity
                  activeOpacity={hideMarksUntilTap ? 0.75 : 1}
                  onPress={() => {
                    if (!hideMarksUntilTap) return;
                    setRevealMidtermMark((prev) => !prev);
                  }}
                  disabled={!hideMarksUntilTap}
                  className="mr-2"
                >
                  {showMidtermMark ? (
                    <View
                      className={`bg-baccent/90 rounded-lg px-3 py-1`}
                      style={{ alignSelf: "flex-start" }}
                    >
                      <Text className={`text-appblack text-sm font-medium`}>
                        Midterm {displayCourse.midtermMark}%
                      </Text>
                    </View>
                  ) : (
                    <View
                      className={`${isDark ? "bg-dark4" : "bg-light4"} rounded-lg px-3 py-1`}
                      style={{ alignSelf: "flex-start" }}
                    >
                      <Text
                        className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm font-medium`}
                        numberOfLines={1}
                      >
                        Reveal midterm
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {displayCourse.finalMark && (
                <TouchableOpacity
                  activeOpacity={hideMarksUntilTap ? 0.75 : 1}
                  onPress={() => {
                    if (!hideMarksUntilTap) return;
                    setRevealFinalMark((prev) => !prev);
                  }}
                  disabled={!hideMarksUntilTap}
                >
                  {showFinalMark ? (
                    <View
                      className={`bg-success/90 rounded-lg px-3 py-1`}
                      style={{ alignSelf: "flex-start" }}
                    >
                      <Text className={`text-appblack text-sm font-medium`}>
                        Final {displayCourse.finalMark}%
                      </Text>
                    </View>
                  ) : (
                    <View
                      className={`${isDark ? "bg-dark4" : "bg-light4"} rounded-lg px-3 py-1`}
                      style={{ alignSelf: "flex-start" }}
                    >
                      <Text
                        className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm font-medium`}
                        numberOfLines={1}
                      >
                        Reveal final
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View className={`flex-row justify-end items-end flex-shrink-0`}>
          <View>
            {(() => {
              const mark = parseFloat(displayCourse.courseMark);
              console.log(mark);
              if (isNaN(mark)) {
                return null;
              }

              return (
                <TouchableOpacity
                  activeOpacity={hideMarksUntilTap ? 0.75 : 1}
                  onPress={() => {
                    if (!hideMarksUntilTap) return;
                    setRevealCourseMark((prev) => !prev);
                  }}
                  disabled={!hideMarksUntilTap}
                >
                  {showCourseMark ? (
                    <View className="items-center justify-center">
                      <AnimatedProgressWheel
                        size={90}
                        width={10}
                        color={mark >= 50 ? "#2faf7f" : "#d6363f"}
                        backgroundColor={isDark ? "#232427" : "#e7e7e9"}
                        progress={mark === 999 ? NaN : mark}
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
                            color: mark >= 50 ? "#2faf7f" : "#d6363f",
                            fontSize: 17,
                            fontWeight: "600",
                          }}
                        >
                          {mark.toFixed(1)}%{/* TA only has up to 1 */}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View
                      className={`${isDark ? "bg-dark4 " : "bg-light4 "} items-center justify-center`}
                      style={{ width: 90, height: 90, borderRadius: 999 }}
                    >
                      <Text
                        className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm text-center font-semibold pt-2`}
                      >
                        Tap to reveal average
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>
      </View>
    </>
  );
};

interface QuickCourseProps {
  courses: Course[];
  courseCode?: string;
  subjectId?: string;
  hideMarksUntilTap?: boolean;
  overrideCourseMark?: number | null;
}

export const QuickCourse = ({
  courses,
  courseCode,
  subjectId,
  hideMarksUntilTap,
  overrideCourseMark,
}: QuickCourseProps) => {
  const { isDark } = useTheme();
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
      targetCourse = courses.find((course) => Boolean(getCurrentMark(course)));

      // If no current grade is visible, try a final or midterm mark
      if (!targetCourse) {
        targetCourse = courses.find((course) => Boolean(course.finalMark));
      }
      if (!targetCourse) {
        targetCourse = courses.find((course) => Boolean(course.midtermMark));
      }

      // If no course with marks, just take the first one
      if (!targetCourse) {
        targetCourse = courses[0];
      }
    }

    return targetCourse || null;
  }, [courses, courseCode, subjectId]);

  if (!selectedCourse) {
    return (
      <View
        className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-md w-full`}
      >
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} text-center`}
        >
          Course not found. Check your internet connection and try again.
        </Text>
      </View>
    );
  }

  return (
    <CourseInfoBox
      course={selectedCourse}
      hideMarksUntilTap={hideMarksUntilTap}
      overrideCourseMark={overrideCourseMark}
    />
  );
};

export default CourseInfoBox;
