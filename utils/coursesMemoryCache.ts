import { type Course } from "@/utils/CourseParser";

// In-memory mirror of the `ta_courses` SecureStore entry. SecureStore reads go
// through the native keychain and are slow enough to visibly delay screens that
// only need data another screen already loaded. Disk stays the source of truth;
// every load/save of `ta_courses` should prime this cache and logout must clear it.

let cachedJson: string | null = null;
let cachedCourses: Course[] | null = null;

export const primeCoursesMemoryCache = (json: string | null) => {
  if (json === cachedJson) return;
  cachedJson = json;
  if (!json) {
    cachedCourses = null;
    return;
  }
  try {
    const parsed = JSON.parse(json);
    cachedCourses = Array.isArray(parsed) ? parsed : null;
  } catch {
    cachedCourses = null;
  }
};

export const getCoursesFromMemory = (): Course[] | null => cachedCourses;

export const clearCoursesMemoryCache = () => {
  cachedJson = null;
  cachedCourses = null;
};
