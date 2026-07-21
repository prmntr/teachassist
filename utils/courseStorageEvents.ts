type CourseStorageListener = () => void;

const listeners = new Set<CourseStorageListener>();

export const notifyCourseStorageUpdated = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn("courseStorageEvents: listener failed", error);
    }
  });
};

export const subscribeCourseStorageUpdates = (
  listener: CourseStorageListener,
) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
