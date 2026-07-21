import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import { hapticsImpact } from "@/utils/haptics";
import AppToggle from "@/components/ui/AppToggle";
import {
  clearGuidanceReminders,
  ensureNotificationPermissions,
  loadNotificationSettings,
  saveNotificationSetting,
  scheduleGuidanceReminders,
  syncBackgroundTasks,
} from "@/utils/notifications";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";

const NotificationsScreen = () => {
  const router = useRouter();
  const { activeTone, isDark } = useTheme();
  const [guidanceNotificationsEnabled, setGuidanceNotificationsEnabled] =
    useState(false);
  const [markNotificationsEnabled, setMarkNotificationsEnabled] =
    useState(false);
  const [hideMarksInNotifications, setHideMarksInNotifications] =
    useState(false);
  const [notifyWhenMarksHidden, setNotifyWhenMarksHidden] = useState(false);
  const [showTestingInfo, setShowTestingInfo] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await loadNotificationSettings();
      setGuidanceNotificationsEnabled(settings.guidanceRemindersEnabled);
      setMarkNotificationsEnabled(settings.markChangeEnabled);
      setHideMarksInNotifications(settings.hideMarksInNotifications);
      setNotifyWhenMarksHidden(settings.notifyWhenMarksHidden);
    };

    loadSettings();
  }, []);

  const toggleGuidanceNotifications = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    const granted = await ensureNotificationPermissions();
    if (!granted) {
      AppAlert.alert(
        "Notifications Disabled",
        "Enable notifications in system settings to receive guidance reminders.",
        { icon: AlertIcon.notification },
      );
      return;
    }

    await saveNotificationSetting("guidanceRemindersEnabled", value);
    setGuidanceNotificationsEnabled(value);

    if (value) {
      await scheduleGuidanceReminders();
    } else {
      await clearGuidanceReminders();
    }
  };

  const toggleMarkNotifications = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    const granted = await ensureNotificationPermissions();
    if (!granted) {
      AppAlert.alert(
        "Notifications Disabled",
        "Enable notifications in system settings to receive mark alerts.",
        { icon: AlertIcon.notification },
      );
      return;
    }

    await saveNotificationSetting("markChangeEnabled", value);
    setMarkNotificationsEnabled(value);
    await syncBackgroundTasks();
  };

  const toggleHideMarks = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await saveNotificationSetting("hideMarksInNotifications", value);
    setHideMarksInNotifications(value);
  };

  const toggleHiddenMarkAlerts = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await saveNotificationSetting("notifyWhenMarksHidden", value);
    setNotifyWhenMarksHidden(value);
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
          Notifications
        </Text>
        <Text
          className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          Manage reminders, mark alerts, and what appears in notifications.
        </Text>

        <View className="mt-6">
          <LiquidGlassView
            className="rounded-2xl overflow-hidden "
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Guidance Appointment Reminders
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Get a heads-up before your booked time.
                </Text>
              </View>
              <AppToggle
                value={guidanceNotificationsEnabled}
                onValueChange={(v) => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  toggleGuidanceNotifications(v);
                }}
              />
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center">
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Mark Change Alerts
                  </Text>
                  <TouchableOpacity
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    onPress={() => {
                      hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                      setShowTestingInfo(true);
                    }}
                    className="ml-2"
                  >
                    <View className="bg-info p-1 rounded-full">
                      <Image
                        className="w-4 h-4"
                        tintColor="#fbfbfb"
                        source={require("../../assets/images/question-sign.png")}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Get notified when new marks are posted.
                </Text>
              </View>
              <AppToggle
                value={markNotificationsEnabled}
                onValueChange={(v) => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  toggleMarkNotifications(v);
                }}
              />
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View
              className={`px-4 py-4 flex-row justify-between items-center ${
                markNotificationsEnabled ? "" : "opacity-50"
              }`}
            >
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Hide Marks in Notifications
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Keep your grades private on your lock screen.
                </Text>
              </View>
              <AppToggle
                value={hideMarksInNotifications}
                disabled={!markNotificationsEnabled}
                onValueChange={(v) => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  toggleHideMarks(v);
                }}
              />
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View
              className={`px-4 py-4 flex-row justify-between items-center ${
                markNotificationsEnabled ? "" : "opacity-50"
              }`}
            >
              <View className="flex-1 pr-3">
                <View className="flex-row items-center">
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Alert When Marks Are Hidden
                  </Text>
                  <TouchableOpacity
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    onPress={() => {
                      hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                      setShowTestingInfo(true);
                    }}
                    className="ml-2"
                  >
                    <View className="bg-info p-1 rounded-full">
                      <Image
                        className="w-4 h-4"
                        tintColor="#fbfbfb"
                        source={require("../../assets/images/question-sign.png")}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Be notified when a teacher hides your marks.
                </Text>
              </View>
              <AppToggle
                value={notifyWhenMarksHidden}
                disabled={!markNotificationsEnabled}
                onValueChange={(v) => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  toggleHiddenMarkAlerts(v);
                }}
              />
            </View>
          </LiquidGlassView>
          <LiquidGlassView
            className="rounded-2xl overflow-hidden  mt-5"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Looking for something else?
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    router.push("/AdvancedView");
                  }}
                >
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mt-4`}
                  >
                    Enable Advanced Notifications
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LiquidGlassView>
        </View>
      </ScrollView>

      <Modal visible={showTestingInfo} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/60 px-5">
          <LiquidGlassView
            containerClassName="w-full max-w-md"
            className="rounded-2xl p-5"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="regular"
          >
            <View className="flex items-center mb-6">
              <Image
                source={require("../../assets/images/betta-fish.png")}
                className="w-30 h-30 object-contain"
              />
            </View>
            <View className="flex-row items-center mb-4">
              <View className="mr-2 flex items-center justify-center">
                <Text className="bg-info rounded-full px-3  font-semibold flex items-center justify-center text-appwhite">
                  Beta
                </Text>
              </View>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
              >
                Notification Information
              </Text>
            </View>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} mb-4`}
            >
              Notifications work by contacting the TeachAssist servers and
              checking for grade updates every 15-20 minutes. This feature is in testing.
              {"\n\n"}
              <Text className="font-semibold text-baccent">
                Note: Notifications may fail to run with an active VPN to a
                country outside of Canada, or with battery optimizations for
                TeachAssist turned on.
                {Platform.OS === "ios" || Platform.OS === "macos"
                  ? ""
                  : ""}
              </Text>
            </Text>
            <TouchableOpacity
              className={`mt-2 ${isDark ? "bg-baccent/80" : "bg-baccent"} rounded-xl p-3`}
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                setShowTestingInfo(false);
              }}
            >
              <Text
                className={`${isDark ? "text-appblack" : "text-appwhite"} font-medium text-center`}
              >
                Got it!
              </Text>
            </TouchableOpacity>
          </LiquidGlassView>
        </View>
      </Modal>
    </View>
  );
};

export default NotificationsScreen;
