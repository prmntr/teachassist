import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const HAPTICS_KEY = "haptics_enabled";

let cachedEnabled: boolean | null = null;

const loadEnabled = async () => {
  if (cachedEnabled !== null) return cachedEnabled;
  const stored = await AsyncStorage.getItem(HAPTICS_KEY);
  cachedEnabled = stored !== "false";
  return cachedEnabled;
};

export const setHapticsEnabled = async (enabled: boolean) => {
  cachedEnabled = enabled;
  await AsyncStorage.setItem(HAPTICS_KEY, String(enabled));
};

export const getHapticsEnabled = async () => {
  return await loadEnabled();
};

const withHaptics = async (work: () => Promise<void>) => {
  if (!(await loadEnabled())) return;
  await work();
};

export const hapticsSelection = async () => {
  await withHaptics(async () => {
    if (Platform.OS === "android") {
      await Haptics.performAndroidHapticsAsync(
        Haptics.AndroidHaptics.Keyboard_Tap,
      );
      return;
    }
    await Haptics.selectionAsync();
  });
};

export const hapticsImpact = async (style: Haptics.ImpactFeedbackStyle) => {
  await withHaptics(async () => {
    if (Platform.OS === "android") {
      const androidType =
        style === Haptics.ImpactFeedbackStyle.Soft
          ? Haptics.AndroidHaptics.Gesture_End
          : style === Haptics.ImpactFeedbackStyle.Light
            ? Haptics.AndroidHaptics.Keyboard_Tap
            : style === Haptics.ImpactFeedbackStyle.Medium
              ? Haptics.AndroidHaptics.Context_Click
              : Haptics.AndroidHaptics.Long_Press;
      await Haptics.performAndroidHapticsAsync(androidType);
      return;
    }
    await Haptics.impactAsync(style);
  });
};

export const hapticsNotification = async (
  type: Haptics.NotificationFeedbackType,
) => {
  await withHaptics(async () => {
    if (Platform.OS === "android") {
      const androidType =
        type === Haptics.NotificationFeedbackType.Success
          ? Haptics.AndroidHaptics.Confirm
          : type === Haptics.NotificationFeedbackType.Error
            ? Haptics.AndroidHaptics.Reject
            : Haptics.AndroidHaptics.Context_Click;
      await Haptics.performAndroidHapticsAsync(androidType);
      return;
    }
    await Haptics.notificationAsync(type);
  });
};
