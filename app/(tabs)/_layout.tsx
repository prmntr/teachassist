import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { Tabs } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getBiometricLockEnabled,
  setBiometricLockEnabled as persistBiometricLockEnabled,
  subscribeBiometricLock,
} from "../(utils)/biometricLock";
import { hapticsImpact } from "../(utils)/haptics";
import { useTheme } from "../contexts/ThemeContext";

type TabIconProps = {
  source: any;
  hollowSource: any;
  title: string;
  width: string;
  focused: boolean;
};

const TabIcon = ({ source, hollowSource, width, focused }: TabIconProps) => {
  const { isDark } = useTheme();
  if (focused) {
    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
    return (
      <View
        className={`flex-col items-center mt-7 min-w-[112px] scale-120 transition duration-200`}
      >
        <Image
          source={source}
          className={width}
          tintColor="#27b1fa"
          resizeMode="contain"
        />
      </View>
    );
  } else {
    return (
      <View
        className={`size-full justify-center items-center mt-7 min-w-[112px]`}
      >
        <Image
          source={hollowSource}
          className={width}
          tintColor={isDark ? "#5d5d5d" : "#2e2e33"}
          resizeMode="contain"
        />
      </View>
    );
  }
};

export default function TabLayout() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [biometricLockEnabled, setBiometricLockEnabledState] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const isUnlockingRef = useRef(false);

  const attemptUnlock = useCallback(
    async (enabledOverride?: boolean) => {
      const shouldUnlock =
        typeof enabledOverride === "boolean"
          ? enabledOverride
          : biometricLockEnabled;
      if (!shouldUnlock || isUnlockingRef.current) return;
      setIsUnlocked(false);
      setIsUnlocking(true);
      isUnlockingRef.current = true;
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock TeachAssist",
          cancelLabel: "Cancel",
          fallbackLabel: "Use Passcode",
        });

        if (result.success) {
          setIsUnlocked(true);
          return;
        }

        if (
          result.error === "not_available" ||
          result.error === "not_enrolled"
        ) {
          Alert.alert(
            "Biometrics Unavailable",
            "Set up Face ID, Touch ID, or a fingerprint to use app lock.",
          );
          await persistBiometricLockEnabled(false);
          setBiometricLockEnabledState(false);
          setIsUnlocked(true);
          return;
        }

        setIsUnlocked(false);
      } finally {
        setIsUnlocking(false);
        isUnlockingRef.current = false;
      }
    },
    [biometricLockEnabled],
  );

  useEffect(() => {
    let isMounted = true;

    const loadLockSetting = async () => {
      const enabled = await getBiometricLockEnabled();
      if (!isMounted) return;
      setBiometricLockEnabledState(enabled);
      if (enabled) {
        attemptUnlock(true);
      } else {
        setIsUnlocked(true);
      }
    };

    loadLockSetting();
    const unsubscribe = subscribeBiometricLock((enabled) => {
      setBiometricLockEnabledState(enabled);
      if (enabled) {
        attemptUnlock(true);
      } else {
        setIsUnlocked(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [attemptUnlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (isUnlockingRef.current) return;
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        previousState === "background" &&
        nextState === "active" &&
        biometricLockEnabled
      ) {
        attemptUnlock(true);
        return;
      }

      if (nextState === "background") {
        if (biometricLockEnabled) {
          setIsUnlocked(false);
        }
      }
    });

    return () => subscription.remove();
  }, [attemptUnlock, biometricLockEnabled]);
  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarItemStyle: {
            width: "100%",
            height: "100%",
            justifyContent: "center",
          },
          tabBarStyle: {
            backgroundColor: `${isDark ? "#111113" : "#fbfbfb"}`,
            overflow: "hidden",
            borderColor: `${isDark ? "#2a2a2a" : "#eeeeee"}`,
            borderTopWidth: 2,
            height: 64 + insets.bottom,
            paddingBottom: insets.bottom,
          },
        }}
      >
        <Tabs.Screen
          name="courses"
          options={{
            title: "Courses",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabIcon
                title="Courses"
                source={require("../../assets/images/CoursesIcon.png")}
                hollowSource={require("../../assets/images/CoursesIcon_Hollow.png")}
                width="w-10"
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="guidance"
          options={{
            title: "Guidance",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabIcon
                source={require("../../assets/images/GuidanceIcon.png")}
                hollowSource={require("../../assets/images/GuidanceIcon_Hollow.png")}
                title="Guidance"
                width="w-8"
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabIcon
                source={require("../../assets/images/ProfileIcon.png")}
                hollowSource={require("../../assets/images/ProfileIcon_Hollow.png")}
                title="Profile"
                width="w-9"
                focused={focused}
              />
            ),
          }}
        />
      </Tabs>
      {biometricLockEnabled && !isUnlocked && (
        <View
          className={`absolute inset-0 items-center justify-center px-6 ${
            isDark ? "bg-dark1" : "bg-light1"
          }`}
        >
          <View
            className={`w-full rounded-2xl p-6 shadow-md ${
              isDark ? "bg-dark3" : "bg-light3"
            }`}
          >
            <View
              className={`bg-baccent/80 mr-3 p-4 rounded-full flex items-center justify-center self-center`}
            >
              <Image
                style={{
                  tintColor: "#fafafa",
                  width: 50,
                  height: 50,
                }}
                source={require("../../assets/images/privacy.png")}
              />
            </View>
            <Text
              className={`text-xl font-bold mb-2 mt-6 text-center ${
                isDark ? "text-appwhite" : "text-appblack"
              }`}
            >
              TeachAssist has been locked.
            </Text>
            <Text
              className={`text-sm mb-4 ${
                isDark ? "text-appwhite" : "text-appblack"
              }/60`}
            >
              To protect your privacy, the TeachAssist app has been locked behind biometrics. 
              You can disable this option in settings.
            </Text>
            <TouchableOpacity
              className={`rounded-lg py-3 ${
                isUnlocking ? "bg-baccent/50" : "bg-baccent"
              }`}
              onPress={() => attemptUnlock(true)}
              disabled={isUnlocking}
            >
              <Text
                className={`text-center font-semibold ${
                  isDark ? "text-appwhite" : "text-appblack"
                }`}
              >
                {isUnlocking ? "Unlocking..." : "Unlock"}
              </Text>
            </TouchableOpacity>
          </View>
          <View className="absolute bottom-15">
            <View className="flex flex-col justify-center items-center">
              <Image
                resizeMode="contain"
                style={{
                  width: 160,
                  height: 30,
                }}
                source={
                  isDark
                    ? require("../../assets/images/teachassist-wordmark.png")
                    : require("../../assets/images/teachassist-wordmark-light.png")
                } // note: clicking a physical back button also triggers this, fix later
              />
              <Text
                className={`text-center text-xs ${
                  isDark ? "text-appwhite" : "text-appblack"
                }`}
              >
                Backed by Military-grade hardware encryption
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
