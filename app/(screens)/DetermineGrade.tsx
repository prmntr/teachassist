import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SecureStorage } from "@/app/(auth)/taauth";
import Text from "@/components/ui/AppText";
import PageBackground from "@/components/ui/PageBackground";
import { hapticsImpact } from "@/utils/haptics";
import { StudentGradeLetter } from "@/utils/letters";
import {
  markStudentGradeNotificationOpened,
  scheduleStudentGradeNotification,
} from "@/utils/notifications";
import {
  inferStudentGradeFromCoursesJson,
  STUDENT_GRADE_STORAGE_KEY,
  type StudentGradeInference,
} from "@/utils/studentGrade";
import { useTheme } from "@/contexts/ThemeContext";

const EMPTY_INFERENCE: StudentGradeInference = {
  grade: null,
  tally: {
    9: 0,
    10: 0,
    11: 0,
    12: 0,
  },
  consideredCourses: 0,
};

const DetermineGrade = () => {
  const { isDark, activeTone} = useTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [inference, setInference] =
    useState<StudentGradeInference>(EMPTY_INFERENCE);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadStudentGrade = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const coursesJson = await SecureStorage.load("ta_courses");
        const nextInference = inferStudentGradeFromCoursesJson(coursesJson);
        if (cancelled) {
          return;
        }

        setInference(nextInference);

        if (nextInference.grade === null) {
          await SecureStorage.delete(STUDENT_GRADE_STORAGE_KEY);
          if (!cancelled) {
            setNotificationMessage(
              "No grade notification scheduled because no student grade could be inferred.",
            );
          }
          return;
        }

        await SecureStorage.save(
          STUDENT_GRADE_STORAGE_KEY,
          String(nextInference.grade),
        );
        const scheduled = await scheduleStudentGradeNotification(
          nextInference.grade,
        );

        if (!cancelled) {
          setNotificationMessage(
            scheduled
              ? "Annual notification scheduled for June 20 at 4:00 PM."
              : "Annual notification will be scheduled after notification permissions are granted.",
          );
        }
      } catch (error) {
        console.error("DetermineGrade: failed to load student grade", error);
        if (!cancelled) {
          setErrorMessage(
            "Could not determine the student grade from the saved course list.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadStudentGrade();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 60, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 
                <Text
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          A message
        </Text>
        <Text
          className={`mt-2 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          test text
        </Text>
        */}

        <View
          className={`mt-6 rounded-3xl p-6 ${isDark ? "bg-dark3" : "bg-light3"}`}
        >
          {isLoading ? (
            <View className="items-center py-6">
              <ActivityIndicator color={activeTone.accent} />
              <Text
                className={`mt-4 text-base ${isDark ? "text-appwhite" : "text-appblack"}`}
              >
                Determining student grade...
              </Text>
            </View>
          ) : (
            <>
              {/* 
              <Text
                className={`text-sm uppercase tracking-widest ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
              >
                tiny text
              </Text>
              <Text
                className={`mt-2 text-5xl font-bold ${isDark ? "text-appwhite" : "text-appblack"}`}
              >
                {inference.grade === null
                  ? "Unknown"
                  : formatStudentGradeLabel(inference.grade)}
              </Text>
                                          <Text
                className={`mt-3 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
              >
                {inference.consideredCourses > 0
                  ? `Based on ${inference.consideredCourses} recognized course code${inference.consideredCourses === 1 ? "" : "s"}.`
                  : "No recognized course codes were found."}
              </Text>
              */}
              <StudentGradeLetter
                grade={inference.grade}
                className={`mt-2 text-lg font-semibold ${isDark ? "text-baccent" : "text-info"}`}
              />
              {errorMessage ? (
                <Text className="mt-3 text-danger text-sm">{errorMessage}</Text>
              ) : null}
            </>
          )}
        </View>
        <TouchableOpacity
          className="rounded-2xl px-4 py-4 mt-8 bg-baccent"
          onPress={async () => {
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            await markStudentGradeNotificationOpened();
            router.push("/courses");
          }}
        >
          <Text
            className={`text-center text-xl font-semibold ${isDark ? "text-appblack" : "text-appwhite"}`}
          >
            Got it!
          </Text>
        </TouchableOpacity>
        {/* 
        <View
          className={`mt-5 rounded-3xl p-6 ${isDark ? "bg-dark3" : "bg-light3"}`}
        >
                      <Text
            className={`mt-3 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
          >
            {notificationMessage ||
              "A yearly notification is scheduled for June 20 at 4:00 PM once notification permissions are available."}
          </Text>
        </View>
        */}
      </ScrollView>
    </View>
  );
};

export default DetermineGrade;
