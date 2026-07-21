import AsyncStorage from "@react-native-async-storage/async-storage";

export type VersionUpdateMode = "none" | "optional" | "required";

export const VERSION_CHECK_URL = "https://prmntr.com/api/teachassist/version";

const MODE_KEY = "version_check_mode";
const LATEST_KEY = "version_check_latest";
const MINIMUM_KEY = "version_check_minimum";
const DISMISSED_FOR_KEY = "version_check_dismissed_for";
const CHECKED_AT_KEY = "version_check_checked_at";

const normalizeVersion = (version: string) => version.trim().replace(/^v/i, "");

const parseVersionParts = (version: string) =>
  normalizeVersion(version)
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isNaN(part) ? 0 : part));

const isVersionUpdateMode = (
  value: string | null,
): value is VersionUpdateMode =>
  value === "none" || value === "optional" || value === "required";

const getStoredModeFallback = async (): Promise<VersionUpdateMode> => {
  try {
    const mode = await AsyncStorage.getItem(MODE_KEY);
    return isVersionUpdateMode(mode) ? mode : "none";
  } catch (error) {
    console.warn("[versionCheck] Failed to load cached mode fallback.", error);
    return "none";
  }
};

export const compareVersions = (a: string, b: string) => {
  const partsA = parseVersionParts(a);
  const partsB = parseVersionParts(b);
  const length = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

// Parse the new JSON version endpoint
export const parseVersionCheckJson = (json: any) => {
  if (!json || !Array.isArray(json.versions) || json.versions.length < 2)
    return null;
  return {
    latest: normalizeVersion(json.versions[0]),
    minimum: normalizeVersion(json.versions[1]),
  };
};

export const runVersionCheck = async (currentVersion: string) => {
  const fallbackMode = await getStoredModeFallback();

  let json: any = null;
  try {
    const response = await fetch(VERSION_CHECK_URL, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });
    if (!response.ok) {
      console.warn(
        `[versionCheck] Request failed (${response.status}). Using cached fallback mode.`,
      );
      return fallbackMode;
    }
    json = await response.json();
  } catch (error) {
    console.warn(
      "[versionCheck] Could not reach version endpoint. Using cached fallback mode.",
      error,
    );
    return fallbackMode;
  }

  const parsed = parseVersionCheckJson(json);
  if (!parsed) {
    console.warn(
      `[versionCheck] Failed to parse version endpoint response. Using cached fallback mode.`,
    );
    return fallbackMode;
  }

  const mode = evaluateUpdateMode(
    currentVersion,
    parsed.latest,
    parsed.minimum,
  );

  try {
    await AsyncStorage.multiSet([
      [MODE_KEY, mode],
      [LATEST_KEY, parsed.latest],
      [MINIMUM_KEY, parsed.minimum],
      [CHECKED_AT_KEY, new Date().toISOString()],
    ]);
    if (mode === "none") {
      await AsyncStorage.removeItem(DISMISSED_FOR_KEY);
    }
  } catch (error) {
    console.warn(
      "[versionCheck] Failed to persist version-check state.",
      error,
    );
  }

  return mode;
};

export const loadVersionCheckState = async () => {
  const [mode, latest, minimum, dismissedFor] = await AsyncStorage.multiGet([
    MODE_KEY,
    LATEST_KEY,
    MINIMUM_KEY,
    DISMISSED_FOR_KEY,
  ]);

  return {
    mode: (mode?.[1] ?? "none") as VersionUpdateMode,
    latest: latest?.[1] ?? null,
    minimum: minimum?.[1] ?? null,
    dismissedFor: dismissedFor?.[1] ?? null,
  };
};

export const markVersionPromptDismissed = async (latest: string | null) => {
  if (!latest) return;
  await AsyncStorage.setItem(DISMISSED_FOR_KEY, latest);
};

export const shouldShowUpdatePrompt = (
  mode: VersionUpdateMode,
  _latest: string | null,
  _dismissedFor: string | null,
) => {
  void _latest;
  void _dismissedFor;
  if (mode === "required") return true;
  if (mode === "optional") return true;
  return false;
};

// Add evaluateUpdateMode implementation
export const evaluateUpdateMode = (
  currentVersion: string,
  latestVersion: string,
  minimumVersion: string,
): VersionUpdateMode => {
  if (compareVersions(currentVersion, minimumVersion) < 0) {
    return "required";
  }
  if (compareVersions(currentVersion, latestVersion) < 0) {
    return "optional";
  }
  return "none";
};
