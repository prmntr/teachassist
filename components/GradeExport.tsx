import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import { SecureStorage } from "@/app/(auth)/taauth";
import { SUMMER_SEMESTER, type Course } from "@/utils/CourseParser";
import { getCategoryFullName } from "@/utils/GradeParser";
import PageBackground from "@/components/ui/PageBackground";
import {
  calculateGradeAverage,
  loadDetailedCourseReports,
  loadStoredCourses,
  type DetailedCourseReport,
} from "@/utils/gradeHistory";
import { hapticsImpact } from "@/utils/haptics";
import { notePositiveInteraction } from "@/utils/storeReview";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";

type ExportMode = "simple" | "detailed";

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type BuildExportHtmlArgs = {
  mode: ExportMode;
  courses: Course[];
  reports: DetailedCourseReport[];
  average: number | null;
  studentName: string | null;
  schoolName: string | null;
  now: string;
};

const buildExportHtml = ({
  mode,
  courses,
  reports,
  average,
  studentName,
  schoolName,
  now,
}: BuildExportHtmlArgs): string => {
  const gradeLabel = (course: Course): string =>
    course.hasGrade && course.grade !== "See teacher"
      ? `${course.grade}%`
      : "Hidden";

  const simpleRows = courses
    .map(
      (course) => `
        <div class="card">
          <div class="row">
            <div>
              <div class="course-name">${escapeHtml(course.courseName)}</div>
              <div class="muted">${escapeHtml(course.courseCode)} &nbsp;|&nbsp; Room ${escapeHtml(course.room)}</div>
            </div>
            <div class="grade ${course.hasGrade ? "" : "grade-hidden"}">${escapeHtml(gradeLabel(course))}</div>
          </div>
        </div>`,
    )
    .join("");

  const detailedRows = reports
    .map(({ course, parsedReport, hasCachedReport }) => {
      const semesterLabel =
        course.semester === SUMMER_SEMESTER
          ? "Summer School"
          : course.semester === 0
            ? "Full Year"
            : `Semester ${course.semester}`;

      let body = "";
      if (hasCachedReport && parsedReport?.success) {
        const term =
          parsedReport.summary.term === null
            ? "--"
            : `${parsedReport.summary.term.toFixed(1)}%`;
        const courseMark =
          parsedReport.summary.course === null
            ? "--"
            : `${parsedReport.summary.course.toFixed(1)}%`;

        const categories = parsedReport.summary.categories
          .slice(1)
          .map(
            (category) => `
              <div class="line">
                <span class="muted">${escapeHtml(category.name)}</span>
                <span class="strong">${escapeHtml(category.achievement || "--")}</span>
              </div>`,
          )
          .join("");

        const assignments = parsedReport.assignments
          .map((assignment) => {
            const parts = Object.entries(assignment.categories)
              .filter(([, value]) => value)
              .map(
                ([key, value]) => `
                  <div class="line">
                    <span class="muted">${escapeHtml(getCategoryFullName(key))}</span>
                    <span class="strong">${escapeHtml(value?.percentage || "--")}</span>
                  </div>`,
              )
              .join("");
            return `
              <div class="assignment">
                <div class="strong">${escapeHtml(assignment.name)}</div>
                ${parts}
              </div>`;
          })
          .join("");

        body = `
          <div class="section">
            <div class="section-title">Summary</div>
            <div class="muted">Term: ${escapeHtml(term)}</div>
            <div class="muted">Course: ${escapeHtml(courseMark)}</div>
          </div>
          ${
            categories
              ? `<div class="section"><div class="section-title">Category Breakdown</div>${categories}</div>`
              : ""
          }
          ${
            assignments
              ? `<div class="section"><div class="section-title">Assignments</div>${assignments}</div>`
              : ""
          }`;
      } else {
        body = `<div class="muted section">No report available for this course yet.</div>`;
      }

      return `
        <div class="card">
          <div class="row">
            <div>
              <div class="course-name">${escapeHtml(course.courseName)}</div>
              <div class="muted">${escapeHtml(course.courseCode)} &nbsp;|&nbsp; Room ${escapeHtml(course.room)} &nbsp;|&nbsp; ${escapeHtml(semesterLabel)}</div>
            </div>
            <div class="grade ${course.hasGrade ? "" : "grade-hidden"}">${escapeHtml(gradeLabel(course))}</div>
          </div>
          <div class="divider"></div>
          ${body}
        </div>`;
    })
    .join("");

  const content =
    courses.length === 0
      ? `<div class="muted">No cached course data is available yet.</div>`
      : mode === "simple"
        ? simpleRows
        : detailedRows;

  const averageBlock =
    average === null
      ? "No grade average yet."
      : `Overall Average &nbsp;|&nbsp; <span class="big ${average > 50 ? "pos" : "neg"}">${average.toFixed(1)}%</span>`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body {
        margin: 0;
        padding: 40px 44px;
        font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #16181d;
        font-size: 13px;
        line-height: 1.5;
      }
      .title { font-size: 24px; font-weight: 700; margin: 0; }
      .subtitle { color: #6c62ff; font-weight: 600; margin: 2px 0 0; }
      .subtitle .sep { color: #16181d; }
      .average { margin: 10px 0 20px; color: #5b616e; }
      .big { font-size: 18px; font-weight: 700; }
      .pos { color: #16a34a; }
      .neg { color: #dc2626; }
      .card {
        border: 1px solid #e6e7eb;
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 12px;
        background: #fafafb;
        page-break-inside: avoid;
      }
      .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .course-name { font-size: 15px; font-weight: 600; }
      .muted { color: #5b616e; }
      .strong { font-weight: 600; }
      .grade { font-size: 15px; font-weight: 700; color: #6c62ff; white-space: nowrap; }
      .grade-hidden { color: #9aa0ac; }
      .divider { height: 1px; background: #e6e7eb; margin: 12px 0; }
      .section { margin-top: 12px; }
      .section-title { font-weight: 600; margin-bottom: 4px; }
      .line { display: flex; justify-content: space-between; gap: 12px; margin-top: 4px; }
      .assignment { border: 1px solid #eceef1; border-radius: 10px; padding: 10px; margin-top: 8px; }
      .footer { text-align: center; margin-top: 24px; color: #5b616e; }
      .footer .brand { font-weight: 700; color: #16181d; }
      .footer .brand .a { color: #6c62ff; }
      .footer .link { color: #6c62ff; font-weight: 700; margin-top: 4px; }
    </style>
  </head>
  <body>
    <h1 class="title">TeachAssist Course Export</h1>
    <div class="subtitle">${escapeHtml(studentName)} &nbsp;<span class="sep">|</span>&nbsp; ${escapeHtml(schoolName)}</div>
    <div class="average">${averageBlock}</div>
    ${content}
    <div class="footer">
      <div>Report created ${escapeHtml(now)} with the <span class="brand">teach<span class="a">a</span>ssist</span> app</div>
      <div class="link">prmntr.com/teachassist</div>
    </div>
  </body>
</html>`;
};

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

  const handlePdfExportPress = async () => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);

    try {
      const html = buildExportHtml({
        mode,
        courses,
        reports,
        average,
        studentName,
        schoolName,
        now,
      });

      // US Letter at 72dpi: 8.5in x 11in = 612 x 792 points.
      const { uri } = await Print.printToFileAsync({
        html,
        width: 612,
        height: 792,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Export Grades",
        UTI: "com.adobe.pdf",
      });
      notePositiveInteraction();
    } catch {
      AppAlert.alert("Export Failed", "Could not create or share the PDF.", {
        icon: AlertIcon.error,
      });
    }
  };

  const handleWebsiteExportPress = async () => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    AppAlert.alert("Link Export", "Secure export via link will be released in the future.", { icon: AlertIcon.link });
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
          Choose how much information to include, then export a PDF or secure
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
                image: require("../assets/images/simpleshape.png"),
              },
              {
                key: "detailed" as const,
                title: "Detailed",
                subtitle: "Full course breakdowns",
                image: require("../assets/images/paper.png"),
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
              onPress={handlePdfExportPress}
            >
              <Text
                className={`text-center text-base font-semibold ${isDark ? "text-appblack" : "text-appwhite"}`}
              >
                Export PDF
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
        <View className="items-center">
          <View
            ref={previewRef}
            collapsable={false}
            className={`${isDark ? "bg-dark3" : "bg-light3"} mt-3 rounded-2xl p-5 max-w-3xl`}
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
                          {course.semester === SUMMER_SEMESTER
                            ? "Summer School"
                            : course.semester === 0
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
                            {parsedReport.assignments.map(
                              (assignment, index) => (
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
                              ),
                            )}
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
              <Text className="font-semibold">
                teach<Text className="text-baccent font-semibold">a</Text>ssist
              </Text>{" "}
              app
            </Text>
            <Text className="text-center text-baccent font-bold mt-2">
              prmntr.com/teachassist
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default GradeExportScreen;
