import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import {
  getBiometricLockEnabled,
  setBiometricLockEnabled as persistBiometricLockEnabled,
  subscribeBiometricLock,
} from "@/utils/biometricLock";
import { hapticsImpact } from "@/utils/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import AppToggle from "@/components/ui/AppToggle";
import BackButton from "@/components/ui/Back";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";

const PrivacyScreen = () => {
  const router = useRouter();
  const { activeTone, isDark } = useTheme();
  const [hideUnavailableMarks, setHideUnavailableMarks] = useState(false);
  const [tapToRevealMarks, setTapToRevealMarks] = useState(false);
  const [biometricLockEnabled, setBiometricLockEnabledState] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const storedHideUnavailable = await AsyncStorage.getItem(
        "hide_unavailable_marks",
      );
      const storedTapToReveal = await AsyncStorage.getItem(
        "tap_to_reveal_marks",
      );
      const storedBiometricLock = await getBiometricLockEnabled();

      setHideUnavailableMarks(storedHideUnavailable === "true");
      setTapToRevealMarks(storedTapToReveal === "true");
      setBiometricLockEnabledState(storedBiometricLock);
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBiometricLock((enabled) => {
      setBiometricLockEnabledState(enabled);
    });
    return unsubscribe;
  }, []);

  const toggleBiometricLock = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        AppAlert.alert(
          "Biometrics Unavailable",
          "Set up Face ID, Touch ID, or a fingerprint in your device settings to enable app lock.",
          { icon: AlertIcon.lock },
        );
        return;
      }
    }

    setBiometricLockEnabledState(value);
    await persistBiometricLockEnabled(value);
  };

  const toggleTapToRevealMarks = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setTapToRevealMarks(value);
    await AsyncStorage.setItem("tap_to_reveal_marks", String(value));
  };

  const toggleHideUnavailableMarks = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setHideUnavailableMarks(value);
    await AsyncStorage.setItem("hide_unavailable_marks", String(value));
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
          Privacy
        </Text>
        <Text
          className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          Control grade visibility, exports, and app locking.
        </Text>

        <View className="mt-6">
          <LiquidGlassView
            className=" rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <TouchableOpacity
              className="px-4 py-4"
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                router.push("/GradeExport");
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Export Grades
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    Prepare a simple or detailed export of your grades.
                  </Text>
                </View>
                <Image
                  source={require("../../assets/images/arrow-icon.png")}
                  className="w-6 h-6 mr-2"
                  style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
                />
              </View>
            </TouchableOpacity>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Lock App with Biometrics
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Require Face ID, Touch ID, or a passcode to unlock the app.
                </Text>
              </View>
              <AppToggle
                value={biometricLockEnabled}
                onValueChange={toggleBiometricLock}
              />
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Tap to Reveal Marks
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Hide averages and changes until you tap them.
                </Text>
              </View>
              <AppToggle
                value={tapToRevealMarks}
                onValueChange={toggleTapToRevealMarks}
              />
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Hide Unavailable Marks
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Hide courses without a visible grade.
                </Text>
              </View>
              <AppToggle
                value={hideUnavailableMarks}
                onValueChange={toggleHideUnavailableMarks}
              />
            </View>
          </LiquidGlassView>
        </View>
      </ScrollView>
    </View>
  );
};

export default PrivacyScreen;
