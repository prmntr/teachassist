import AsyncStorage from "@react-native-async-storage/async-storage";
import { vars } from "nativewind";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
} from "react";
import { StatusBar, StyleSheet, useColorScheme, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SecureStorage } from "@/app/(auth)/taauth";
import {
  createCustomThemePreset,
  createThemeVars,
  CUSTOM_THEME_IMAGE_STORAGE_KEY,
  DEFAULT_THEME_SETTINGS,
  extractDominantColorFromImage,
  FONT_PRESETS,
  FontPresetDefinition,
  FontPresetId,
  getFontPresetById,
  getThemePresetDefinition,
  PAGE_BACKGROUND_ENABLED_STORAGE_KEY,
  StoredThemeSettings,
  THEME_SETTINGS_STORAGE_KEY,
  ThemeMode,
  ThemePresetDefinition,
  ThemePresetId,
  ThemeTone,
} from "@/utils/themeSystem";

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  themePresetId: ThemePresetId;
  themePreset: ThemePresetDefinition;
  setThemePreset: (presetId: ThemePresetId) => Promise<boolean>;
  fontPresetId: FontPresetId;
  fontPreset: FontPresetDefinition;
  setFontPreset: (fontPresetId: FontPresetId) => Promise<void>;
  hasCustomTheme: boolean;
  buildCustomThemeFromImage: (
    imageUri: string,
  ) => Promise<ThemePresetDefinition>;
  clearCustomTheme: () => Promise<void>;
  activeTone: ThemeTone;
  pageBackgroundImageUri: string | null;
  pageBackgroundEnabled: boolean;
  setPageBackgroundEnabled: (enabled: boolean) => Promise<void>;
  refreshPageBackgroundImage: (imageUri?: string | null) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const FONT_PRESET_IDS = new Set<FontPresetId>(
  FONT_PRESETS.map((preset) => preset.id),
);

const sanitizeStoredSettings = (
  settings: Partial<StoredThemeSettings>,
  fallbackMode: ThemeMode,
): StoredThemeSettings => {
  const storedFontPresetId = settings.fontPresetId as string | undefined;
  const mode =
    settings.mode === "light"
      ? "light"
      : settings.mode === "dark"
        ? "dark"
        : fallbackMode;
  const presetId =
    settings.presetId === "ocean" ||
    settings.presetId === "sunset" ||
    settings.presetId === "forest" ||
    settings.presetId === "lavender" ||
    settings.presetId === "rose" ||
    settings.presetId === "slate" ||
    settings.presetId === "amber" ||
    settings.presetId === "midnight" ||
    settings.presetId === "amoled" ||
    settings.presetId === "custom"
      ? settings.presetId
      : "default";
  const fontPresetId =
    storedFontPresetId &&
    FONT_PRESET_IDS.has(storedFontPresetId as FontPresetId)
      ? (storedFontPresetId as FontPresetId)
      : "system";
  const customPreset =
    settings.customPreset && settings.customPreset.id === "custom"
      ? settings.customPreset
      : null;

  return {
    mode,
    presetId: presetId === "custom" && !customPreset ? "default" : presetId,
    fontPresetId,
    customPreset,
  };
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemTheme = useColorScheme();
  const fallbackMode: ThemeMode = systemTheme === "light" ? "light" : "dark";
  const [theme, setTheme] = useState<ThemeMode>(fallbackMode);
  const [themePresetId, setThemePresetIdState] = useState<ThemePresetId>(
    DEFAULT_THEME_SETTINGS.presetId,
  );
  const [fontPresetId, setFontPresetIdState] = useState<FontPresetId>(
    DEFAULT_THEME_SETTINGS.fontPresetId,
  );
  const [customPreset, setCustomPreset] =
    useState<ThemePresetDefinition | null>(null);
  const [pageBackgroundEnabled, setPageBackgroundEnabledState] =
    useState(false);
  const [pageBackgroundImageUri, setPageBackgroundImageUri] = useState<
    string | null
  >(null);

  const themePreset = getThemePresetDefinition(themePresetId, customPreset);
  const fontPreset = getFontPresetById(fontPresetId);
  const hasCustomTheme = customPreset !== null;
  const activeTone = theme === "dark" ? themePreset.dark : themePreset.light;

  // Dissolves between light/dark mode only (not preset or custom-theme
  // switches, which stay an instant cut) — an overlay that starts painted
  // in the old background color and both fades out AND animates its own
  // color toward the new background, over whatever's already been
  // re-painted underneath (NativeWind's CSS vars update instantly with no
  // way to interpolate every dependent color, so without this the mode
  // toggle would just hard-cut). Animating the overlay's color too — not
  // just its opacity — is what makes this read as one continuous dissolve.
  const isFirstToneRenderRef = useRef(true);
  const previousModeRef = useRef(theme);
  const previousToneBgRef = useRef(activeTone.bg1);
  const [dissolveFromColor, setDissolveFromColor] = useState(activeTone.bg1);
  const [dissolveToColor, setDissolveToColor] = useState(activeTone.bg1);
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const dissolveProgress = useSharedValue(0);

  // useLayoutEffect (not useEffect) so the overlay is armed in the same
  // commit as the color-var change, before the new frame paints — with a
  // plain effect there's a one-frame gap where the screen already shows the
  // new theme with no overlay yet, then the overlay pops in on top of it.
  useLayoutEffect(() => {
    const modeChanged = previousModeRef.current !== theme;
    previousModeRef.current = theme;

    if (isFirstToneRenderRef.current || !modeChanged) {
      isFirstToneRenderRef.current = false;
      previousToneBgRef.current = activeTone.bg1;
      return;
    }

    setDissolveFromColor(previousToneBgRef.current);
    setDissolveToColor(activeTone.bg1);
    previousToneBgRef.current = activeTone.bg1;
    setIsThemeTransitioning(true);
    dissolveProgress.value = 0;
    dissolveProgress.value = withTiming(
      1,
      { duration: 450, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        "worklet";
        if (finished) {
          runOnJS(setIsThemeTransitioning)(false);
        }
      },
    );
  }, [theme, activeTone.bg1, dissolveProgress]);

  const dissolveStyle = useAnimatedStyle(() => ({
    opacity: 1 - dissolveProgress.value,
    backgroundColor: interpolateColor(
      dissolveProgress.value,
      [0, 1],
      [dissolveFromColor, dissolveToColor],
    ),
  }));

  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(
          THEME_SETTINGS_STORAGE_KEY,
        );
        const [savedPageBackgroundEnabled, savedPageBackgroundImage] =
          await Promise.all([
            AsyncStorage.getItem(PAGE_BACKGROUND_ENABLED_STORAGE_KEY),
            SecureStorage.load(CUSTOM_THEME_IMAGE_STORAGE_KEY),
          ]);

        setPageBackgroundEnabledState(savedPageBackgroundEnabled === "true");
        setPageBackgroundImageUri(savedPageBackgroundImage);

        if (storedSettings) {
          const parsed = JSON.parse(
            storedSettings,
          ) as Partial<StoredThemeSettings>;
          const normalized = sanitizeStoredSettings(parsed, fallbackMode);
          setTheme(normalized.mode);
          setThemePresetIdState(normalized.presetId);
          setFontPresetIdState(normalized.fontPresetId);
          setCustomPreset(normalized.customPreset);
          return;
        }

        const legacyTheme = await AsyncStorage.getItem("theme");
        if (legacyTheme === "light" || legacyTheme === "dark") {
          setTheme(legacyTheme);
        }
      } catch (error) {
        console.warn("theme: failed to load settings", error);
      }
    };

    loadThemeSettings();
  }, [fallbackMode]);

  useEffect(() => {
    StatusBar.setBarStyle(
      theme === "dark" ? "light-content" : "dark-content",
      true,
    );
  }, [theme]);

  const persistThemeSettings = async (settings: StoredThemeSettings) => {
    try {
      await AsyncStorage.setItem(
        THEME_SETTINGS_STORAGE_KEY,
        JSON.stringify(settings),
      );
      await AsyncStorage.setItem("theme", settings.mode);
    } catch (error) {
      console.warn("theme: failed to save settings", error);
    }
  };

  const buildStoredSettings = (
    nextMode: ThemeMode,
    nextPresetId: ThemePresetId,
    nextFontPresetId: FontPresetId,
    nextCustomPreset: ThemePresetDefinition | null,
  ): StoredThemeSettings => {
    return {
      mode: nextMode,
      presetId: nextPresetId,
      fontPresetId: nextFontPresetId,
      customPreset: nextCustomPreset,
    };
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setTheme(mode);
    await persistThemeSettings(
      buildStoredSettings(mode, themePresetId, fontPresetId, customPreset),
    );
  };

  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    await setThemeMode(nextTheme);
  };

  const setThemePreset = async (presetId: ThemePresetId) => {
    if (presetId === "custom" && !customPreset) {
      return false;
    }

    setThemePresetIdState(presetId);
    await persistThemeSettings(
      buildStoredSettings(theme, presetId, fontPresetId, customPreset),
    );
    return true;
  };

  const setFontPreset = async (nextFontPresetId: FontPresetId) => {
    setFontPresetIdState(nextFontPresetId);
    await persistThemeSettings(
      buildStoredSettings(theme, themePresetId, nextFontPresetId, customPreset),
    );
  };

  const buildCustomThemeFromImage = async (imageUri: string) => {
    const dominantColor = await extractDominantColorFromImage(imageUri);
    const nextCustomPreset = createCustomThemePreset(dominantColor, "Custom");

    setCustomPreset(nextCustomPreset);
    setThemePresetIdState("custom");
    await persistThemeSettings(
      buildStoredSettings(theme, "custom", fontPresetId, nextCustomPreset),
    );

    return nextCustomPreset;
  };

  const clearCustomTheme = async () => {
    const nextPresetId = themePresetId === "custom" ? "default" : themePresetId;

    setCustomPreset(null);
    setThemePresetIdState(nextPresetId);
    await persistThemeSettings(
      buildStoredSettings(theme, nextPresetId, fontPresetId, null),
    );
  };

  const setPageBackgroundEnabled = async (enabled: boolean) => {
    setPageBackgroundEnabledState(enabled);
    await AsyncStorage.setItem(
      PAGE_BACKGROUND_ENABLED_STORAGE_KEY,
      String(enabled),
    );
  };

  const refreshPageBackgroundImage = async (imageUri?: string | null) => {
    const nextImageUri =
      imageUri === undefined
        ? await SecureStorage.load(CUSTOM_THEME_IMAGE_STORAGE_KEY)
        : imageUri;
    setPageBackgroundImageUri(nextImageUri);

    if (!nextImageUri) {
      setPageBackgroundEnabledState(false);
      await AsyncStorage.setItem(PAGE_BACKGROUND_ENABLED_STORAGE_KEY, "false");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        isDark: theme === "dark",
        setThemeMode,
        themePresetId,
        themePreset,
        setThemePreset,
        fontPresetId,
        fontPreset,
        setFontPreset,
        hasCustomTheme,
        buildCustomThemeFromImage,
        clearCustomTheme,
        activeTone,
        pageBackgroundImageUri,
        pageBackgroundEnabled,
        setPageBackgroundEnabled,
        refreshPageBackgroundImage,
      }}
    >
      <View
        key={fontPresetId}
        style={[{ flex: 1 }, vars(createThemeVars(theme, themePreset))]}
      >
        {children}
        {isThemeTransitioning && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { zIndex: 9999 },
              dissolveStyle,
            ]}
          />
        )}
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
