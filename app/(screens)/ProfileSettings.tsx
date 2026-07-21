import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { useAFoolVisualGrades } from "@/contexts/AFoolVisualGradesContext";
import { useTheme } from "@/contexts/ThemeContext";
import { setBiometricLockEnabled as persistBiometricLockEnabled } from "@/utils/biometricLock";
import { clearGradeHistory } from "@/utils/gradeHistory";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import {
  clearGuidanceReminders,
  syncBackgroundTasks,
} from "@/utils/notifications";
import {
  CUSTOM_THEME_IMAGE_STORAGE_KEY,
  THEME_SETTINGS_STORAGE_KEY,
} from "@/utils/themeSystem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import { SecureStorage } from "../(auth)/taauth";
import { appVersionLabel } from "@/utils/appVersion";
import { clearCourseReportMemoryCache } from "@/utils/courseReportCache";
import { clearCoursesMemoryCache } from "@/utils/coursesMemoryCache";

const primaryActionButtonStyle = {
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 12,
  alignItems: "center",
  justifyContent: "center",
} as const;

const ProfileSettingsScreen = () => {
  const router = useRouter();
  const { isDark, activeTone } = useTheme();
  const { isAFool, visualHundredsEnabled, setVisualHundredsEnabled } =
    useAFoolVisualGrades();

  const toggleAFoolVisualHundreds = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await setVisualHundredsEnabled(value);
  };

  const handleLogout = async () => {
    await SecureStorage.delete("ta_username");
    await SecureStorage.delete("ta_password");
    await SecureStorage.delete("ta_student_id");
    await SecureStorage.delete("ta_session_token");
    await SecureStorage.delete("ta_cookies");
    await SecureStorage.delete("ta_courses");
    clearCoursesMemoryCache();
    clearCourseReportMemoryCache();
    await SecureStorage.delete("school_name");
    await SecureStorage.delete("grade_previous_average");
    await SecureStorage.delete("grade_last_known_average");
    await SecureStorage.delete("grade_last_updated");
    await SecureStorage.delete("marks_last_retrieved");
    await SecureStorage.delete("ta_appointments");
    await SecureStorage.delete("profile_image");
    await SecureStorage.delete("profile_background");
    await SecureStorage.delete(CUSTOM_THEME_IMAGE_STORAGE_KEY);
    await SecureStorage.delete("student_id_virtual_image");
    await SecureStorage.delete("reason_mapping");
    await clearGradeHistory();
    await AsyncStorage.removeItem("theme");
    await AsyncStorage.removeItem(THEME_SETTINGS_STORAGE_KEY);
    await AsyncStorage.removeItem("notif_guidance_enabled");
    await AsyncStorage.removeItem("notif_marks_enabled");
    await AsyncStorage.removeItem("notif_hide_marks");
    await AsyncStorage.removeItem("notif_notify_hidden_marks");
    await AsyncStorage.removeItem("notif_notify_no_changes");
    await AsyncStorage.removeItem("messages_mode");
    await AsyncStorage.removeItem("hide_unavailable_marks");
    await AsyncStorage.removeItem("tap_to_reveal_marks");
    await persistBiometricLockEnabled(false);
    await AsyncStorage.removeItem("haptics_enabled");
    await AsyncStorage.removeItem("quick_actions");
    await clearGuidanceReminders();
    await syncBackgroundTasks();
    router.replace("/");
  };

  const promptLogout = () => {
    AppAlert.alert(
      "Are you sure?",
      "All saved information will be cleared after logging out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            hapticsNotification(Haptics.NotificationFeedbackType.Success);
            handleLogout();
            {
              /* 
              AppAlert.alert("You've been sucessfully signed out.", undefined, {
              icon: AlertIcon.success,
            });
              */
            }
          },
        },
      ],
      { icon: AlertIcon.question },
    );
  };

  const quoteContent = (
    <View>
      <Text
        className={`mt-0 mb-7 text-center text-sm ${isDark ? "text-appgraylight" : "text-appgraylight"}`}
      >
        {`Created @ `}
        <Text className="font-bold not-italic text-danger">BSS</Text>
        <Text className={`font-bold not-italic text-appwhite ${isDark ? "text-appwhite" : "text-baccent"} `}>LaMango</Text>
      </Text>
    </View>
  );
  const footerContent = (
    <View className={`mb-5 mt-5`}>
      <View className={`flex flex-row items-center justify-center gap-3`}>
        <LiquidGlassButton
          className="rounded-sm p-1"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
          contentStyle={{
            borderRadius: 12,
            paddingHorizontal: 5,
            paddingVertical: 5,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => {
            hapticsNotification(Haptics.NotificationFeedbackType.Success);
            Linking.openURL("https://prmntr.com/teachassist");
          }}
        >
          <Image
            source={
              isDark
                ? require("../../assets/images/teach-icon-transparent.png")
                : require("../../assets/images/teach-icon-transparent-light.png")
            }
            className={`my-1`}
            style={{ width: 50, height: 45 }}
          />
        </LiquidGlassButton>
        <View>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} font-bold text-lg`}
          >
            TeachAssist
          </Text>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mb-2`}
          >
            Version {appVersionLabel.substring(1)} (67)
          </Text>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => {
                hapticsNotification(Haptics.NotificationFeedbackType.Success);
                Linking.openURL("https://prmntr.com/teachassist");
              }}
            >
              <Image
                source={require("../../assets/images/link.png")}
                className={`w-6 h-6 my-1 mr-3`}
                style={{ tintColor: activeTone.accent }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                hapticsNotification(Haptics.NotificationFeedbackType.Success);
                Linking.openURL("https://www.instagram.com/teach.assist/");
              }}
            >
              <Image
                source={require("../../assets/images/instagram.png")}
                className={`w-6 h-6 my-1`}
                style={{ tintColor: activeTone.accent }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

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
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"} leading-[40px]`}
        >
          Settings
        </Text>
        <Text
          className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          Manage your preferences and account.
        </Text>

        {isAFool && (
          <View className="mt-5">
            {/* 
            <Text className={`text-2xl font-bold text-baccent mb-4`}>
              Important Settings
            </Text>
            */}
            <LiquidGlassView
              className="rounded-2xl overflow-hidden"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View
                className={`px-4 py-3 flex-row justify-between items-center`}
              >
                <View className={`flex-1 pr-3`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Perfect Marks
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    A bold new direction.{" "}
                    {visualHundredsEnabled ? (
                      <Text
                        className={`${isDark ? "text-appgraydark/60" : "text-appgraylight/60"} text-sm mt-1`}
                      >{`\ndon't worry, this is only visual... !!`}</Text>
                    ) : (
                      ""
                    )}
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${visualHundredsEnabled ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() =>
                    toggleAFoolVisualHundreds(!visualHundredsEnabled)
                  }
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white transition-all duration-200 ${visualHundredsEnabled ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
            </LiquidGlassView>
          </View>
        )}

        <View className="mt-6 mb-6">
          <LiquidGlassView
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            {[
              {
                title: "Notifications",
                subtitle: "Get notified on your academics.",
                icon: require("../../assets/images/bell.png"),
                action: () => router.push("/Notifications"),
              },
              {
                title: "Personalization",
                subtitle: "Customize teachassist with themes.",
                icon: require("../../assets/images/paintbrush.png"),
                action: () => router.push("/Personalization"),
              },
              {
                title: "Privacy",
                subtitle: "Control grade privacy and visibility.",
                icon: require("../../assets/images/lock.png"),
                action: () => router.push("/Privacy"),
              },
              {
                title: "Support",
                subtitle: "Get help with using teachassist.",
                icon: require("../../assets/images/support-icon.png"),
                action: () => router.push("/Support"),
              },
              {
                title: "Legal",
                subtitle: "Regulatory information and credits.",
                icon: require("../../assets/images/paper.png"),
                action: () => router.push("/Legal"),
              },
              {
                title: "Advanced",
                subtitle: "Modify power user settings.",
                icon: require("../../assets/images/wrench.png"),
                action: () => router.push("/AdvancedView"),
              },
            ].map((item, index) => (
              <View key={item.title}>
                <TouchableOpacity
                  className="px-5 py-4"
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    item.action();
                  }}
                >
                  <View className="flex-row items-center">
                    <View className="bg-baccent/80 mr-4 p-2 rounded-full">
                      <Image
                        className="w-6 h-6"
                        style={{ tintColor: "#fafafa" }}
                        source={item.icon}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                      >
                        {item.title}
                      </Text>
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {index < 5 ? (
                  <View
                    className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
                  />
                ) : null}
              </View>
            ))}
          </LiquidGlassView>
        </View>

        <LiquidGlassButton
          contentStyle={{
            ...primaryActionButtonStyle,
            marginBottom: 24,
          }}
          glassTintColor={activeTone.accent}
          fallbackBackgroundColor={activeTone.accent}
          onPress={() => {
            promptLogout();
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          }}
        >
          <View className={`flex-row justify-center items-center`}>
            <Text
              className={`${isDark ? "text-appblack" : "text-appwhite"} text-xl font-bold`}
            >
              Log Out
            </Text>
          </View>
        </LiquidGlassButton>
        <>
          {footerContent}
          {quoteContent}
        </>
      </ScrollView>
    </View>
  );
};

export default ProfileSettingsScreen;
