import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import { useLiquidGlassActive } from "@/utils/liquidGlass";
import {
  buildTeacherSearchUrl,
  fetchOctJson,
  formatTeacherDate,
  parseTeacherResults,
  type TeacherSearchResult,
} from "@/utils/teacherRegistry";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import AppTextInput from "@/components/ui/AppTextInput";
import BackButton from "@/components/ui/Back";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";

const MAX_VISIBLE_RESULTS = 40;
const TEACHER_SEARCH_STATE_KEY = "teacher_search_state";

const TeacherSearch = () => {
  const router = useRouter();
  const { activeTone, isDark } = useTheme();
  const liquidGlassEnabled = useLiquidGlassActive();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TeacherSearchResult[] | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showLoadingHint, setShowLoadingHint] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [validationError, setValidationError] = useState("");

  const inputClassName = `${
    isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"
  } rounded-xl px-3 py-2 flex-1`;
  const labelClassName = `${
    isDark ? "text-appgraylight" : "text-appgraydark"
  } text-sm font-medium`;
  const mutedTextClassName = isDark ? "text-appgraylight" : "text-appgraydark";

  useEffect(() => {
    const loadSearchState = async () => {
      try {
        const storedState = await AsyncStorage.getItem(
          TEACHER_SEARCH_STATE_KEY,
        );
        if (!storedState) return;

        const parsed = JSON.parse(storedState);
        if (typeof parsed.query === "string") {
          setQuery(parsed.query);
        }
        if (Array.isArray(parsed.results)) {
          setResults(parsed.results);
        }
      } catch {
        await AsyncStorage.removeItem(TEACHER_SEARCH_STATE_KEY);
      }
    };

    loadSearchState();
  }, []);

  useEffect(() => {
    if (!loadingSearch) {
      setShowLoadingHint(false);
      return;
    }

    const timeout = setTimeout(() => {
      setShowLoadingHint(true);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [loadingSearch]);

  const updateQuery = (value: string) => {
    setQuery(value);
    setResults(null);
    setValidationError("");
    AsyncStorage.setItem(
      TEACHER_SEARCH_STATE_KEY,
      JSON.stringify({
        query: value,
        results: null,
      }),
    ).catch(() => {});
  };

  const searchTeachers = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      await hapticsNotification(Haptics.NotificationFeedbackType.Error);
      setValidationError("Name must be at least 3 letters long.");
      setResults(null);
      await AsyncStorage.setItem(
        TEACHER_SEARCH_STATE_KEY,
        JSON.stringify({
          query: trimmed,
          results: null,
        }),
      );
      return;
    }

    setValidationError("");
    setLoadingSearch(true);

    try {
      const payload = await fetchOctJson(buildTeacherSearchUrl(trimmed));
      const parsedResults = parseTeacherResults(payload.value);
      setResults(parsedResults);
      await AsyncStorage.setItem(
        TEACHER_SEARCH_STATE_KEY,
        JSON.stringify({
          query: trimmed,
          results: parsedResults,
        }),
      );
      if (parsedResults.length === 0) {
        await hapticsNotification(Haptics.NotificationFeedbackType.Error);
      } else {
        await hapticsNotification(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.warn("teacher search failed", error);
      await hapticsNotification(Haptics.NotificationFeedbackType.Error);
      AppAlert.alert(
        "Teacher Search Failed",
        "Check your connection, restart the dev server if you just added .env values, then try a more specific name.",
        { icon: AlertIcon.error },
      );
    } finally {
      setLoadingSearch(false);
    }
  };

  const openTeacher = async (teacher: TeacherSearchResult) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/TeacherSearch/[octid]",
      params: {
        octid: teacher.id,
        name: teacher.name,
        status: teacher.status,
        firstCertified: teacher.firstCertified ?? "",
        applicationType: teacher.applicationType ?? "",
        clientGuid: teacher.clientGuid ?? "",
      },
    });
  };

  const visibleResults =
    results?.filter(
      (teacher) =>
        !showActiveOnly ||
        teacher.status.toLowerCase().includes("good standing"),
    ) ?? [];
  const displayedResults = visibleResults.slice(0, MAX_VISIBLE_RESULTS);
  const hiddenResultCount = Math.max(
    visibleResults.length - MAX_VISIBLE_RESULTS,
    0,
  );

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <Modal visible={showInfo} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-5">
          <View
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-2xl p-5 w-full max-w-md`}
          >
            <View className="items-center mb-4">
              <Image
                source={require("../../assets/images/diploma.png")}
                className="my-3"
                style={{
                  tintColor: activeTone.accent,
                  width: 85,
                  height: 85,
                }}
              />
            </View>
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-3`}
            >
              Teacher Search
            </Text>
            <Text className={`${mutedTextClassName} mb-4 leading-6`}>
              This tool searches the Ontario College of Teachers public register
              and shows public certification, education, and qualification
              records. Search with a full name or specific surname for best
              results.{`\n\n`}The search accomodates both teacher names and OCT
              ID. Give it a shot!
            </Text>
            <TouchableOpacity
              className={`mt-2 ${isDark ? "bg-dark4" : "bg-light4"} rounded-xl p-3`}
              onPress={async () => {
                await hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                setShowInfo(false);
              }}
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-center font-medium`}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <BackButton path="/profile" />
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
          paddingHorizontal: liquidGlassEnabled ? 0 : 8,
          paddingVertical: liquidGlassEnabled ? 0 : 8,
          alignItems: "center",
          justifyContent: "center",
        }}
        glassTintColor={activeTone.bg4}
        fallbackBackgroundColor={activeTone.bg4}
        onPress={() => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          setShowInfo(true);
        }}
      >
        <Image
          source={require("../../assets/images/question.png")}
          className={liquidGlassEnabled ? "w-7 h-7" : "w-8 h-8"}
          style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
        />
      </LiquidGlassButton>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{
          paddingTop: 118,
          paddingBottom: 40,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          Teacher Search
        </Text>
        <Text className={`mt-1 text-base leading-6 ${mutedTextClassName}`}>
          Search Ontario certified teachers and view public qualification
          records.
        </Text>

        <LiquidGlassView
          className="rounded-xl p-4 mt-7"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <Text className={`${labelClassName} mb-2`}>Teacher Name</Text>
          <View className="flex-row gap-2">
            <AppTextInput
              className={inputClassName}
              value={query}
              onChangeText={updateQuery}
              placeholder='e.g. "Jennifer Wong"'
              placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              onSubmitEditing={searchTeachers}
              maxLength={40}
            />
            <LiquidGlassButton
              contentStyle={{
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
              glassTintColor={activeTone.accent}
              fallbackBackgroundColor={activeTone.accent}
              disabled={loadingSearch}
              onPress={async () => {
                await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                searchTeachers();
              }}
            >
              <Text className={`${isDark ? "text-appblack" : "text-appwhite"} font-semibold`}>Search</Text>
            </LiquidGlassButton>
          </View>
          {validationError ? (
            <Text className="text-danger text-sm mt-3">{validationError}</Text>
          ) : null}
          {!query.trim() && !validationError ? (
            <Text className={`${mutedTextClassName} text-sm mt-3`}>
              Search by full name or a specific surname. Broad first-name
              searches may return too many records.
            </Text>
          ) : null}
        </LiquidGlassView>

        {!query.trim() && results === null && !loadingSearch ? (
          <LiquidGlassView
            className="rounded-xl p-4 mt-5"
            contentStyle={{
              minHeight: 400,
              flex: 1,
              justifyContent: "center",
            }}
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className={`items-center justify-center px-8 py-25`}>
              <Image
                source={require("../../assets/images/search_icon.png")}
                className={`w-30 h-30 mb-3`}
                style={{ tintColor: activeTone.accent }}
              />
              <Text
                className={`${isDark ? "text-light3" : "text-dark3"} text-xl font-semibold text-center mb-2`}
              >
                No Teacher Selected
              </Text>
              <Text className={`text-gray-400 text-center text-lg leading-6`}>
                Search for a teacher to begin.
              </Text>
            </View>
          </LiquidGlassView>
        ) : null}

        {loadingSearch ? (
          <View>
            <ActivityIndicator
              size="large"
              className="mt-8"
              color={activeTone.accent}
            />
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold text-center mt-5`}
            >
              Searching for your teacher...
            </Text>
            {showLoadingHint ? (
              <Text
                className={`${mutedTextClassName} text-sm text-center mt-3 px-6 leading-5`}
              >
                This search is taking longer than usual. Try narrowing the
                teacher&apos;s name if the result list is broad.
              </Text>
            ) : null}
          </View>
        ) : null}

        {results ? (
          <View className="mt-6">
            <View className="flex-row items-center justify-between mb-5">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-semibold`}
              >
                Results
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  setShowActiveOnly((value) => !value);
                }}
                className={`px-3 py-2 rounded-full ${
                  showActiveOnly
                    ? "bg-baccent"
                    : isDark
                      ? "bg-dark4"
                      : "bg-light4"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    showActiveOnly ? isDark ? "text-appblack" : "text-appwhite" : mutedTextClassName
                  }`}
                >
                  Active only
                </Text>
              </TouchableOpacity>
            </View>

            {visibleResults.length === 0 ? (
              <Text className={`${mutedTextClassName} text-sm`}>
                No matches found.
              </Text>
            ) : (
              <>
                {hiddenResultCount > 0 ? (
                  <Text className={`${mutedTextClassName} text-sm mb-3`}>
                    Showing the first {MAX_VISIBLE_RESULTS} results. Add more of
                    the teacher&apos;s name to narrow the search.
                  </Text>
                ) : null}
                {displayedResults.map((teacher, index) => {
                  const isActive = teacher.status
                    .toLowerCase()
                    .includes("good standing");
                  return (
                    <TouchableOpacity
                      key={`${teacher.id || teacher.name}-${index}`}
                      onPress={() => openTeacher(teacher)}
                      className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 mb-3`}
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text
                            className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                          >
                            {teacher.name}
                          </Text>
                          <View className="flex-row items-center gap-2 mt-1">
                            {/*
                            <Image
                              source={require("../../assets/images/id-card.png")}
                              className="w-6 h-6"
                              style={{ tintColor: activeTone.accent }}
                            />
                            */}
                            <Text
                              className={`${mutedTextClassName} text-sm mt-1`}
                            >
                              OCT ID:{" "}
                              <Text className="font-bold">{teacher.id}</Text>
                            </Text>
                          </View>
                          {teacher.firstCertified ? (
                            <View className="flex-row items-center gap-1 mt-1">
                              {/* 
                              <Image
                                source={require("../../assets/images/calendar-check.png")}
                                className="w-6 h-6"
                                style={{ tintColor: activeTone.accent }}
                              />
                              */}
                              <Text className={`${mutedTextClassName} text-sm`}>
                                First certified:{" "}
                                <Text className="font-bold">
                                  {formatTeacherDate(teacher.firstCertified)}
                                </Text>
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View className="flex-row items-center gap-1">
                          {isActive ? (
                            <Image
                              source={require("../../assets/images/checkmark.png")}
                              className="w-5 h-5 mr-1"
                              style={{
                                tintColor: activeTone.accent,
                              }}
                            />
                          ) : (
                            <Image
                              source={require("../../assets/images/cross.png")}
                              className="w-4 h-4 mr-1"
                              style={{
                                tintColor: isActive ? "#43a25a" : "#d6363f",
                              }}
                            />
                          )}
                          <Text
                            className={`text-sm font-semibold ${
                              isActive ? "text-baccent" : "text-danger"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default TeacherSearch;
