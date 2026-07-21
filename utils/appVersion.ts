import Constants from "expo-constants";

// unified version for app

const fallbackVersion = "1.5.3";
const rawVersion =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? fallbackVersion;
const normalizedVersion = rawVersion.startsWith("v")
  ? rawVersion.slice(1)
  : rawVersion;

export const appVersionNumber = normalizedVersion;
export const appVersionLabel = `v${normalizedVersion}`;
