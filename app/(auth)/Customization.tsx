import { AlertIcon, AppAlert } from "@/components/ui/AppAlert";
import Text from "@/components/ui/AppText";
import AppToggle from "@/components/ui/AppToggle";
import BackButton from "@/components/ui/Back";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import {
  setLiquidGlassEnabled,
  useLiquidGlassEnabled,
} from "@/utils/liquidGlass";
import {
  BUILT_IN_THEME_PRESETS,
  CUSTOM_THEME_IMAGE_STORAGE_KEY,
  FONT_PRESETS,
} from "@/utils/themeSystem";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Text as RNText,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SecureStorage } from "../(auth)/taauth";

const PersonalizationScreen = () => {
  const router = useRouter();
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
  const [isBuildingCustomTheme, setIsBuildingCustomTheme] = useState(false);
  const [showCustomThemeModal, setShowCustomThemeModal] = useState(false);
  const storedLiquidGlassEnabled = useLiquidGlassEnabled();
  const systemColorScheme = useColorScheme();
  const isAndroid = Platform.OS === "android";
  const liquidGlassEnabled = storedLiquidGlassEnabled && !isAndroid;
  const isCustomThemeSelected = themePresetId === "custom";
  const showLiquidGlassAppearanceWarning =
    systemColorScheme === "light" && liquidGlassEnabled && isDark;

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

  const chipTextColor = (isSelected: boolean) => {
    if (isSelected) {
      return isDark ? "text-appblack" : "text-appwhite";
    }

    return isDark ? "text-appwhite" : "text-appblack";
  };

  const openCustomThemeModal = async () => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    if (hasCustomTheme) {
      await setThemePreset("custom");
    }
    setShowCustomThemeModal(true);
  };

  const toggleLiquidGlass = async () => {
    if (isAndroid) {
      return;
    }

    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await setLiquidGlassEnabled(!storedLiquidGlassEnabled);
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
          Make it <Text className="text-baccent font-semibold">yours.</Text>
        </Text>

        <View className="mt-5">
          <LiquidGlassView
            className="overflow-hidden rounded-2xl "
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
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mt-1 text-sm`}
              >
                Choose between light and dark mode.
              </Text>
              <View className="mt-3 flex-row">
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
                      className="mx-1 flex-1 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? activeTone.accent
                          : activeTone.bg4,
                      }}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
                        setThemeMode(option.key as "light" | "dark");
                      }}
                    >
                      <View className="flex-row items-center justify-center px-3 py-2.5">
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
                          className={`text-center text-sm font-semibold ${chipTextColor(
                            isSelected,
                          )}`}
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
              className={`${isDark ? "bg-dark4" : "bg-light4"} mx-4 mt-2 h-px`}
            />

            {!isAndroid && (
              <>
                <View className="flex-row items-center justify-between px-4 py-4">
                  <View className="flex-1 pr-3">
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                    >
                      Liquid Glass
                    </Text>
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mt-1 text-sm`}
                    >
                      {showLiquidGlassAppearanceWarning
                        ? "Experimental! Try out liquid glass in the teachassist app (requires iOS 26+). If your device stays in Light Mode while the app is in Dark Mode, things might look weird. Turn on Dark Mode on your device to fix it."
                        : "Experimental! Try out Liquid Glass in the teachassist app (requires iOS 26+)."}
                    </Text>
                  </View>
                  <AppToggle
                    value={liquidGlassEnabled}
                    onValueChange={(_v) => toggleLiquidGlass()}
                  />
                </View>

                <View
                  className={`${isDark ? "bg-dark4" : "bg-light4"} mx-4 h-px`}
                />
              </>
            )}

            <View className="px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Themes
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mt-1 text-sm`}
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
                        className="ml-1 h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </View>
                )}
              </View>
              <View className="-mx-1 mt-3 flex-row flex-wrap">
                {BUILT_IN_THEME_PRESETS.map((preset) => {
                  const isSelected = themePresetId === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      className="mx-1 mb-2 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? activeTone.accent
                          : activeTone.bg4,
                      }}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                        setThemePreset(preset.id);
                      }}
                    >
                      <View className="flex-row items-center px-3 py-2.5">
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
                          className={`text-sm font-semibold ${chipTextColor(
                            isSelected,
                          )}`}
                        >
                          {preset.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  className="mx-1 mb-2 rounded-full"
                  style={{
                    backgroundColor: isCustomThemeSelected
                      ? activeTone.accent
                      : activeTone.bg4,
                  }}
                  onPress={openCustomThemeModal}
                >
                  <View className="flex-row items-center px-3 py-2.5">
                    <Image
                      className="mr-1.5 h-4 w-5"
                      style={{
                        tintColor: isCustomThemeSelected
                          ? activeTone.bg1
                          : activeTone.accent,
                      }}
                      source={require("../../assets/images/paintbrush.png")}
                    />
                    <Text
                      className={`text-sm font-semibold ${chipTextColor(
                        isCustomThemeSelected,
                      )}`}
                    >
                      Custom
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} mx-4 h-px`}
            />

            <View className="px-4 py-4">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
              >
                Fonts
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mt-1 text-sm`}
              >
                {fontPreset.name}: {fontPreset.description}
              </Text>
              <View className="-mx-1 mt-3 flex-row flex-wrap">
                {FONT_PRESETS.map((option) => {
                  const isSelected = fontPresetId === option.id;
                  const labelClassName = `font-semibold ${
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
                      className="mx-1 mb-2 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? activeTone.accent
                          : activeTone.bg4,
                      }}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                        setFontPreset(option.id);
                      }}
                    >
                      <View className="items-center justify-center px-3 pt-2 pb-1">
                        {option.regularFamily ? (
                          <Text
                            className={`${labelClassName} text-sm`}
                            style={[
                              labelStyle,
                              { includeFontPadding: false, lineHeight: 20 },
                            ]}
                          >
                            {option.name}
                          </Text>
                        ) : (
                          <RNText className={`${labelClassName} text-sm`}>
                            {option.name}
                          </RNText>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </LiquidGlassView>
        </View>
      </ScrollView>

      <View className="px-6 pb-9">
        <LiquidGlassButton
          contentStyle={{
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
          glassTintColor={activeTone.accent}
          fallbackBackgroundColor={activeTone.accent}
          onPress={() => {
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            router.push("/signin");
          }}
        >
          <Text
            className={`${isDark ? "text-appblack" : "text-appwhite"} font-semibold text-2xl mr-2`}
          >
            Continue
          </Text>
        </LiquidGlassButton>
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg mt-4 text-center`}
        ></Text>
      </View>

      <Modal visible={showCustomThemeModal} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/60 px-5">
          <LiquidGlassView
            containerClassName="w-full max-w-md"
            className="rounded-2xl p-6"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="regular"
          >
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
                >
                  Custom Theme
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mt-1 mr-3 text-sm`}
                >
                  Upload an image, and teachassist will use magic to create
                  themes around your photo.
                </Text>
              </View>
              <TouchableOpacity
                className="rounded-xl"
                style={{ backgroundColor: activeTone.accent }}
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  setShowCustomThemeModal(false);
                }}
              >
                <View className="items-center justify-center p-2">
                  <Image
                    className="h-5 w-5"
                    style={{
                      tintColor: isDark ? "#2f3035" : "#edebea",
                    }}
                    source={require("../../assets/images/checkmark.png")}
                  />
                </View>
              </TouchableOpacity>
            </View>
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mb-3 text-sm`}
            >
              {pageBackgroundImageUri
                ? "The shadow wizard money gang has concocted a theme from your image. Enjoy..."
                : "No image has been selected yet. Choose an image to get started!"}
            </Text>
            <View className="mt-3 flex-row items-center justify-center gap-3">
              <TouchableOpacity
                disabled={isBuildingCustomTheme}
                className={`rounded-xl ${hasCustomTheme ? "flex-1" : ""}`}
                style={{
                  backgroundColor: activeTone.accent,
                  opacity: isBuildingCustomTheme ? 0.7 : 1,
                }}
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
                  buildThemeFromPickedImage();
                }}
              >
                <View className="items-center justify-center px-4 py-3">
                  <Text
                    className={`text-center font-semibold ${
                      isDark ? "text-appblack" : "text-appwhite"
                    }`}
                  >
                    {isBuildingCustomTheme
                      ? "Creating..."
                      : "Create from Image"}
                  </Text>
                </View>
              </TouchableOpacity>
              {hasCustomTheme ? (
                <TouchableOpacity
                  disabled={isBuildingCustomTheme}
                  className="flex-1 rounded-xl bg-danger/80"
                  onPress={async () => {
                    await clearCustomTheme();
                    resetBackgroundImage();
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View className="items-center justify-center px-4 py-3">
                    <Text className="text-center font-semibold text-appwhite">
                      Remove Theme
                    </Text>
                  </View>
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
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mt-1 mr-1 text-sm`}
                >
                  Uses the selected custom theme image as the app background.
                </Text>
              </View>
              <AppToggle
                value={!!(pageBackgroundEnabled && pageBackgroundImageUri)}
                disabled={!pageBackgroundImageUri}
                onValueChange={(v) => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  setPageBackgroundEnabled(v);
                }}
              />
            </View>
          </LiquidGlassView>
        </View>
      </Modal>
    </View>
  );
};

export default PersonalizationScreen;
