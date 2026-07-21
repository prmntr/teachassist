import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, View } from "react-native";
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import Text from "./AppText";
import LiquidGlassButton from "./LiquidGlassButton";
import {
  getBiometricLockEnabled,
  setBiometricLockEnabled as persistBiometricLockEnabled,
  subscribeBiometricLock,
} from "@/utils/biometricLock";
import { hapticsImpact } from "@/utils/haptics";
import { useTheme } from "@/contexts/ThemeContext";

export function BiometricLockOverlay() {
  const { activeTone, isDark } = useTheme();
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
          AppAlert.alert(
            "Biometrics Unavailable",
            "Set up Face ID, Touch ID, or a fingerprint to use app lock.",
            { icon: AlertIcon.lock },
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

    const loadSettings = async () => {
      const lockEnabled = await getBiometricLockEnabled();
      if (!isMounted) return;
      setBiometricLockEnabledState(lockEnabled);
      if (lockEnabled) {
        attemptUnlock(true);
      } else {
        setIsUnlocked(true);
      }
    };

    loadSettings();

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

      if (nextState === "background" && biometricLockEnabled) {
        setIsUnlocked(false);
      }
    });

    return () => subscription.remove();
  }, [attemptUnlock, biometricLockEnabled]);

  if (!biometricLockEnabled || isUnlocked) {
    return null;
  }

  return (
    <View
      className={`absolute inset-0 items-center justify-center px-6 ${isDark ? "bg-dark1" : "bg-light1"}`}
    >
      <View
        className={`w-full rounded-2xl p-6 max-w-md ${isDark ? "bg-dark3" : "bg-light3"}`}
      >
        <View className="bg-baccent mr-3 p-4 rounded-full flex items-center justify-center self-center">
          <Image
            style={{
              tintColor: activeTone.bg4,
              width: 50,
              height: 50,
            }}
            source={require("../../assets/images/privacy.png")}
          />
        </View>
        <Text
          className={`text-xl font-bold mb-2 mt-6 text-center ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          TeachAssist has been locked.
        </Text>
        <Text
          className={`text-sm mb-4 ${isDark ? "text-appwhite" : "text-appblack"}/60`}
        >
          To protect your privacy, the TeachAssist app has been locked behind
          biometrics. You can disable this option in settings.
        </Text>
        <LiquidGlassButton
          contentStyle={{
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
          glassTintColor={isUnlocking ? activeTone.bg4 : activeTone.accent}
          fallbackBackgroundColor={
            isUnlocking ? activeTone.bg4 : activeTone.accent
          }
          onPress={() => {
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            attemptUnlock(true);
          }}
          disabled={isUnlocking}
        >
          <Text
            className={`text-center font-semibold ${isDark ? "text-appblack" : "text-appwhite"}`}
          >
            {isUnlocking ? "Unlocking..." : "Unlock"}
          </Text>
        </LiquidGlassButton>
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
            }
          />
          <Text
            className={`text-center text-xs ${isDark ? "text-appwhite" : "text-appblack"}`}
          >
            Backed by Military-grade hardware encryption
          </Text>
        </View>
      </View>
    </View>
  );
}
