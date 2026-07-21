import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const VISUAL_HUNDREDS_KEY = "aprilfool_visual_hundreds_enabled";
const AFOOL_OVERRIDE_KEY = "aprilfool_override_enabled";

type AFoolVisualGradesContextValue = {
  isAFool: boolean;
  afoolOverrideEnabled: boolean;
  visualHundredsEnabled: boolean;
  shouldForceVisualHundreds: boolean;
  setAFoolOverrideEnabled: (enabled: boolean) => Promise<void>;
  setVisualHundredsEnabled: (enabled: boolean) => Promise<void>;
};

const AFoolVisualGradesContext = createContext<
  AFoolVisualGradesContextValue | undefined
>(undefined);

const isAFoolDate = (date: Date) =>
  (date.getMonth() === 2 && date.getDate() === 31) ||
  (date.getMonth() === 3 && (date.getDate() === 1 || date.getDate() === 2)); // march 31 to april 2
export const AFoolVisualGradesProvider = ({ children }: PropsWithChildren) => {
  const [seasonalAFool, setSeasonalAFool] = useState(isAFoolDate(new Date()));
  const [afoolOverrideEnabled, setAFoolOverrideEnabledState] = useState(false);
  const [visualHundredsEnabled, setVisualHundredsEnabledState] =
    useState(false);
  const isAFool = seasonalAFool || afoolOverrideEnabled;

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      AsyncStorage.getItem(VISUAL_HUNDREDS_KEY),
      AsyncStorage.getItem(AFOOL_OVERRIDE_KEY),
    ])
      .then(([visualHundredsValue, overrideValue]) => {
        if (!isMounted) return;
        setVisualHundredsEnabledState(visualHundredsValue === "true");
        setAFoolOverrideEnabledState(overrideValue === "true");
      })
      .catch((error) => {
        console.warn(
          "[aprilfoolVisualGrades] Failed to load April Fools state.",
          error,
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeasonalAFool(isAFoolDate(new Date()));
    }, 60 * 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (isAFool || !visualHundredsEnabled) return;
    setVisualHundredsEnabledState(false);
    AsyncStorage.removeItem(VISUAL_HUNDREDS_KEY).catch((error) => {
      console.warn(
        "[aprilfoolVisualGrades] Failed to clear visual toggle state.",
        error,
      );
    });
  }, [isAFool, visualHundredsEnabled]);

  const setAFoolOverrideEnabled = useCallback(async (enabled: boolean) => {
    setAFoolOverrideEnabledState(enabled);
    try {
      if (enabled) {
        await AsyncStorage.setItem(AFOOL_OVERRIDE_KEY, "true");
      } else {
        await AsyncStorage.removeItem(AFOOL_OVERRIDE_KEY);
      }
    } catch (error) {
      console.warn(
        "[aprilfoolVisualGrades] Failed to persist April Fools override state.",
        error,
      );
    }
  }, []);

  const setVisualHundredsEnabled = useCallback(async (enabled: boolean) => {
    const nextValue = isAFool ? enabled : false;
    setVisualHundredsEnabledState(nextValue);
    try {
      if (nextValue) {
        await AsyncStorage.setItem(VISUAL_HUNDREDS_KEY, "true");
      } else {
        await AsyncStorage.removeItem(VISUAL_HUNDREDS_KEY);
      }
    } catch (error) {
      console.warn(
        "[aprilfoolVisualGrades] Failed to persist visual toggle state.",
        error,
      );
    }
  }, [isAFool]);

  const value = useMemo(
    () => ({
      isAFool,
      afoolOverrideEnabled,
      visualHundredsEnabled,
      shouldForceVisualHundreds: isAFool && visualHundredsEnabled,
      setAFoolOverrideEnabled,
      setVisualHundredsEnabled,
    }),
    [
      afoolOverrideEnabled,
      isAFool,
      setAFoolOverrideEnabled,
      setVisualHundredsEnabled,
      visualHundredsEnabled,
    ],
  );

  return (
    <AFoolVisualGradesContext.Provider value={value}>
      {children}
    </AFoolVisualGradesContext.Provider>
  );
};

export const useAFoolVisualGrades = () => {
  const context = useContext(AFoolVisualGradesContext);
  if (!context) {
    throw new Error(
      "useAFoolVisualGrades must be used within AFoolVisualGradesProvider.",
    );
  }
  return context;
};
