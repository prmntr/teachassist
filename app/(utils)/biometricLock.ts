import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

const BIOMETRIC_LOCK_KEY = "biometric_lock_enabled";
const BIOMETRIC_LOCK_EVENT = "biometricLockChanged";

export const getBiometricLockEnabled = async () => {
  const stored = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
  return stored === "true";
};

export const setBiometricLockEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, String(enabled));
  DeviceEventEmitter.emit(BIOMETRIC_LOCK_EVENT, enabled);
};

export const subscribeBiometricLock = (listener: (enabled: boolean) => void) => {
  const subscription = DeviceEventEmitter.addListener(
    BIOMETRIC_LOCK_EVENT,
    listener,
  );
  return () => subscription.remove();
};
