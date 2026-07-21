import GradeAverageTracker from "@/components/GradeAverage";
import Messages from "@/components/Messages";
import FoolsModal from "@/components/modals/FoolsModal";
import UpdatesModal from "@/components/modals/UpdatesModal";
import VersionUpdateModal from "@/components/modals/VersionUpdateModal";
import { CourseInfoBox } from "@/components/QuickCourse";
import Text from "@/components/ui/AppText";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { SnowEffect } from "@/components/ui/SnowEffect";
import { useAFoolVisualGrades } from "@/contexts/AFoolVisualGradesContext";
import { useTheme } from "@/contexts/ThemeContext";
import { appVersionLabel, appVersionNumber } from "@/utils/appVersion";
import { SUMMER_SEMESTER, type Course } from "@/utils/CourseParser";
import {
  getCoursesFromMemory,
  primeCoursesMemoryCache,
} from "@/utils/coursesMemoryCache";
import { subscribeCourseStorageUpdates } from "@/utils/courseStorageEvents";
import { appendGradeHistorySnapshot } from "@/utils/gradeHistory";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import { useNativeTabsEnabled } from "@/utils/nativeTabs";
import { notePositiveInteraction } from "@/utils/storeReview";
import {
  loadVersionCheckState,
  markVersionPromptDismissed,
  runVersionCheck,
  shouldShowUpdatePrompt,
  type VersionUpdateMode,
} from "@/utils/versionCheck";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

const TEST_MODAL_YEAR_KEY = "lastSeenFoolsModalYear";
const HEADER_ACTION_BUTTON_SIZE = 48;
const HEADER_ACTION_ICON_SIZE = 25;

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
  const isTablet = Math.min(width, height) >= 600;
  const headerTopMargin = Platform.OS === "ios" ? 56 : 59;
  const nativeTabBottomPadding = nativeTabsEnabled
    ? isLandscape
      ? 0
      : insets.bottom + 32
    : 12;
  const [courses, setCourses] = useState<Course[]>(
    () => getCoursesFromMemory() ?? [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [refreshSource, setRefreshSource] = useState<"pull" | "button" | null>(
    null,
  );
  const [hideUnavailableMarks, setHideUnavailableMarks] = useState(false);
  const [tapToRevealMarks, setTapToRevealMarks] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [marksLastRetrieved, setMarksLastRetrieved] = useState<string | null>(
    null,
  );
  const [shouldRunSilentStartupRefresh, setShouldRunSilentStartupRefresh] =
    useState(false);
  const [shouldRefreshWithCookies, setShouldRefreshWithCookies] =
    useState(false);
  const [shouldRefreshWithLogin, setShouldRefreshWithLogin] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const storedCoursesJsonRef = useRef<string | null>(null);
  const isButtonRefreshing = refreshSource === "button" && isLoading;
  const isPullRefreshing = refreshSource === "pull" && isLoading;
  const headerContent = (withHorizontalPadding: boolean) => (
    <View
      className={`flex-row items-center justify-between ${
        withHorizontalPadding ? "px-5" : "mt-13"
      }`}
      style={withHorizontalPadding ? { marginTop: headerTopMargin } : undefined}
    >
      <Text
        className={`text-5xl font-semibold leading-[55px] ${isDark ? "text-appwhite" : "text-appblack"}`}
      >
        My Courses
      </Text>
      <View className="flex-row items-center">
        {showRefreshButton ? (
          <LiquidGlassButton
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              handleRefresh("button");
            }}
            disabled={isLoading}
            containerStyle={[
              { marginRight: 10 },
              isButtonRefreshing
                ? { opacity: 0.85, transform: [{ scale: 0.98 }] }
                : undefined,
            ]}
            contentStyle={{
              borderRadius: 12,
              width: HEADER_ACTION_BUTTON_SIZE,
              height: HEADER_ACTION_BUTTON_SIZE - 5,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            glassTintColor={activeTone.accent}
            fallbackBackgroundColor={activeTone.accent}
          >
            {isButtonRefreshing ? (
              <ActivityIndicator
                size="small"
                color={isDark ? "#111113" : "#fbfbfb"}
              />
            ) : (
              <Image
                source={require("../../assets/images/refresh.png")}
                style={{
                  width: HEADER_ACTION_ICON_SIZE,
                  height: HEADER_ACTION_ICON_SIZE,
                  resizeMode: "contain",
                  tintColor: `${isDark ? "#111113" : "#fbfbfb"}`,
                }}
              />
            )}
          </LiquidGlassButton>
        ) : null}
        <LiquidGlassButton
          onPress={() => {
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            router.push("/GradeUpdates");
          }}
          contentStyle={{
            borderRadius: 12,
            width: HEADER_ACTION_BUTTON_SIZE,
            height: HEADER_ACTION_BUTTON_SIZE - 5,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
          glassTintColor={activeTone.accent}
          fallbackBackgroundColor={activeTone.accent}
        >
          <Image
            source={require("../../assets/images/inbox.png")}
            style={{
              width: HEADER_ACTION_ICON_SIZE,
              height: HEADER_ACTION_ICON_SIZE,
              resizeMode: "contain",
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
      primeCoursesMemoryCache(null);
      storedCoursesJsonRef.current = null;
      setCourses([]);
      return;
    }

    if (savedCoursesJson === storedCoursesJsonRef.current) {
      return;
    }

    try {
      const savedCourses: Course[] = JSON.parse(savedCoursesJson);
      primeCoursesMemoryCache(savedCoursesJson);
      storedCoursesJsonRef.current = savedCoursesJson;
      setCourses(Array.isArray(savedCourses) ? savedCourses : []);
    } catch (error) {
      console.error("Error syncing saved courses:", error);
    }
  }, []);

  const onCookieRefreshResult = useCallback(
    async (result: string) => {
      setShouldRefreshWithCookies(false);
      // taauth sends a specific prefix on auth failure — not raw HTML.
      // The cookie fetch already retried a full credential login internally,
      // so a failure here means the saved credentials no longer work.
      if (result.startsWith("Login Failed:")) {
        setMessage("Please log in again.");
        router.replace("/signin");
        setIsLoading(false);
        setRefreshSource(null);
        return;
      }
      // Manual refresh succeeded — no need for the startup silent refresh anymore
      setShouldRunSilentStartupRefresh(false);
      // taauth already merged and saved courses to storage; just sync state
      await loadLastRetrieved();
      await syncCoursesFromStorage();
      setIsLoading(false);
      setRefreshSource(null);
      notePositiveInteraction();
    },
    [router, loadLastRetrieved, syncCoursesFromStorage],
  );

  const onCredentialRefreshResult = useCallback(
    async (result: string) => {
      setShouldRefreshWithLogin(false);
      setLoginCredentials(null);
      if (result.includes("Login Failed") || result.includes("Session expired")) {
        setMessage("Please log in again.");
        router.replace("/signin");
        setIsLoading(false);
        setRefreshSource(null);
        return;
      }
      if (result.includes("Login Success")) {
        // Manual refresh succeeded — no need for the startup silent refresh anymore
        setShouldRunSilentStartupRefresh(false);
        await loadLastRetrieved();
        await syncCoursesFromStorage();
        setMessage("");
        setIsLoading(false);
        setRefreshSource(null);
        notePositiveInteraction();
      }
    },
    [router, loadLastRetrieved, syncCoursesFromStorage],
  );

  const onError = useCallback((error: string) => {
    setMessage(`Error: ${error}`);
    setShouldRefreshWithCookies(false);
    setShouldRefreshWithLogin(false);
    setLoginCredentials(null);
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

  const loadHtmlOrFetch = useCallback(
    async (options: { scheduleSilentRefresh?: boolean } = {}) => {
      const scheduleSilentRefresh = options.scheduleSilentRefresh ?? false;
      setMessage("");
      const [savedCoursesJson, savedUsername, savedPassword, savedLastRetrieved] =
        await Promise.all([
          SecureStorage.load("ta_courses"),
          SecureStorage.load("ta_username"),
          SecureStorage.load("ta_password"),
          SecureStorage.load("marks_last_retrieved"),
        ]);
      setMarksLastRetrieved(savedLastRetrieved);

      if (savedCoursesJson) {
        try {
          const savedCourses: Course[] = JSON.parse(savedCoursesJson);
          primeCoursesMemoryCache(savedCoursesJson);
          storedCoursesJsonRef.current = savedCoursesJson;
          setCourses(savedCourses);

          setMessage("");
          setIsLoading(false);
          if (scheduleSilentRefresh && savedUsername && savedPassword) {
            setShouldRunSilentStartupRefresh(true);
          }
          // History snapshots do their own storage IO; keep them off the
          // first-paint path.
          appendGradeHistorySnapshot(savedCourses, "cache").catch(() => {});
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
    },
    [],
  );

  const handleRefresh = async (source: "pull" | "button" = "button") => {
    setIsLoading(true);
    setRefreshSource(source);
    setMessage("");
    // A manual refresh supersedes the startup silent refresh; leaving it armed
    // lets a second fetch land right after this one finishes.
    setShouldRunSilentStartupRefresh(false);

    const networkState = await NetInfo.fetch();

    if (networkState.isConnected === false) {
      setMessage(`No internet connection.\nCheck your network and try again.`);
      setIsLoading(false);
      setRefreshSource(null);
      hapticsNotification(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const [savedUsername, savedPassword, lastAuthTime] = await Promise.all([
      SecureStorage.load("ta_username"),
      SecureStorage.load("ta_password"),
      SecureStorage.load("ta_last_auth_time"),
    ]);

    if (!savedUsername || !savedPassword) {
      router.replace("/signin");
      return;
    }

    hapticsNotification(Haptics.NotificationFeedbackType.Success);

    // Use the fast cookie path when the session is confirmed fresh (saved within 15 min).
    // Fall back to a full credential login when the session may be expired to avoid
    // the TA portal hanging on stale-cookie requests before eventually redirecting.
    const elapsed = lastAuthTime ? Date.now() - parseInt(lastAuthTime, 10) : Infinity;
    if (Number.isFinite(elapsed) && elapsed <= 15 * 60 * 1000) {
      setShouldRefreshWithCookies(true);
    } else {
      setLoginCredentials({ username: savedUsername, password: savedPassword });
      setShouldRefreshWithLogin(true);
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
  const summerCourses = visibleCourses.filter(
    (course) => course.semester === SUMMER_SEMESTER,
  );
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
    semester1Courses.length > 0 ||
    semester2Courses.length > 0 ||
    summerCourses.length > 0;
  const showSchoolYearOnly =
    !hasSemesterCourses && schoolYearCourses.length > 0;

  const renderSemesterCourses = (label: string, list: Course[]) => {
    if (list.length === 0) return null;
    return (
      <View className="mt-2">
        <View
          className={`${
            label === "Semester 1" ||
            label === "School Year" ||
            label === "Summer School"
              ? "mt-8"
              : "mt-4"
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
            {course.subjectId ? (
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

  // Sections render newest → oldest so the current term always leads. The school
  // year progresses Semester 1 → Semester 2 → Summer School, so this fixed
  // reverse-chronological order naturally surfaces whatever term is active first
  // (e.g. in July: Summer School, then Semester 2, then Semester 1). Semester-0
  // courses (summer / non-semestered schools) must render alongside the
  // semesters, not only when they're the *only* courses — a returning student
  // doing summer school still has their regular-year courses cached.
  const renderCourseSections = () => {
    if (showSchoolYearOnly) {
      return renderSemesterCourses("School Year", schoolYearCourses);
    }
    return (
      <>
        {renderSemesterCourses("Summer School", summerCourses)}
        {renderSemesterCourses("School Year", schoolYearCourses)}
        {renderSemesterCourses("Semester 2", semester2Courses)}
        {renderSemesterCourses("Semester 1", semester1Courses)}
      </>
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
        const [storedHideUnavailable, storedTapToReveal, storedShowRefreshButton] =
          await Promise.all([
            AsyncStorage.getItem("hide_unavailable_marks"),
            AsyncStorage.getItem("tap_to_reveal_marks"),
            AsyncStorage.getItem("show_refresh_button"),
          ]);
        setHideUnavailableMarks(storedHideUnavailable === "true");
        setTapToRevealMarks(storedTapToReveal === "true");
        setShowRefreshButton(storedShowRefreshButton === "true");
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
      {headerContent(true)}
      <Messages />
      {message === "" ? (
        <View className={`mb-3`}></View>
      ) : (
        <Text
          className={`${
            message.includes("No internet")
              ? "bg-danger/70 text-appwhite"
              : `bg-baccent/80 ${isDark ? "text-appwhite" : "text-appblack"}`
          } mt-5 p-2 text-center rounded-xl font-medium mb-5 mx-5 px-5`}
        >
          {message}
        </Text>
      )}
      {shouldRefreshWithCookies && (
        <TeachAssistAuthFetcher
          fetchWithCookies
          prefetchCourses
          onResult={onCookieRefreshResult}
          onError={onError}
          onLoadingChange={onLoadingChange}
        />
      )}
      {shouldRefreshWithLogin && loginCredentials && (
        <TeachAssistAuthFetcher
          loginParams={loginCredentials}
          prefetchCourses
          onResult={onCredentialRefreshResult}
          onError={onError}
          onLoadingChange={onLoadingChange}
        />
      )}
      {shouldRunSilentStartupRefresh &&
        !shouldRefreshWithCookies &&
        !shouldRefreshWithLogin && (
          <TeachAssistAuthFetcher
            fetchWithCookies
            prefetchCourses
            onResult={onSilentStartupRefreshResult}
            onError={onSilentStartupRefreshError}
            onLoadingChange={onSilentStartupRefreshLoadingChange}
          />
        )}

      {courses.length > 0 && isLandscape ? (
        <View className="flex-1 flex-row gap-4 px-5 mt-4 pb-4 mb-1">
          <View
            style={{ flex: 1, paddingTop: isTablet ? 16 : 0 }}
            className="self-stretch"
          >
            <GradeAverageTracker
              showTrend={true}
              showCourseCount={true}
              showLastUpdated={true}
              hideMarksUntilTap={tapToRevealMarks}
              refreshToken={marksLastRetrieved ?? undefined}
              fillHeight
            />
          </View>
          <View style={{ flex: 2 }}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: nativeTabBottomPadding }}
              refreshControl={
                <RefreshControl
                  refreshing={isPullRefreshing}
                  onRefresh={() => handleRefresh("pull")}
                  progressViewOffset={
                    nativeTabsEnabled &&
                    Platform.OS === "ios" &&
                    (Platform as { isPad: boolean }).isPad
                      ? insets.top + 44
                      : 0
                  }
                  tintColor={activeTone.accent}
                  colors={[activeTone.accent, "#43a25a", "#fcc245", "#f67c15"]}
                  progressBackgroundColor={activeTone.bg1}
                />
              }
            >
              {renderCourseSections()}
              <View className="items-center">
                <LiquidGlassButton
                  contentStyle={{
                    marginBottom: 33,
                    borderRadius: 12,
                    alignSelf: "flex-start",
                  }}
                  glassTintColor={activeTone.bg2}
                  fallbackBackgroundColor={activeTone.bg4}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    router.push("/GradeExport");
                  }}
                >
                  <View className="px-4 py-3 flex-row items-center justify-center gap-2">
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
          </View>
        </View>
      ) : courses.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="px-5"
          contentContainerStyle={{ paddingBottom: nativeTabBottomPadding }}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={() => handleRefresh("pull")}
              progressViewOffset={
                nativeTabsEnabled &&
                Platform.OS === "ios" &&
                (Platform as { isPad: boolean }).isPad
                  ? insets.top + 44
                  : 0
              }
              tintColor={activeTone.accent}
              colors={[activeTone.accent, "#43a25a", "#fcc245", "#f67c15"]}
              progressBackgroundColor={activeTone.bg1}
            />
          }
        >
          <View className="mt-1">
            <GradeAverageTracker
              showTrend={true}
              showCourseCount={true}
              showLastUpdated={true}
              hideMarksUntilTap={tapToRevealMarks}
              refreshToken={marksLastRetrieved ?? undefined}
            />
          </View>
          {renderCourseSections()}
          <View className="items-center">
            <LiquidGlassButton
              contentStyle={{
                marginBottom: 33,
                borderRadius: 12,
                alignSelf: "flex-start",
              }}
              glassTintColor={activeTone.bg2}
              fallbackBackgroundColor={activeTone.bg4}
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                router.push("/GradeExport");
              }}
            >
              <View className="px-4 py-3 flex-row items-center justify-center gap-2">
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
      ) : null}

      {courses.length === 0 && (!isLoading || refreshSource !== null) && (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: nativeTabBottomPadding,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={() => handleRefresh("pull")}
              progressViewOffset={
                nativeTabsEnabled &&
                Platform.OS === "ios" &&
                (Platform as { isPad: boolean }).isPad
                  ? insets.top + 44
                  : 0
              }
              tintColor={activeTone.accent}
              colors={[activeTone.accent, "#43a25a", "#fcc245", "#f67c15"]}
              progressBackgroundColor={activeTone.bg1}
            />
          }
        >
          <LiquidGlassView
            containerClassName="flex-1 mt-6 mb-5 mx-5"
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-5 flex-1`}
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg3}
            glassEffectStyle="clear"
          >
            <View className="flex-1 items-center justify-center px-8 py-12">
              <Image
                source={require("../../assets/images/not_found.png")}
                className="w-30 h-30 mb-3"
                style={{ tintColor: activeTone.accent }}
              />
              <Text
                className={`${isDark ? "text-light3" : "text-dark3"} text-xl font-semibold text-center mb-2`}
              >
                No courses found
              </Text>
              <Text className="text-gray-400 text-center text-lg leading-6">
                No active courses were found for this account. Try again later.
              </Text>
              {marksLastRetrieved ? (
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm text-center mt-4`}
                >
                  Last checked {new Date(marksLastRetrieved).toLocaleString()}
                </Text>
              ) : null}
            </View>
          </LiquidGlassView>
        </ScrollView>
      )}
    </View>
  );
};

export default CoursesScreen;
