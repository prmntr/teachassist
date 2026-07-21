import * as SecureStore from "expo-secure-store";
import {
  isSupportedCourseReportHtml,
  parseGradeData,
  type ParsedCourseData,
} from "@/utils/GradeParser";

const getCourseReportCacheKey = (subjectId: string | number) =>
  `course_${subjectId}`;

// In-memory copy of parsed reports so opening a course view doesn't wait on a
// keychain read for data the refresh prefetch already parsed this session.
const memoryCache = new Map<string, ParsedCourseData>();

export const clearCourseReportMemoryCache = () => {
  memoryCache.clear();
};

const isParsedCourseData = (value: unknown): value is ParsedCourseData => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ParsedCourseData>;
  return (
    Array.isArray(candidate.assignments) &&
    Boolean(candidate.summary) &&
    typeof candidate.courseName === "string" &&
    typeof candidate.success === "boolean"
  );
};

export const saveParsedCourseReport = async (
  subjectId: string | number,
  parsedReport: ParsedCourseData,
) => {
  memoryCache.set(getCourseReportCacheKey(subjectId), parsedReport);
  await SecureStore.setItemAsync(
    getCourseReportCacheKey(subjectId),
    JSON.stringify(parsedReport),
  );
};

export const deleteParsedCourseReport = async (subjectId: string | number) => {
  memoryCache.delete(getCourseReportCacheKey(subjectId));
  await SecureStore.deleteItemAsync(getCourseReportCacheKey(subjectId));
};

export const loadParsedCourseReport = async (
  subjectId: string | number,
): Promise<ParsedCourseData | null> => {
  const cached = memoryCache.get(getCourseReportCacheKey(subjectId));
  if (cached) return cached;

  const storedValue = await SecureStore.getItemAsync(
    getCourseReportCacheKey(subjectId),
  );
  if (!storedValue) return null;

  try {
    const parsed = JSON.parse(storedValue) as unknown;
    if (isParsedCourseData(parsed)) {
      memoryCache.set(getCourseReportCacheKey(subjectId), parsed);
      return parsed;
    }
  } catch {
    // Ignore and try legacy HTML fallback below.
  }

  if (!isSupportedCourseReportHtml(storedValue)) {
    await deleteParsedCourseReport(subjectId);
    return null;
  }

  const migratedReport = parseGradeData(storedValue);
  await saveParsedCourseReport(subjectId, migratedReport);
  return migratedReport;
};
