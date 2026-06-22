import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Image,
  Platform,
  RefreshControl,
  // FlatList,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TeachAssistAuthFetcher, { SecureStorage } from "../(auth)/taauth";
import Text from "@/components/ui/AppText";
import { parseStudentGrades, type Course } from "@/utils/CourseParser"; // Update import path
import FoolsModal from "@/components/modals/FoolsModal";
import GradeAverageTracker from "@/components/GradeAverage";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import Messages from "@/components/Messages";
import PageBackground from "@/components/ui/PageBackground";
import { CourseInfoBox } from "@/components/QuickCourse";
import { SnowEffect } from "@/components/ui/SnowEffect";
import UpdatesModal from "@/components/modals/UpdatesModal";
import VersionUpdateModal from "@/components/modals/VersionUpdateModal";
import { appVersionLabel, appVersionNumber } from "@/utils/appVersion";
import { mergeCoursesWithCache } from "@/utils/courseCache";
import { subscribeCourseStorageUpdates } from "@/utils/courseStorageEvents";
import { appendGradeHistorySnapshot } from "@/utils/gradeHistory";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import { useNativeTabsEnabled } from "@/utils/nativeTabs";
import {
  loadVersionCheckState,
  markVersionPromptDismissed,
  runVersionCheck,
  shouldShowUpdatePrompt,
  type VersionUpdateMode,
} from "@/utils/versionCheck";
import { useAFoolVisualGrades } from "@/contexts/AFoolVisualGradesContext";
import { useTheme } from "@/contexts/ThemeContext";

const TEST_MODAL_YEAR_KEY = "lastSeenFoolsModalYear";

const CoursesScreen = () => {
  const [showUpdates, setShowUpdates] = useState(false);
  const appVersion = appVersionLabel;
  const { isAFool } = useAFoolVisualGrades();
  const [showFoolsModal, setShowFoolsModal] = useState(false);
  const [showVersionUpdate, setShowVersionUpdate] = useState(false);
  const [updateMode, setUpdateMode] = useState<VersionUpdateMode>("none");
  const [updateLatest, setUpdateLatest] = useState<string | null>(null);
  const [updateMinimum, setUpdateMinimum] = useState<string | null>(null);

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

  useEffect(() => {
    let isMounted = true;

    const checkAndShowFoolsModal = async () => {
      if (!isAFool) {
        if (isMounted) {
          setShowFoolsModal(false);
        }
        return;
      }

      const currentYear = new Date().getFullYear().toString();
      try {
        const lastSeenYear = await AsyncStorage.getItem(TEST_MODAL_YEAR_KEY);
        if (isMounted) {
          setShowFoolsModal(lastSeenYear !== currentYear);
        }
      } catch {
        if (isMounted) {
          setShowFoolsModal(true);
        }
      }
    };

    checkAndShowFoolsModal();

    return () => {
      isMounted = false;
    };
  }, [isAFool]);

  useEffect(() => {
    const loadUpdatePrompt = async () => {
      const state = await loadVersionCheckState();
      setUpdateMode(state.mode);
      setUpdateLatest(state.latest);
      setUpdateMinimum(state.minimum);
      if (
        shouldShowUpdatePrompt(state.mode, state.latest, state.dismissedFor)
      ) {
        setShowVersionUpdate(true);
      }
    };
    loadUpdatePrompt();
    runVersionCheck(appVersionNumber)
      .then(loadUpdatePrompt)
      .catch(() => {
        // Ignore network failures; keep cached state.
      });
  }, []);
  const { activeTone, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const nativeTabsEnabled = useNativeTabsEnabled();
  const isLandscape = width > height;
  const nativeTabBottomPadding = nativeTabsEnabled
    ? isLandscape
      ? 0
      : insets.bottom + 52
    : 20;
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [refreshSource, setRefreshSource] = useState<"pull" | "button" | null>(
    null,
  );
  const [hideUnavailableMarks, setHideUnavailableMarks] = useState(false);
  const [tapToRevealMarks, setTapToRevealMarks] = useState(false);
  const [marksLastRetrieved, setMarksLastRetrieved] = useState<string | null>(
    null,
  );
  const [shouldRunSilentStartupRefresh, setShouldRunSilentStartupRefresh] =
    useState(false);
  const [shouldRefreshWithLogin, setShouldRefreshWithLogin] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const cachedCoursesRef = useRef<Course[] | null>(null);
  const storedCoursesJsonRef = useRef<string | null>(null);
  const isButtonRefreshing = refreshSource === "button" && isLoading;
  const isPullRefreshing = refreshSource === "pull" && isLoading;
  const updatesButtonStyle = isButtonRefreshing
    ? { opacity: 0.85, transform: [{ scale: 0.98 }] }
    : undefined;
  const renderHeaderOutside = !(isLandscape && courses.length > 0);
  const renderGreetingOutside = !(isLandscape && courses.length > 0);
  const headerContent = (withHorizontalPadding: boolean) => (
    <View
      className={`flex-row items-center justify-between ${
        withHorizontalPadding ? "px-5 mt-16" : "mt-13"
      }`}
    >
      <Text
        className={`text-5xl font-semibold leading-[55px] ${isDark ? "text-appwhite" : "text-appblack"}`}
      >
        My Courses
      </Text>
      <View className="">
        <LiquidGlassButton
          onPress={() => {
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            router.push("/GradeUpdates");
          }}
          containerStyle={updatesButtonStyle}
          contentStyle={{
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
          glassTintColor={activeTone.accent}
          fallbackBackgroundColor={activeTone.accent}
        >
          <Image
            source={require("../../assets/images/inbox.png")}
            className={`w-7 h-8`}
            style={{
              tintColor: `${isDark ? "#111113" : "#fbfbfb"}`,
            }}
          />
        </LiquidGlassButton>
      </View>
    </View>
  );

  // Christmas
  const now = new Date();
  const year = now.getFullYear();
  const schoolYearStart = now.getMonth() >= 7 ? year : year - 1;
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

  const getUserName = useCallback(async () => {
    return await SecureStorage.load("ta_username");
  }, []);

  const loadLastRetrieved = useCallback(async () => {
    const savedLastRetrieved = await SecureStorage.load("marks_last_retrieved");
    setMarksLastRetrieved(savedLastRetrieved);
  }, []);

  const syncCoursesFromStorage = useCallback(async () => {
    const [savedCoursesJson, savedLastRetrieved] = await Promise.all([
      SecureStorage.load("ta_courses"),
      SecureStorage.load("marks_last_retrieved"),
    ]);

    setMarksLastRetrieved(savedLastRetrieved);

    if (!savedCoursesJson) {
      storedCoursesJsonRef.current = null;
      setCourses([]);
      return;
    }

    if (savedCoursesJson === storedCoursesJsonRef.current) {
      return;
    }

    try {
      const savedCourses: Course[] = JSON.parse(savedCoursesJson);
      storedCoursesJsonRef.current = savedCoursesJson;
      setCourses(Array.isArray(savedCourses) ? savedCourses : []);
    } catch (error) {
      console.error("Error syncing saved courses:", error);
    }
  }, []);

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

    const mergedCoursesJson = JSON.stringify(mergedCourses);
    await SecureStorage.save("ta_courses", mergedCoursesJson);
    storedCoursesJsonRef.current = mergedCoursesJson;
    setCourses(mergedCourses);
    await appendGradeHistorySnapshot(freshCourses, "refresh");
    return mergedCourses;
  };

  const onFetchResult = useCallback(
    async (result: string) => {
      if (
        result.includes("Login Failed") ||
        result.includes("Session expired")
      ) {
        // Try automatic re-authentication first
        const savedUsername = await SecureStorage.load("ta_username");
        const savedPassword = await SecureStorage.load("ta_password");

        if (savedUsername && savedPassword && !shouldRefreshWithLogin) {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, shouldRefreshWithLogin],
  );

  const onError = useCallback((error: string) => {
    setMessage(`Error: ${error}`);
    setShouldRefreshWithLogin(false);
    setIsLoading(false);
    setRefreshSource(null);
  }, []);

  const onLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const onSilentStartupRefreshResult = useCallback(
    async (result: string) => {
      setShouldRunSilentStartupRefresh(false);

      if (
        result.includes("Login Failed") ||
        result.includes("Session expired")
      ) {
        return;
      }

      await syncCoursesFromStorage();
    },
    [syncCoursesFromStorage],
  );

  const onSilentStartupRefreshError = useCallback((_error: string) => {
    setShouldRunSilentStartupRefresh(false);
  }, []);

  const onSilentStartupRefreshLoadingChange = useCallback(
    (_loading: boolean) => {},
    [],
  );

  const loadHtmlOrFetch = useCallback(async (
    options: { scheduleSilentRefresh?: boolean } = {},
  ) => {
    const scheduleSilentRefresh = options.scheduleSilentRefresh ?? false;
    setMessage("");
    const savedCoursesJson = await SecureStorage.load("ta_courses");
    const savedUsername = await SecureStorage.load("ta_username");
    const savedPassword = await SecureStorage.load("ta_password");

    await getUserName();
    await loadLastRetrieved();

    if (savedCoursesJson) {
      try {
        const savedCourses: Course[] = JSON.parse(savedCoursesJson);
        const mergedCourses = cachedCoursesRef.current
          ? mergeCoursesWithCache(savedCourses, cachedCoursesRef.current)
          : savedCourses;
        cachedCoursesRef.current = null;
        const mergedCoursesJson = JSON.stringify(mergedCourses);
        if (mergedCourses !== savedCourses) {
          await SecureStorage.save("ta_courses", mergedCoursesJson);
        }
        storedCoursesJsonRef.current = mergedCoursesJson;
        setCourses(mergedCourses);
        await appendGradeHistorySnapshot(mergedCourses, "cache");

        setMessage("");
        setIsLoading(false);
        if (scheduleSilentRefresh && savedUsername && savedPassword) {
          setShouldRunSilentStartupRefresh(true);
        }
      } catch (error) {
        console.error("Error parsing saved courses:", error);
        setMessage("Error loading saved courses. Fetching fresh data...");
        // Continue to fetch fresh data
      }
    }

    if (!savedCoursesJson) {
      storedCoursesJsonRef.current = null;
      console.warn("Courses not found in storage");
      setShouldRunSilentStartupRefresh(false);
      setIsLoading(true);
    }
  }, [getUserName, loadLastRetrieved]);

  const handleRefresh = async (source: "pull" | "button" = "button") => {
    setIsLoading(true);
    setRefreshSource(source);
    setMessage("");

    const networkState = await NetInfo.fetch();

    if (networkState.isConnected === false) {
      setMessage(`No internet connection.\nCheck your network and try again.`);
      setIsLoading(false);
      setRefreshSource(null);
      hapticsNotification(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const savedUsername = await SecureStorage.load("ta_username");
    const savedPassword = await SecureStorage.load("ta_password");

    if (!savedUsername || !savedPassword) {
      router.replace("/signin");
      return;
    }

    // Keep current cache to merge in case TeachAssist hides grades temporarily.
    cachedCoursesRef.current = courses;
    hapticsNotification(Haptics.NotificationFeedbackType.Success);
    setLoginCredentials({ username: savedUsername, password: savedPassword });
    setShouldRefreshWithLogin(true);
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
  const schoolYearCourses = visibleCourses.filter(
    (course) => course.semester === 0,
  );
  const hasSemesterCourses =
    semester1Courses.length > 0 || semester2Courses.length > 0;
  const showSchoolYearOnly =
    !hasSemesterCourses && schoolYearCourses.length > 0;
  const showSemester2First =
    now >= new Date(schoolYearStart + 1, 1, 2) &&
    now <= new Date(schoolYearStart + 1, 5, 30, 23, 59, 59, 999);

  const renderSemesterCourses = (label: string, list: Course[]) => {
    if (list.length === 0) return null;
    return (
      <View className="mt-2">
        <View
          className={`${
            label === "Semester 1" || label === "School Year" ? "mt-8" : "mt-4"
          }`}
        >
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-medium`}
          >
            {label.startsWith("Semester") ? (
              <>
                Semester{" "}
                <Text className={`text-baccent text-2xl font-bold`}>
                  {label.replace("Semester ", "")}
                </Text>
              </>
            ) : (
              <Text className={`text-baccent text-2xl font-bold`}>{label}</Text>
            )}
          </Text>
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2`}
          >
            {list.length} courses available
          </Text>
        </View>
        <View className="mb-3"></View>
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
    loadHtmlOrFetch({ scheduleSilentRefresh: true });
  }, [loadHtmlOrFetch]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const syncIfActive = async () => {
        if (!isActive) return;
        await syncCoursesFromStorage();
      };

      const loadPreferences = async () => {
        const storedHideUnavailable = await AsyncStorage.getItem(
          "hide_unavailable_marks",
        );
        setHideUnavailableMarks(storedHideUnavailable === "true");
        const storedTapToReveal = await AsyncStorage.getItem(
          "tap_to_reveal_marks",
        );
        setTapToRevealMarks(storedTapToReveal === "true");
        await syncIfActive();
      };

      loadPreferences();
      const appStateSubscription = AppState.addEventListener(
        "change",
        (nextState) => {
          if (nextState === "active") {
            syncIfActive();
          }
        },
      );
      const unsubscribeCourseStorage = subscribeCourseStorageUpdates(() => {
        syncIfActive();
      });

      return () => {
        isActive = false;
        appStateSubscription.remove();
        unsubscribeCourseStorage();
      };
    }, [syncCoursesFromStorage]),
  );

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <VersionUpdateModal
        visible={showVersionUpdate}
        mode={updateMode}
        latestVersion={updateLatest}
        minimumVersion={updateMinimum}
        onClose={async () => {
          setShowVersionUpdate(false);
          await markVersionPromptDismissed(updateLatest);
        }}
      />
      <FoolsModal
        visible={
          showFoolsModal && !showVersionUpdate && updateMode !== "required"
        }
        onClose={async () => {
          setShowFoolsModal(false);
          try {
            await AsyncStorage.setItem(
              TEST_MODAL_YEAR_KEY,
              new Date().getFullYear().toString(),
            );
          } catch (error) {
            console.warn(
              "[FoolsModal] Failed to persist dismissed state.",
              error,
            );
          }
        }}
      />
      <UpdatesModal
        visible={
          showUpdates &&
          !showFoolsModal &&
          !showVersionUpdate &&
          updateMode !== "required"
        }
        onClose={() => setShowUpdates(false)}
        version={appVersion}
      />
      {(now >= start && now <= new Date(year, 11, 31, 23, 59, 59, 999)) ||
      (now.getMonth() === 0 && now <= end) ? (
        <SnowEffect count={37} speed={1.1} drift={26} />
      ) : (
        <></>
      )}
      {renderHeaderOutside && headerContent(true)}
      {renderGreetingOutside && <Messages />}
      {message === "" ? (
        <View className={`mb-3`}></View> // show nothing successfully fetched
      ) : (
        <Text
          className={`${
            message.includes("No internet")
              ? "bg-danger/70 text-appwhite"
              : `bg-baccent/80 ${isDark ? "text-appwhite" : "text-appblack"}`
          } mt-5 p-2 text-center rounded-xl font-medium mb-5 mx-5 px-5`}
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
      {shouldRunSilentStartupRefresh && !shouldRefreshWithLogin && (
        <TeachAssistAuthFetcher
          fetchWithCookies
          prefetchCourses
          onResult={onSilentStartupRefreshResult}
          onError={onSilentStartupRefreshError}
          onLoadingChange={onSilentStartupRefreshLoadingChange}
        />
      )}

      {courses.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="px-5"
          contentContainerStyle={{ paddingBottom: nativeTabBottomPadding }}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={() => handleRefresh("pull")}
              progressViewOffset={
                nativeTabsEnabled && Platform.OS === "ios" && (Platform as { isPad: boolean }).isPad ? insets.top + 44 : 0
              }
              tintColor={activeTone.accent}
              colors={[activeTone.accent, "#43a25a", "#fcc245", "#f67c15"]}
              progressBackgroundColor={activeTone.bg1}
            />
          }
        >
          {isLandscape && headerContent(false)}
          {isLandscape && (
            <View className="-mx-5">
              <Messages />
            </View>
          )}
          {/* this is literally the only way it works and i have no idea why wtf*/}
          <View className=" mt-5">
            <GradeAverageTracker
              showTrend={true}
              showCourseCount={true}
              showLastUpdated={true}
              hideMarksUntilTap={tapToRevealMarks}
              refreshToken={marksLastRetrieved ?? undefined}
            />
          </View>
          {showSchoolYearOnly ? (
            <>{renderSemesterCourses("School Year", schoolYearCourses)}</>
          ) : showSemester2First ? (
            <>
              {renderSemesterCourses("Semester 2", semester2Courses)}
              {renderSemesterCourses("Semester 1", semester1Courses)}
            </>
          ) : (
            <>
              {renderSemesterCourses("Semester 1", semester1Courses)}
              {renderSemesterCourses("Semester 2", semester2Courses)}
            </>
          )}
          {/* 
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
          */}
          <View className="items-center">
            <LiquidGlassButton
              contentStyle={{
                marginBottom: 33,
                shadowColor: "#000",
                shadowOpacity: isDark ? 0.2 : 0.12,
                shadowRadius: 10,
                borderRadius: 12,
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                elevation: 4,
                alignSelf: "flex-start",
              }}
              glassTintColor={activeTone.bg2}
              fallbackBackgroundColor={activeTone.bg4}
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                router.push("/GradeExport");
              }}
            >
              <View className=" p-4 flex-row items-center justify-center gap-2">
                <Image
                  className="w-5 h-5"
                  style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
                  source={require("../../assets/images/share.png")}
                />
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-md`}
                >
                  Export Grades
                </Text>
              </View>
            </LiquidGlassButton>
          </View>
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
