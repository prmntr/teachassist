import { AlertIcon, AppAlert } from "@/components/ui/AppAlert";
import Text from "@/components/ui/AppText";
import AppToggle from "@/components/ui/AppToggle";
import BackButton from "@/components/ui/Back";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getHapticsEnabled,
  hapticsImpact,
  hapticsNotification,
  setHapticsEnabled as saveHapticsEnabled,
} from "@/utils/haptics";
import { useLiquidGlassEnabled } from "@/utils/liquidGlass";
import {
  BUILT_IN_THEME_PRESETS,
  CUSTOM_THEME_IMAGE_STORAGE_KEY,
  FONT_PRESETS,
} from "@/utils/themeSystem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Text as RNText,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SecureStorage } from "../(auth)/taauth";

const PersonalizationScreen = () => {
  const {
    theme,
    isDark,
    activeTone,
    setThemeMode,
    themePreset,
    themePresetId,
    setThemePreset,
    fontPreset,
    fontPresetId,
    setFontPreset,
    hasCustomTheme,
    buildCustomThemeFromImage,
    clearCustomTheme,
    pageBackgroundEnabled,
    pageBackgroundImageUri,
    setPageBackgroundEnabled,
    refreshPageBackgroundImage,
  } = useTheme();
  const router = useRouter();

  const [isBuildingCustomTheme, setIsBuildingCustomTheme] = useState(false);
  const [messageMode, setMessageMode] = useState<
    "default" | "inspirational" | "off"
  >("default");
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [showCustomThemeModal, setShowCustomThemeModal] = useState(false);
  const systemColorScheme = useColorScheme();
  const liquidGlassEnabled = useLiquidGlassEnabled();
  const isCustomThemeSelected = themePresetId === "custom";
  const showLiquidGlassAppearanceWarning =
    systemColorScheme === "light" && liquidGlassEnabled && isDark;

  useEffect(() => {
    const loadPersonalizationState = async () => {
      const [, storedMessageMode, storedHaptics, storedRefreshButton] =
        await Promise.all([
          SecureStorage.load(CUSTOM_THEME_IMAGE_STORAGE_KEY),
          AsyncStorage.getItem("messages_mode"),
          getHapticsEnabled(),
          AsyncStorage.getItem("show_refresh_button"),
        ]);

      setHapticsEnabled(storedHaptics);
      setShowRefreshButton(storedRefreshButton === "true");
      if (
        storedMessageMode === "default" ||
        storedMessageMode === "inspirational" ||
        storedMessageMode === "off"
      ) {
        setMessageMode(storedMessageMode);
      }
    };

    loadPersonalizationState();
  }, []);

  const syncBackgroundImage = async (imageUri?: string | null) => {
    const nextImage =
      imageUri === undefined
        ? await SecureStorage.load(CUSTOM_THEME_IMAGE_STORAGE_KEY)
        : imageUri;
    await refreshPageBackgroundImage(nextImage);
  };

  const buildThemeFromPickedImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      await SecureStorage.save(CUSTOM_THEME_IMAGE_STORAGE_KEY, imageUri);
      await syncBackgroundImage(imageUri);
      hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
      await generateThemeFromImage(imageUri);
    }
  };

  const resetBackgroundImage = async () => {
    await SecureStorage.delete(CUSTOM_THEME_IMAGE_STORAGE_KEY);
    await syncBackgroundImage(null);
    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
  };

  const generateThemeFromImage = async (imageUri: string) => {
    setIsBuildingCustomTheme(true);

    try {
      await buildCustomThemeFromImage(imageUri);
      hapticsNotification(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn("theme generation failed", error);
      AppAlert.alert(
        "Theme Generation Failed",
        "Try a different image with stronger contrast and color.",
        { icon: AlertIcon.error },
      );
    } finally {
      setIsBuildingCustomTheme(false);
    }
  };

  const previewPalette = [
    themePreset.light.accent,
    themePreset.light.bg4,
    themePreset.dark.accent,
  ];

  const updateMessageMode = async (
    mode: "default" | "inspirational" | "off",
  ) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setMessageMode(mode);
    await AsyncStorage.setItem("messages_mode", mode);
  };

  const toggleHaptics = async (value: boolean) => {
    await saveHapticsEnabled(value);
    setHapticsEnabled(value);
    if (value) {
      await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleRefreshButton = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setShowRefreshButton(value);
    await AsyncStorage.setItem("show_refresh_button", value ? "true" : "false");
  };

  const openCustomThemeModal = async () => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    if (hasCustomTheme) {
      await setThemePreset("custom");
    }
    setShowCustomThemeModal(true);
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/profile" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
      >
        <Text
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          Personalization
        </Text>
        <Text
          className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          Customize your themes, appearance, and the overall feel of
          teachassist.
        </Text>

        <View className="mt-6">
          <Text className="text-2xl font-bold text-baccent mb-4">Theme</Text>
          <LiquidGlassView
            className=" rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className="px-4 py-4">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
              >
                Appearance
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
              >
                Choose between light and dark mode.
              </Text>
              <View className="flex-row mt-3">
                {[
                  {
                    key: "dark",
                    label: "Dark",
                    icon: require("../../assets/images/moon.png"),
                  },
                  {
                    key: "light",
                    label: "Light",
                    icon: require("../../assets/images/sun-fill.webp"),
                  },
                ].map((option) => {
                  const isSelected = theme === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      className={`flex-1 py-2 mx-1 rounded-full border ${
                        isSelected
                          ? "bg-baccent border-baccent"
                          : isDark
                            ? "border-dark4"
                            : "border-light4"
                      }`}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
                        setThemeMode(option.key as "light" | "dark");
                      }}
                    >
                      <View className="flex-row items-center justify-center">
                        <Image
                          source={option.icon}
                          className="mr-2"
                          style={{
                            width: 16,
                            height: 17,
                            tintColor: isSelected
                              ? isDark
                                ? "#2f3035"
                                : "#fafafa"
                              : isDark
                                ? "#edebea"
                                : "#2f3035",
                          }}
                        />
                        <Text
                          className={`text-center text-sm font-semibold ${
                            isSelected
                              ? isDark
                                ? "text-appblack"
                                : "text-appwhite"
                              : isDark
                                ? "text-appwhite"
                                : "text-appblack"
                          }`}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Theme Presets
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    {themePreset.name}: {themePreset.description}
                  </Text>
                </View>
                {isBuildingCustomTheme ? (
                  <ActivityIndicator color={activeTone.accent} />
                ) : (
                  <View className="flex-row items-center">
                    {previewPalette.map((color, index) => (
                      <View
                        key={`${color}-${index}`}
                        className="w-3 h-3 rounded-full ml-1"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </View>
                )}
              </View>
              <View className="flex-row flex-wrap mt-3 -mx-1">
                {BUILT_IN_THEME_PRESETS.map((preset) => {
                  const isSelected = themePresetId === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      className={`px-3 py-2 mx-1 mb-2 rounded-full border ${
                        isSelected
                          ? "bg-baccent border-baccent"
                          : isDark
                            ? "border-dark4"
                            : "border-light4"
                      }`}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                        setThemePreset(preset.id);
                      }}
                    >
                      <View className="flex-row items-center">
                        {[preset.light.accent, preset.dark.accent].map(
                          (color, idx) =>
                            isSelected &&
                            (isDark ? idx === 1 : idx === 0) ? null : (
                              <View
                                key={`${preset.id}-${color}-${idx}`}
                                className={`mr-1.5 h-2.5 rounded-full ${
                                  isSelected ? "w-6" : "w-2.5"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ),
                        )}
                        <Text
                          className={`text-sm font-semibold ${
                            isSelected
                              ? isDark
                                ? "text-appblack"
                                : "text-appwhite"
                              : isDark
                                ? "text-appwhite"
                                : "text-appblack"
                          }`}
                        >
                          {preset.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  className={`px-3 py-2 mx-1 mb-2 rounded-full border ${
                    themePresetId === "custom"
                      ? "bg-baccent border-baccent"
                      : isDark
                        ? "border-dark4"
                        : "border-light4"
                  }`}
                  onPress={openCustomThemeModal}
                >
                  <View className="items-center justify-center flex-row">
                    <Image
                      className={`w-5 h-4`}
                      style={{
                        tintColor: isCustomThemeSelected
                          ? activeTone.bg1
                          : activeTone.accent,
                      }}
                      source={require("../../assets/images/paintbrush.png")}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        themePresetId === "custom"
                          ? isDark
                            ? "text-appblack"
                            : "text-appwhite"
                          : isDark
                            ? "text-appwhite"
                            : "text-appblack"
                      }`}
                    >
                      {`  `}Custom
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </LiquidGlassView>
        </View>

        <View className="mt-6">
          <Text className="text-2xl font-bold text-baccent mb-4">Fonts</Text>
          <LiquidGlassView
            className=" rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className="px-4 py-4">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
              >
                Font Presets
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
              >
                {fontPreset.name}: {fontPreset.description}
              </Text>
              <View className="flex-row flex-wrap mt-3 -mx-1">
                {FONT_PRESETS.map((option) => {
                  const isSelected = fontPresetId === option.id;
                  const labelClassName = `text-sm font-semibold ${
                    isSelected
                      ? isDark
                        ? "text-appblack"
                        : "text-appwhite"
                      : isDark
                        ? "text-appwhite"
                        : "text-appblack"
                  }`;
                  const labelStyle = option.regularFamily
                    ? { fontFamily: option.regularFamily }
                    : undefined;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      className={`px-3 py-2 mx-1 mb-2 rounded-full border ${
                        isSelected
                          ? "bg-baccent border-baccent"
                          : isDark
                            ? "border-dark4"
                            : "border-light4"
                      }`}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                        setFontPreset(option.id);
                      }}
                    >
                      {option.regularFamily ? (
                        <Text className={labelClassName} style={labelStyle}>
                          {option.name}
                        </Text>
                      ) : (
                        <RNText className={labelClassName}>
                          {option.name}
                        </RNText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View
                className={`mt-4 rounded-xl px-4 py-4 ${isDark ? "bg-dark4" : "bg-light4"}`}
              >
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm`}
                >
                  Preview
                </Text>
                <Text
                  className={`mt-3 text-lg ${isDark ? "text-appwhite" : "text-appblack"}`}
                >
                  Alpha step, Omega, step
                </Text>
                <Text
                  className={`mt-2 text-lg font-medium ${isDark ? "text-appwhite" : "text-appblack"}`}
                >
                  Kappa, step, Sigma, step
                </Text>
                <Text
                  className={`mt-2 text-lg font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
                >
                  A.k.a., step, Delta, step
                </Text>
                <Text
                  className={`mt-2 text-lg font-bold ${isDark ? "text-appwhite" : "text-appblack"}`}
                >
                  S.G. Rho, step, Zeta, step
                </Text>
              </View>
            </View>
          </LiquidGlassView>
        </View>

        <View className="mt-6">
          <Text className="text-2xl font-bold text-baccent mb-4">
            Experience
          </Text>
          <LiquidGlassView
            className=" rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className="px-4 py-4">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
              >
                Greeting Messages
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
              >
                Choose what shows on the Courses screen.
              </Text>
              <View className="flex-row mt-3">
                {[
                  { key: "default", label: "Default" },
                  { key: "inspirational", label: "Inspire" },
                  { key: "off", label: "Off" },
                ].map((option) => {
                  const isSelected = messageMode === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      className={`flex-1 py-2 mx-1 rounded-full border ${
                        isSelected
                          ? "bg-baccent border-baccent"
                          : isDark
                            ? "border-dark4"
                            : "border-light4"
                      }`}
                      onPress={() => {
                        updateMessageMode(
                          option.key as "default" | "inspirational" | "off",
                        );
                      }}
                    >
                      <Text
                        className={`text-center text-sm font-semibold ${
                          isSelected
                            ? isDark
                              ? "text-appblack"
                              : "text-appwhite"
                            : isDark
                              ? "text-appwhite"
                              : "text-appblack"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Refresh Button
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Show a refresh button on the Courses screen.
                </Text>
              </View>
              <AppToggle
                value={showRefreshButton}
                onValueChange={toggleRefreshButton}
              />
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Haptics
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Turn vibration feedback on or off.
                </Text>
              </View>
              <AppToggle value={hapticsEnabled} onValueChange={toggleHaptics} />
            </View>
          </LiquidGlassView>
        </View>
        <LiquidGlassView
          className="rounded-2xl overflow-hidden  mt-5"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View className="px-4 py-4 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
              >
                Looking for something else?
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  router.push("/AdvancedView");
                }}
              >
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mt-4`}
                >
                  Use Liquid Glass
                </Text>
                {showLiquidGlassAppearanceWarning ? (
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mt-2 text-sm`}
                  >
                    If your device stays in Light Mode while the app is in Dark
                    Mode, things might look weird. Turn on Dark Mode on your
                    device to fix it.
                  </Text>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
        </LiquidGlassView>
      </ScrollView>

      <Modal visible={showCustomThemeModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-5">
          <LiquidGlassView
            containerClassName="w-full max-w-md"
            className="rounded-2xl p-6"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="regular"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
                >
                  Custom Theme
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1 mr-3`}
                >
                  Upload an image, and teachassist will use magic to create
                  themes around your photo.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  setShowCustomThemeModal(false);
                }}
              >
                <View
                  className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold bg-baccent/85 rounded-xl p-2`}
                >
                  <Image
                    className={`w-5 h-5`}
                    style={{
                      tintColor: isDark ? "#2f3035" : "#edebea",
                    }}
                    source={require("../../assets/images/checkmark.png")}
                  />
                </View>
              </TouchableOpacity>
            </View>
            {/* 
              <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} rounded-xl p-4`}
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold`}
              >
                How it works
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-2`}
              >
                The selected image is saved locally, its dominant color is
                sampled, and a custom theme preset is generated from that color.
                You can also use the same image as a page background.
              </Text>
              <View/>
              */}
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mb-3`}
            >
              {pageBackgroundImageUri
                ? "The shadow wizard money gang has concocted a theme from your image. Enjoy..."
                : "No image has been selected yet. Choose an image to get started!"}
            </Text>
            <View className={`flex-row items-center justify-center gap-3 mt-3`}>
              <TouchableOpacity
                className={`rounded-xl bg-baccent px-4 py-3 ${
                  isBuildingCustomTheme ? "opacity-70" : ""
                } ${hasCustomTheme ? "w-1/2" : "w-full"}`}
                disabled={isBuildingCustomTheme}
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
                  buildThemeFromPickedImage();
                }}
              >
                <Text
                  className={`text-center font-semibold ${
                    isDark ? "text-appblack" : "text-appwhite"
                  }`}
                >
                  {isBuildingCustomTheme ? "Creating..." : "Create from Image"}
                </Text>
              </TouchableOpacity>
              {hasCustomTheme ? (
                <TouchableOpacity
                  className="rounded-xl bg-danger/70 px-4 py-3"
                  disabled={isBuildingCustomTheme}
                  onPress={async () => {
                    await clearCustomTheme();
                    resetBackgroundImage();
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text className={`text-center font-semibold text-appwhite`}>
                    Remove Theme
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View className="mt-5 mb-1 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold`}
                >
                  Image Background
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1 mr-1`}
                >
                  Uses the selected custom theme image as the app background.
                </Text>
              </View>
              <TouchableOpacity
                className={`w-13 h-8 rounded-full ${
                  pageBackgroundEnabled && pageBackgroundImageUri
                    ? "bg-baccent"
                    : isDark
                      ? "bg-dark4"
                      : "bg-light4"
                } flex-row items-center ${pageBackgroundImageUri ? "" : "opacity-50"}`}
                disabled={!pageBackgroundImageUri}
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  setPageBackgroundEnabled(!pageBackgroundEnabled);
                }}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white  ${
                    pageBackgroundEnabled && pageBackgroundImageUri
                      ? "ml-6"
                      : "ml-0.5"
                  }`}
                />
              </TouchableOpacity>
            </View>
          </LiquidGlassView>
        </View>
      </Modal>
    </View>
  );
};

export default PersonalizationScreen;
