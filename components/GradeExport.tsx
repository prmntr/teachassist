import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { SecureStorage } from "../(auth)/taauth";
import { type Course } from "@/utils/CourseParser";
import { getCategoryFullName } from "@/utils/GradeParser";
import PageBackground from "@/components/ui/PageBackground";
import {
  calculateGradeAverage,
  loadDetailedCourseReports,
  loadStoredCourses,
  type DetailedCourseReport,
} from "@/utils/gradeHistory";
import { hapticsImpact } from "@/utils/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";

type ExportMode = "simple" | "detailed";

const GradeExportScreen = () => {
  const { isDark, activeTone } = useTheme();
  const [mode, setMode] = useState<ExportMode>("simple");
  const [courses, setCourses] = useState<Course[]>([]);
  const [reports, setReports] = useState<DetailedCourseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const previewRef = useRef<View>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const storedCourses = await loadStoredCourses();
      const detailedReports = await loadDetailedCourseReports(storedCourses);
      setCourses(storedCourses);
      setReports(detailedReports);
      setLoading(false);
      const [storedName, storedSchool] = await Promise.all([
        SecureStorage.load("ta_username"),
        SecureStorage.load("school_name"),
      ]);
      setStudentName(storedName);
      setSchoolName(storedSchool);
    };

    loadData();
  }, []);

  const average = calculateGradeAverage(courses);

  const now = new Date().toLocaleString();

  const handleImageExportPress = async () => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);

    try {
      const uri = await captureRef(previewRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      await Sharing.shareAsync(uri);
    } catch {
      Alert.alert("Export Failed", "Could not create or share the image.");
    }
  };

  const handleWebsiteExportPress = async () => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Link Export", "Coming soon!");
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/profile" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
      >
        <Text
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          Export Grades
        </Text>
        <Text
          className={`mt-3 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          Choose how much information to include, then export an image or secure
          link.
        </Text>

        <Text
          className={`text-2xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"} mt-6`}
        >
          Included Info
        </Text>
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} mt-2 rounded-2xl p-5 `}
        >
          <View className="mt-4 flex-row gap-3">
            {[
              {
                key: "simple" as const,
                title: "Simple",
                subtitle: "Current marks and classes only",
                image: require("../../assets/images/simpleshape.png"),
              },
              {
                key: "detailed" as const,
                title: "Detailed",
                subtitle: "Full course breakdowns",
                image: require("../../assets/images/paper.png"),
              },
            ].map((option) => {
              const active = mode === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  className={`flex-1 rounded-2xl px-4 py-4 ${active ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"}`}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    setMode(option.key);
                  }}
                >
                  <Text
                    className={`text-lg font-bold ${active ? (isDark ? "text-appblack" : "text-appwhite") : isDark ? "text-appwhite" : "text-appblack"}`}
                  >
                    {option.title}
                  </Text>
                  <Text
                    className={`mt-1 text-sm ${active ? (isDark ? "text-appblack/80" : "text-appwhite/80") : isDark ? "text-appgraylight" : "text-appgraydark"}`}
                  >
                    {option.subtitle}
                  </Text>
                  <ImageBackground
                    source={option.image}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 1,
                      bottom: 0,
                      zIndex: 0,
                      opacity: 0.09,
                    }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          <View className=" flex-row gap-3 mt-7">
            <TouchableOpacity
              className="flex-1 rounded-xl bg-success/90 px-4 py-3"
              onPress={handleImageExportPress}
            >
              <Text
                className={`text-center text-base font-semibold ${isDark ? "text-appblack" : "text-appwhite"}`}
              >
                Export Image
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`bg-success/90 flex-1 rounded-xl px-4 py-3`}
              onPress={handleWebsiteExportPress}
            >
              <Text
                className={`text-center text-base font-semibold ${isDark ? "text-appblack" : "text-appwhite"}`}
              >
                Export Link
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text
          className={`text-2xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"} mt-6`}
        >
          Preview
        </Text>
        <View
          ref={previewRef}
          collapsable={false}
          className={`${isDark ? "bg-dark3" : "bg-light3"} mt-3 rounded-2xl p-5 `}
        >
          <Text
            className={`text-2xl font-semibold mt-0 ${isDark ? "text-appwhite" : "text-appblack"}`}
          >
            TeachAssist Course Export
          </Text>
          <Text className="text-baccent font-semibold">
            {studentName}
            {"  "}
            <Text className={`${isDark ? "text-appwhite" : "text-appblack"}`}>
              |
            </Text>
            {"  "}
            {schoolName}
          </Text>
          <Text
            className={`text-md mt-3 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
          >
            {average === null ? (
              "No grade average yet."
            ) : (
              <Text>
                Overall Average |{"  "}
                <Text
                  className={`font-bold text-xl ${average > 50 ? "text-success" : "text-danger"}`}
                >
                  {average.toFixed(1)}%
                </Text>
              </Text>
            )}
          </Text>

          {loading ? (
            <View className="py-10">
              <ActivityIndicator color={activeTone.accent} size="large" />
            </View>
          ) : courses.length === 0 ? (
            <Text
              className={`mt-5 text-sm ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
            >
              No cached course data is available yet.
            </Text>
          ) : mode === "simple" ? (
            <View className="mt-4">
              {courses.map((course) => (
                <View
                  key={`${course.subjectId ?? course.courseCode}-${course.semester}`}
                  className={`${isDark ? "bg-dark4" : "bg-light4"} mb-3 rounded-2xl p-4`}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-lg`}
                      >
                        {course.courseName}
                      </Text>
                      <Text
                        className={`mt-1 text-sm ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
                      >
                        {course.courseCode} | Room {course.room}
                      </Text>
                    </View>
                    <Text
                      className={`text-lg font-bold ${course.hasGrade ? "text-baccent" : isDark ? "text-appgraylight" : "text-appgraydark"}`}
                    >
                      {course.hasGrade && course.grade !== "See teacher"
                        ? `${course.grade}%`
                        : "Hidden"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="mt-4">
              {reports.map(({ course, parsedReport, hasCachedReport }) => (
                <View
                  key={`${course.subjectId ?? course.courseCode}-${course.semester}`}
                  className={`${isDark ? "bg-dark4" : "bg-light4"} mb-4 rounded-2xl p-4`}
                >
                  <View className="flex-row items-start justify-between gap-3 mb-3">
                    <View className="flex-1">
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold`}
                      >
                        {course.courseName}
                      </Text>
                      <Text
                        className={`mt-1 text-sm ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
                      >
                        {course.courseCode} | Room {course.room} |{"  "}
                        {course.semester === 0
                          ? "Full Year"
                          : `Semester ${course.semester}`}
                      </Text>
                    </View>
                    <Text
                      className={`${course.hasGrade ? (Number(course.grade) > 50 ? "text-success" : "text-danger") : isDark ? "text-appgraylight" : "text-appgraydark"} text-lg font-bold`}
                    >
                      {course.hasGrade && course.grade !== "See teacher"
                        ? `${course.grade}%`
                        : "Hidden"}
                    </Text>
                  </View>
                  <View
                    className={`${isDark ? "bg-baccent/40" : "bg-light4"} h-px`}
                  />
                  {hasCachedReport && parsedReport?.success ? (
                    <>
                      <View className="mt-4">
                        <Text
                          className={`text-md font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
                        >
                          Summary
                        </Text>
                        <Text
                          className={`mt-2 text-sm ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
                        >
                          Term:{" "}
                          {parsedReport.summary.term === null
                            ? "--"
                            : `${parsedReport.summary.term.toFixed(1)}%`}
                        </Text>
                        <Text
                          className={`mt-1 text-sm ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
                        >
                          Course:{" "}
                          {parsedReport.summary.course === null
                            ? "--"
                            : `${parsedReport.summary.course.toFixed(1)}%`}
                        </Text>
                      </View>
                      {parsedReport.summary.categories.length > 0 ? (
                        <View className="mt-4">
                          <Text
                            className={`text-md font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
                          >
                            Category Breakdown
                          </Text>
                          {parsedReport.summary.categories
                            .slice(1)
                            .map((category) => (
                              <View
                                key={`${course.courseCode}-${category.name}`}
                                className="mt-2 flex-row items-center justify-between gap-3"
                              >
                                <Text
                                  className={`flex-1 text-sm ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
                                >
                                  {category.name}
                                </Text>
                                <Text
                                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm font-semibold`}
                                >
                                  {category.achievement || "--"}
                                </Text>
                              </View>
                            ))}
                        </View>
                      ) : null}

                      {parsedReport.assignments.length > 0 ? (
                        <View className="mt-4">
                          <Text
                            className={`text-md font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
                          >
                            Assignments
                          </Text>
                          {parsedReport.assignments.map((assignment, index) => (
                            <View
                              key={`${course.courseCode}-${assignment.name}-${index}`}
                              className={`${isDark ? "bg-dark3" : "bg-light3"} mt-3 rounded-xl p-3`}
                            >
                              <Text
                                className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm font-semibold`}
                              >
                                {assignment.name}
                              </Text>
                              {Object.entries(assignment.categories)
                                .filter(([, value]) => value)
                                .map(([key, value]) => (
                                  <View
                                    key={`${assignment.name}-${key}`}
                                    className="mt-2 flex-row items-center justify-between gap-3"
                                  >
                                    <Text
                                      className={`flex-1 text-sm ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
                                    >
                                      {getCategoryFullName(key)}
                                    </Text>
                                    <Text
                                      className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm font-semibold`}
                                    >
                                      {value?.percentage || "--"}
                                    </Text>
                                  </View>
                                ))}
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text
                      className={`mt-4 text-sm ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
                    >
                      No report avilable for this course yet.
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
          <Text
            className={`text-center ${isDark ? "text-appwhite" : "text-appblack"} text-sm mt-5`}
          >
            Report created {now} with the{" "}
            <Text className="font-bold">
              teach<Text className="text-baccent">a</Text>ssist
            </Text>{" "}
            app
          </Text>
          <Text className="text-center text-baccent font-bold mt-2">
            prmntr.com/teachassist
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default GradeExportScreen;
