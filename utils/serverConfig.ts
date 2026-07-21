import AsyncStorage from "@react-native-async-storage/async-storage";

export const DEFAULT_TEACHASSIST_SERVER_ORIGIN = "https://ta.yrdsb.ca";
export const CUSTOM_TEACHASSIST_SERVER_STORAGE_KEY = "custom_teachassist_server";

let cachedTeachAssistServerOrigin = DEFAULT_TEACHASSIST_SERVER_ORIGIN;
let hasLoadedTeachAssistServerOrigin = false;

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const normalizeTeachAssistServerOrigin = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_TEACHASSIST_SERVER_ORIGIN;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (!parsed.hostname) {
    throw new Error("Enter a valid host name.");
  }

  return stripTrailingSlash(parsed.origin);
};

export const getCachedTeachAssistServerOrigin = () => cachedTeachAssistServerOrigin;

const buildUrlFromOrigin = (origin: string, basePath: string, path: string) => {
  return new URL(path.replace(/^\//, ""), `${origin}${basePath}`).toString();
};

export const getTeachAssistServerOrigin = async () => {
  if (hasLoadedTeachAssistServerOrigin) {
    return cachedTeachAssistServerOrigin;
  }

  const storedOrigin = await AsyncStorage.getItem(CUSTOM_TEACHASSIST_SERVER_STORAGE_KEY);
  cachedTeachAssistServerOrigin = storedOrigin || DEFAULT_TEACHASSIST_SERVER_ORIGIN;
  hasLoadedTeachAssistServerOrigin = true;
  return cachedTeachAssistServerOrigin;
};

export const setTeachAssistServerOrigin = async (value: string | null) => {
  if (!value || normalizeTeachAssistServerOrigin(value) === DEFAULT_TEACHASSIST_SERVER_ORIGIN) {
    cachedTeachAssistServerOrigin = DEFAULT_TEACHASSIST_SERVER_ORIGIN;
    hasLoadedTeachAssistServerOrigin = true;
    await AsyncStorage.removeItem(CUSTOM_TEACHASSIST_SERVER_STORAGE_KEY);
    return cachedTeachAssistServerOrigin;
  }

  const normalizedOrigin = normalizeTeachAssistServerOrigin(value);
  cachedTeachAssistServerOrigin = normalizedOrigin;
  hasLoadedTeachAssistServerOrigin = true;
  await AsyncStorage.setItem(CUSTOM_TEACHASSIST_SERVER_STORAGE_KEY, normalizedOrigin);
  return normalizedOrigin;
};

export const buildTeachAssistUrl = async (path: string) => {
  const origin = await getTeachAssistServerOrigin();
  return buildUrlFromOrigin(origin, "/", path);
};

export const buildTeachAssistLiveUrl = async (path: string) => {
  const origin = await getTeachAssistServerOrigin();
  return buildUrlFromOrigin(origin, "/live/", path);
};

export const buildTeachAssistStudentsUrl = async (path: string) => {
  const origin = await getTeachAssistServerOrigin();
  return buildUrlFromOrigin(origin, "/live/students/", path);
};

export const buildTeachAssistLiveUrlSync = (path: string) => {
  return buildUrlFromOrigin(cachedTeachAssistServerOrigin, "/live/", path);
};

export const buildTeachAssistStudentsUrlSync = (path: string) => {
  return buildUrlFromOrigin(cachedTeachAssistServerOrigin, "/live/students/", path);
};
