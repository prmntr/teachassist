import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  TextInputSubmitEditingEventData,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SecureStorage } from "../(auth)/taauth";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import AppToggle from "@/components/ui/AppToggle";
import {
  getLiquidGlassEnabled,
  setLiquidGlassEnabled,
} from "@/utils/liquidGlass";
import {
  loadNotificationSettings,
  saveNotificationSetting,
  syncBackgroundTasks,
} from "@/utils/notifications";
import {
  DEFAULT_TEACHASSIST_SERVER_ORIGIN,
  getTeachAssistServerOrigin,
  normalizeTeachAssistServerOrigin,
  setTeachAssistServerOrigin,
} from "@/utils/serverConfig";
import { useAFoolVisualGrades } from "@/contexts/AFoolVisualGradesContext";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import AppTextInput from "@/components/ui/AppTextInput";
import BackButton from "@/components/ui/Back";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";

const clearServerDependentCache = async () => {
  const storedCoursesJson = await SecureStorage.load("ta_courses");

  if (storedCoursesJson) {
    try {
      const parsedCourses = JSON.parse(storedCoursesJson) as {
        subjectId?: string | number;
      }[];
      await Promise.all(
        parsedCourses
          .map((course) => course.subjectId)
          .filter(Boolean)
          .map((subjectId) => SecureStorage.delete(`course_${subjectId}`)),
      );
    } catch {
      // Ignore malformed cached course data.
    }
  }

  await Promise.all([
    SecureStorage.delete("ta_student_id"),
    SecureStorage.delete("ta_session_token"),
    SecureStorage.delete("ta_cookies"),
    SecureStorage.delete("ta_courses"),
    SecureStorage.delete("school_id"),
    SecureStorage.delete("school_name"),
    SecureStorage.delete("ta_appointments"),
    SecureStorage.delete("marks_last_retrieved"),
  ]);
};

const PersonalizationAdvancedScreen = () => {
  const router = useRouter();
  const { activeTone, isDark } = useTheme();
  const { afoolOverrideEnabled, setAFoolOverrideEnabled } =
    useAFoolVisualGrades();
  const [serverValue, setServerValue] = useState("");
  const [savedServer, setSavedServer] = useState(
    DEFAULT_TEACHASSIST_SERVER_ORIGIN,
  );
  const [markNotificationsEnabled, setMarkNotificationsEnabled] =
    useState(false);
  const [notifyWhenNoChanges, setNotifyWhenNoChanges] = useState(false);
  const [liquidGlassEnabled, setLiquidGlassEnabledState] = useState(false);
  const [aprilFoolsCode, setAprilFoolsCode] = useState("");
  const systemColorScheme = useColorScheme();
  const isAndroid = Platform.OS === "android";
  const showLiquidGlassAppearanceWarning =
    systemColorScheme === "light" && liquidGlassEnabled && isDark;

  useEffect(() => {
    const loadSettings = async () => {
      const [currentServer, notificationSettings, storedLiquidGlassEnabled] =
        await Promise.all([
          getTeachAssistServerOrigin(),
          loadNotificationSettings(),
          getLiquidGlassEnabled(),
        ]);
      setSavedServer(currentServer);
      setServerValue(currentServer);
      setMarkNotificationsEnabled(notificationSettings.markChangeEnabled);
      setNotifyWhenNoChanges(notificationSettings.notifyWhenNoChanges);
      setLiquidGlassEnabledState(storedLiquidGlassEnabled && !isAndroid);
    };

    loadSettings();
  }, [isAndroid]);

  const toggleNoChangeAlerts = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await saveNotificationSetting("notifyWhenNoChanges", value);
    setNotifyWhenNoChanges(value);
    await syncBackgroundTasks();
  };

  const toggleLiquidGlass = async (value: boolean) => {
    if (isAndroid) {
      return;
    }

    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await setLiquidGlassEnabled(value);
    setLiquidGlassEnabledState(value);
  };

  const submitAprilFoolsCode = async (
    event?: NativeSyntheticEvent<TextInputSubmitEditingEventData>,
  ) => {
    const submittedCode =
      event?.nativeEvent.text?.trim() ?? aprilFoolsCode.trim();

    if (
      submittedCode === "a secret code" ||
      submittedCode === "A secret code"
    ) {
      Alert.alert("You're not funny", "burger");
      return;
    }
    if (submittedCode !== "island") {
      Alert.alert(
        "The hum of incandescent lights grows louder.",
        "You feel something's changed.",
      );
      return;
    }

    const nextValue = !afoolOverrideEnabled;
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    await setAFoolOverrideEnabled(nextValue);
    setAprilFoolsCode("");

    Alert.alert(
      nextValue ? "You're a fool!" : "Not a fool",
      nextValue ? "Check your settings page..." : "Toggle off.",
    );
  };

  const saveServer = async (nextValue: string | null) => {
    const normalizedServer = nextValue
      ? normalizeTeachAssistServerOrigin(nextValue)
      : DEFAULT_TEACHASSIST_SERVER_ORIGIN;

    await setTeachAssistServerOrigin(nextValue);
    await clearServerDependentCache();
    setSavedServer(normalizedServer);
    setServerValue(normalizedServer);
    hapticsNotification(Haptics.NotificationFeedbackType.Success);

    Alert.alert(
      "Server Updated",
      "Session and course cache SUCESSFULLY CLEARED to allow clean connection.",
      [
        {
          text: "OK",
          onPress: () => {
            router.replace("/");
          },
        },
      ],
    );
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/Personalization" />
      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="px-5"
          contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
        >
          <Text
            className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
          >
            Advanced
          </Text>
          <Text
            className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
          >
            Settings for nerds
          </Text>

          <View className="mt-6">
            <Text className="text-2xl font-bold text-baccent mb-4">
              Notifications
            </Text>
            <LiquidGlassView
              className=" rounded-2xl overflow-hidden"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View
                className={`px-4 py-4 flex-row justify-between items-center ${
                  markNotificationsEnabled ? "" : "opacity-50"
                }`}
              >
                <View className="flex-1 pr-3">
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Notify When No Change In Mark
                  </Text>
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm mt-1`}
                  >
                    Alert me after a background check finds no updates. Requires
                    mark change notifications ON.
                  </Text>
                </View>
                <AppToggle
                  value={notifyWhenNoChanges}
                  disabled={!markNotificationsEnabled}
                  onValueChange={(v) => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    toggleNoChangeAlerts(v);
                  }}
                />
              </View>
            </LiquidGlassView>
          </View>

          <View className="mt-6">
            <Text className="text-2xl font-bold text-baccent mb-4">
              Interface
            </Text>
            <LiquidGlassView
              className=" rounded-2xl overflow-hidden"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View
                className={`px-4 py-4 flex-row justify-between items-center ${
                  isAndroid ? "opacity-50" : ""
                }`}
              >
                <View className="flex-1 pr-3">
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Use Liquid Glass (experimental)
                  </Text>
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm mt-1`}
                  >
                    {isAndroid
                      ? "Downgrade to an iOS device to enable liquid glass. Trust me, you're not missing much."
                      : showLiquidGlassAppearanceWarning
                        ? "Enable some liquid glass features in iOS and iPadOS. Report bugs in the support tab. If your device stays in Light Mode while the app is in Dark Mode, things might look weird. Turn on Dark Mode on your device to fix it."
                        : "Enable some liquid glass features in iOS and iPadOS. Report bugs in the support tab."}
                  </Text>
                </View>
                <AppToggle
                  value={liquidGlassEnabled}
                  disabled={isAndroid}
                  onValueChange={toggleLiquidGlass}
                />
              </View>
            </LiquidGlassView>
          </View>

          <View className="mt-6">
            <Text className="text-2xl font-bold text-baccent mb-4">
              Custom Server
            </Text>
            <LiquidGlassView
              className=" rounded-2xl overflow-hidden"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View className="px-4 pt-5 pb-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold`}
                >
                  Modify TA RPC client
                </Text>
                <AppTextInput
                  value={serverValue}
                  onChangeText={setServerValue}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="https://google.stanford.edu"
                  placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
                  className={`mt-3 rounded-xl px-4 py-4 ${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"}`}
                />
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm mt-3`}
                >
                  Default is {DEFAULT_TEACHASSIST_SERVER_ORIGIN}.{"\n"}Currently
                  using {savedServer}.{"\n"}
                  Format as URL.
                </Text>
              </View>

              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4 mb-1`}
              />

              <View className="px-4 py-4">
                <View className="flex-row gap-3">
                  <LiquidGlassButton
                    containerStyle={{ flex: 1 }}
                    contentStyle={{
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    glassTintColor={activeTone.accent}
                    fallbackBackgroundColor={activeTone.accent}
                    onPress={async () => {
                      try {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
                        await saveServer(serverValue);
                      } catch (error) {
                        Alert.alert(
                          "Invalid Server",
                          error instanceof Error
                            ? error.message
                            : "Enter a valid server host.",
                        );
                      }
                    }}
                  >
                    <Text
                      className={`text-center ${isDark ? "text-appblack" : "text-appwhite"} font-semibold`}
                    >
                      Save
                    </Text>
                  </LiquidGlassButton>
                  <LiquidGlassButton
                    containerStyle={{ flex: 1 }}
                    contentStyle={{
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    glassTintColor={activeTone.bg4}
                    fallbackBackgroundColor={activeTone.bg4}
                    onPress={async () => {
                      hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                      await saveServer(null);
                    }}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        isDark ? "text-appwhite" : "text-appblack"
                      }`}
                    >
                      Reset Default
                    </Text>
                  </LiquidGlassButton>
                </View>
              </View>
            </LiquidGlassView>
          </View>
          <View className="mt-6">
            <LiquidGlassView
              className=" rounded-2xl overflow-hidden"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View className="px-4 pt-2">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold mt-2`}
                >
                  Enable experiments
                </Text>
                <AppTextInput
                  value={aprilFoolsCode}
                  onChangeText={setAprilFoolsCode}
                  onSubmitEditing={submitAprilFoolsCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  placeholder="Enter a secret code"
                  placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
                  className={`mt-3 rounded-xl px-4 py-4 ${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"}`}
                />
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm ${afoolOverrideEnabled ? "pb-4 pt-2" : ""}`}
                >
                  {afoolOverrideEnabled ? "enabled, have fun" : ""}
                </Text>
              </View>
            </LiquidGlassView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default PersonalizationAdvancedScreen;
