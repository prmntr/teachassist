import AsyncStorage from "@react-native-async-storage/async-storage";

export type VersionUpdateMode = "none" | "optional" | "required";

export const VERSION_CHECK_URL =
  "https://prmntr.com/teachassist/version";

const MODE_KEY = "version_check_mode";
const LATEST_KEY = "version_check_latest";
const MINIMUM_KEY = "version_check_minimum";
const DISMISSED_FOR_KEY = "version_check_dismissed_for";
const CHECKED_AT_KEY = "version_check_checked_at";

const normalizeVersion = (version: string) =>
  version.trim().replace(/^v/i, "");

const parseVersionParts = (version: string) =>
  normalizeVersion(version)
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isNaN(part) ? 0 : part));

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

export const parseVersionCheckHtml = (html: string) => {
  const paragraphMatches = [
    ...html.matchAll(/<p>\s*v?(\d+(?:\.\d+){1,3})\s*<\/p>/gi),
  ];
  const sourceMatches =
    paragraphMatches.length >= 2
      ? paragraphMatches
      : [...html.matchAll(/v(\d+(?:\.\d+){1,3})/gi)];

  if (sourceMatches.length < 2) return null;
  return {
    latest: sourceMatches[0][1],
    minimum: sourceMatches[1][1],
  };
};

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

export const runVersionCheck = async (currentVersion: string) => {
  try {
    const response = await fetch(VERSION_CHECK_URL);
    const html = await response.text();
    const parsed = parseVersionCheckHtml(html);
    if (!parsed) return "none";

    const mode = evaluateUpdateMode(
      currentVersion,
      parsed.latest,
      parsed.minimum,
    );

    await AsyncStorage.multiSet([
      [MODE_KEY, mode],
      [LATEST_KEY, parsed.latest],
      [MINIMUM_KEY, parsed.minimum],
      [CHECKED_AT_KEY, new Date().toISOString()],
    ]);

    if (mode === "none") {
      await AsyncStorage.removeItem(DISMISSED_FOR_KEY);
    }

    return mode;
  } catch {
    return "none";
  }
};

export const loadVersionCheckState = async () => {
  const [mode, latest, minimum, dismissedFor] =
    await AsyncStorage.multiGet([
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
  latest: string | null,
  dismissedFor: string | null,
) => {
  if (mode === "required") return true;
  if (mode === "optional") {
    return !latest || dismissedFor !== latest;
  }
  return false;
};
