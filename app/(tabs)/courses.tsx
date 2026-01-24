import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  RefreshControl,
  // FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TeachAssistAuthFetcher, { SecureStorage } from "../(auth)/taauth";
import { parseStudentGrades, type Course } from "../(components)/CourseParser"; // Update import path
import GradeAverageTracker from "../(components)/GradeAverage";
import Messages from "../(components)/Messages";
import { CourseInfoBox } from "../(components)/QuickCourse";
import { SnowEffect } from "../(components)/SnowEffect";
import UpdatesModal from "../(components)/UpdatesModal";
import { mergeCoursesWithCache } from "../(utils)/courseCache";
import { useTheme } from "../contexts/ThemeContext";
import { hapticsImpact, hapticsNotification } from "../(utils)/haptics";

const CoursesScreen = () => {
  const [showUpdates, setShowUpdates] = useState(false);
  const rawAppVersion =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.3.1"; // keep in sync with app.json
  const appVersion = rawAppVersion.startsWith("v")
    ? rawAppVersion
    : `v${rawAppVersion}`;

  // Show UpdatesModal once per app update
  useEffect(() => {
    const checkAndShowUpdates = async () => {
      try {
        const lastSeenVersion =
          await AsyncStorage.getItem("lastSeenAppVersion");
        if (lastSeenVersion !== appVersion) {
          setShowUpdates(true);
          await AsyncStorage.setItem("lastSeenAppVersion", appVersion);
        }
      } catch {
        setShowUpdates(true);
      }
    };
    checkAndShowUpdates();
  }, [appVersion]);
  const { isDark } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [refreshSource, setRefreshSource] = useState<
    "pull" | "button" | null
  >(null);
  const [hideUnavailableMarks, setHideUnavailableMarks] = useState(false);
  const [tapToRevealMarks, setTapToRevealMarks] = useState(false);
  const [marksLastRetrieved, setMarksLastRetrieved] = useState<string | null>(
    null,
  );
  const [shouldRefreshWithLogin, setShouldRefreshWithLogin] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const cachedCoursesRef = useRef<Course[] | null>(null);
  const isButtonRefreshing = refreshSource === "button" && isLoading;
  const isPullRefreshing = refreshSource === "pull" && isLoading;
  const refreshButtonStyle = isButtonRefreshing
    ? { opacity: 0.6, transform: [{ scale: 0.96 }] }
    : undefined;

  // Christmas
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 11, 20); // Dec 20
  const end = new Date(
    year + (now.getMonth() === 0 ? -1 : 0),
    0,
    5,
    23,
    59,
    59,
    999,
  ); // Jan 5

  const router = useRouter();

  const getUserName = async () => {
    const userName = await SecureStorage.load("ta_username");
    return userName;
  };

  const loadLastRetrieved = async () => {
    const savedLastRetrieved = await SecureStorage.load("marks_last_retrieved");
    setMarksLastRetrieved(savedLastRetrieved);
  };

  const mergeAndSaveCourses = async (freshCourses: Course[]) => {
    let cachedCourses: Course[] = [];
    if (cachedCoursesRef.current) {
      cachedCourses = cachedCoursesRef.current;
    } else {
      const cachedCoursesJson = await SecureStorage.load("ta_courses");
      if (cachedCoursesJson) {
        try {
          cachedCourses = JSON.parse(cachedCoursesJson);
        } catch {
          cachedCourses = [];
        }
      }
    }

    const mergedCourses = mergeCoursesWithCache(freshCourses, cachedCourses);
    cachedCoursesRef.current = null;

    await SecureStorage.save("ta_courses", JSON.stringify(mergedCourses));
    setCourses(mergedCourses);
    return mergedCourses;
  };

  const onFetchResult = async (result: string) => {
    if (result.includes("Login Failed") || result.includes("Session expired")) {
      // Try automatic re-authentication first
      const savedUsername = await SecureStorage.load("ta_username");
      const savedPassword = await SecureStorage.load("ta_password");

      if (savedUsername && savedPassword && !shouldRefreshWithLogin) {
        console.log(
          "Session expired, attempting automatic re-authentication...",
        );
        setMessage("");
        setLoginCredentials({
          username: savedUsername,
          password: savedPassword,
        });
        setShouldRefreshWithLogin(true);
        return; // Don't redirect yet, try reauth first
      } else {
        // If already tried reauth or no credentials, redirect to signin
        setMessage("Please log in again.");
        setShouldRefreshWithLogin(false);
        setLoginCredentials(null);
        router.replace("/signin");
        setRefreshSource(null);
      }
    } else if (result.includes("Login Success")) {
      // After successful login, reload the data
      setMessage("");
      hapticsNotification(Haptics.NotificationFeedbackType.Success);
      setShouldRefreshWithLogin(false);
      await loadHtmlOrFetch();
      const retrievedAt = new Date().toISOString();
      await SecureStorage.save("marks_last_retrieved", retrievedAt);
      setMarksLastRetrieved(retrievedAt);
      setRefreshSource(null);
    } else {
      // Parse the HTML using the new parser
      try {
        const parsedCoursesJson = parseStudentGrades(result);
        const parsedCourses: Course[] = JSON.parse(parsedCoursesJson);
        await mergeAndSaveCourses(parsedCourses);
        const retrievedAt = new Date().toISOString();
        await SecureStorage.save("marks_last_retrieved", retrievedAt);
        setMarksLastRetrieved(retrievedAt);
        setMessage("");
      } catch (error) {
        console.error("Error parsing courses:", error);
        setMessage("Error parsing course data. Please try again.");
      }

      setIsLoading(false);
      setRefreshSource(null);
    }
  };

  const onError = (error: string) => {
    setMessage(`Error: ${error}`);
    setShouldRefreshWithLogin(false);
    setIsLoading(false);
    setRefreshSource(null);
  };

  const onLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  const loadHtmlOrFetch = async () => {
    setMessage("");
    const savedCoursesJson = await SecureStorage.load("ta_courses");

    await getUserName();
    await loadLastRetrieved();

    if (savedCoursesJson) {
      try {
        const savedCourses: Course[] = JSON.parse(savedCoursesJson);
        const mergedCourses = cachedCoursesRef.current
          ? mergeCoursesWithCache(savedCourses, cachedCoursesRef.current)
          : savedCourses;
        cachedCoursesRef.current = null;
        if (mergedCourses !== savedCourses) {
          await SecureStorage.save("ta_courses", JSON.stringify(mergedCourses));
        }
        setCourses(mergedCourses);

        setMessage("");
        setIsLoading(false);
      } catch (error) {
        console.error("Error parsing saved courses:", error);
        setMessage("Error loading saved courses. Fetching fresh data...");
        // Continue to fetch fresh data
      }
    }

    if (!savedCoursesJson) {
      console.warn("Courses not found in storage");
      setIsLoading(true);
    }
  };

  const handleRefresh = async (source: "pull" | "button" = "button") => {
    setIsLoading(true);
    setRefreshSource(source);
    setMessage("");

    const networkState = await NetInfo.fetch();
    console.log("Connection type", networkState.type);

    if (networkState.isConnected === false) {
      setMessage(`No internet connection.\nCheck your network and try again.`);
      setIsLoading(false);
      setRefreshSource(null);
      hapticsNotification(Haptics.NotificationFeedbackType.Error);
      return; // Exit early if no internet
    }
    // Keep current cache to merge in case TeachAssist hides grades temporarily.
    cachedCoursesRef.current = courses;

    // Get credentials for re-authentication
    const savedUsername = await SecureStorage.load("ta_username");
    const savedPassword = await SecureStorage.load("ta_password");

    if (savedUsername && savedPassword) {
      setLoginCredentials({
        username: savedUsername,
        password: savedPassword,
      });
      setShouldRefreshWithLogin(true);
      hapticsNotification(Haptics.NotificationFeedbackType.Success);
    } else {
      setIsLoading(false);
      setRefreshSource(null);
      setShouldRefreshWithLogin(false);
      setLoginCredentials(null);
      router.replace("/signin");
      Alert.alert("Username and password not found. Please log in again.");
    }
  };

  const hasVisibleGrade = (course: Course) => {
    if (course.grade && course.grade !== "See teacher") {
      return true;
    }
    return Boolean(course.midtermMark || course.finalMark);
  };

  const visibleCourses = hideUnavailableMarks
    ? courses.filter((course) => hasVisibleGrade(course))
    : courses;

  // Filter courses by semester for organization
  const semester1Courses = visibleCourses.filter(
    (course) => course.semester === 1,
  );
  const semester2Courses = visibleCourses.filter(
    (course) => course.semester === 2,
  );
  const showSemester2First =
    now >= new Date(year, 1, 2) &&
    now <= new Date(year, 5, 30, 23, 59, 59, 999);

  const renderSemesterCourses = (semester: 1 | 2, list: Course[]) => {
    if (list.length === 0) return null;
    return (
      <View>
        <View className={`${semester === 1 ? "mt-8" : "mt-4"}`}>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-medium`}
          >
            Semester{" "}
            <Text className={`text-baccent text-2xl font-bold`}>
              {semester}
            </Text>
          </Text>
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2`}
          >
            {list.length} courses available
          </Text>
        </View>
        {list.map((course) => (
          <View key={`${course.courseCode}-${course.semester}`}>
            {course.hasGrade ? (
              <TouchableOpacity
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  router.push(`/courseview/${course.subjectId}`);
                }}
                className="mb-6"
              >
                <CourseInfoBox
                  course={course}
                  hideMarksUntilTap={tapToRevealMarks}
                />
              </TouchableOpacity>
            ) : (
              <View className="mb-6">
                <CourseInfoBox
                  course={course}
                  hideMarksUntilTap={tapToRevealMarks}
                />
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  useEffect(() => {
    loadHtmlOrFetch();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadPreferences = async () => {
        const storedHideUnavailable = await AsyncStorage.getItem(
          "hide_unavailable_marks",
        );
        setHideUnavailableMarks(storedHideUnavailable === "true");
        const storedTapToReveal = await AsyncStorage.getItem(
          "tap_to_reveal_marks",
        );
        setTapToRevealMarks(storedTapToReveal === "true");
      };

      loadPreferences();
    }, []),
  );

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <UpdatesModal
        visible={showUpdates}
        onClose={() => setShowUpdates(false)}
        version={appVersion}
      />
      {(now >= start && now <= new Date(year, 11, 31, 23, 59, 59, 999)) ||
      (now.getMonth() === 0 && now <= end) ? (
        <SnowEffect count={37} speed={1.1} drift={26} />
      ) : (
        <></>
      )}
      <View className={`flex-row items-center justify-between mt-16 px-5`}>
        <Text
          className={`text-5xl font-semibold leading-[55px] ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          My Courses
        </Text>
        <View className="shadow-md">
          <TouchableOpacity
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              handleRefresh("button");
            }}
            className={`${isDark ? "bg-baccent/95" : "bg-baccent"} rounded-lg px-3 py-2`}
            style={refreshButtonStyle}
            disabled={isLoading}
          >
            <Image
              source={require("../../assets/images/refresh.png")}
              className={`w-7 h-8`}
              style={{
                tintColor: `${isDark ? "#111113" : "#fafafa"}`,
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
      <Messages />
      {message === "" ? (
        <View className={`mb-3`}></View> // show nothing successfully fetched
      ) : (
        <Text
          className={`${
            message.includes("No internet")
              ? "bg-danger text-appwhite"
              : `bg-baccent/80 ${isDark ? "text-appwhite" : "text-appblack"}`
          } mt-5 p-2 text-center rounded-lg font-medium mb-5 mx-5 px-5`}
        >
          {message}
        </Text> // disent betwn normal and no internet
      )}
      {isLoading && shouldRefreshWithLogin && loginCredentials && (
        <TeachAssistAuthFetcher
          loginParams={loginCredentials}
          prefetchCourses
          onResult={onFetchResult}
          onError={onError}
          onLoadingChange={onLoadingChange}
        />
      )}

      {courses.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="px-5"
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={() => handleRefresh("pull")}
              tintColor="#27b1fa"
              colors={["#27b1fa", "#43a25a", "#fcc245", "#f67c15"]}
              progressBackgroundColor={`${isDark ? "#27b1fa30" : "#fbfbfb"}`}
            />
          }
        >
          {/* this is literally the only way it works and i have no idea why wtf*/}
          <View className="shadow-md mt-5">
            <GradeAverageTracker
              showTrend={true}
              showCourseCount={true}
              showLastUpdated={true}
              hideMarksUntilTap={tapToRevealMarks}
              refreshToken={marksLastRetrieved ?? undefined}
            />
          </View>
          {showSemester2First ? (
            <>
              {renderSemesterCourses(2, semester2Courses)}
              {renderSemesterCourses(1, semester1Courses)}
            </>
          ) : (
            <>
              {renderSemesterCourses(1, semester1Courses)}
              {renderSemesterCourses(2, semester2Courses)}
            </>
          )}
          <TouchableOpacity
            className={`mb-10 mt-3 p-3`}
            onPress={() =>
              Linking.openURL("market://details?id=com.prmntr.teachassist")
            }
          >
            <Text className={`text-appgraydark text-center text-md underline`}>
              leave a review for +10% luck on ur next test :D
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {!isLoading && courses.length === 0 && (
        <View className={`flex items-center justify-center mt-10`}>
          <Image
            source={require("../../assets/images/not_found.png")}
            className={`w-30 h-30 my-3`}
            style={{ tintColor: "#27b1fa" }}
          />
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-center text-xl font-semibold`}
          >
            {"No courses found!\nPlease try again later."}
          </Text>
        </View>
      )}
    </View>
  );
};

export default CoursesScreen;
