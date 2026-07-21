import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { appVersionNumber } from "@/utils/appVersion";
import { getTeachAssistServerOrigin } from "@/utils/serverConfig";
import { runVersionCheck } from "@/utils/versionCheck";
import { AFoolVisualGradesProvider } from "@/contexts/AFoolVisualGradesContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppAlertHost } from "@/components/ui/AppAlert";
import { BiometricLockOverlay } from "@/components/ui/BiometricLockOverlay";
import "./global.css";

// The Fabric renderer's dev build logs benign multi-touch warnings when extra
// fingers' touchStart is swallowed by full-screen native overlays (expo-video
// VideoView, expo-linear-gradient) on the new architecture. These are cosmetic,
// dev-only (absent from production renderer), and LogBox.ignoreLogs cannot
// silence them because LogBox still forwards console.warn to the Metro terminal.
// Filter them at the console instead, passing every other warning through.
if (__DEV__) {
  const IGNORED_TOUCH_WARNINGS = [
    "Cannot record touch move without a touch start",
    "Ended a touch event which was not counted in `trackedTouchCount`",
  ];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      IGNORED_TOUCH_WARNINGS.some((message) => first.startsWith(message))
    ) {
      return;
    }
    originalWarn(...args);
  };
}

function AppShell() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="courseview/[id]" />
      </Stack>
      <BiometricLockOverlay />
      <AppAlertHost />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Domine-Regular": require("../assets/fonts/Domine/static/Domine-Regular.ttf"),
    "Domine-Medium": require("../assets/fonts/Domine/static/Domine-Medium.ttf"),
    "Domine-SemiBold": require("../assets/fonts/Domine/static/Domine-SemiBold.ttf"),
    "Domine-Bold": require("../assets/fonts/Domine/static/Domine-Bold.ttf"),
    "GoogleSans-Regular": require("../assets/fonts/elgooG/Product-Sans-Regular.ttf"), 
    // do NOT use the included Google-Sans-X, it's fucked up at 17px
    // trust my pain, padawan
    "GoogleSans-Medium": require("../assets/fonts/elgooG/Product-Sans-Regular.ttf"),
    "GoogleSans-SemiBold": require("../assets/fonts/elgooG/Product-Sans-Bold.ttf"),
    "GoogleSans-Bold": require("../assets/fonts/elgooG/Product-Sans-Bold.ttf"),
    "JetBrainsMono-Regular": require("../assets/fonts/JetBrains_Mono/static/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Medium": require("../assets/fonts/JetBrains_Mono/static/JetBrainsMono-Medium.ttf"),
    "JetBrainsMono-SemiBold": require("../assets/fonts/JetBrains_Mono/static/JetBrainsMono-SemiBold.ttf"),
    "JetBrainsMono-Bold": require("../assets/fonts/JetBrains_Mono/static/JetBrainsMono-Bold.ttf"),
  });

  useEffect(() => {
    getTeachAssistServerOrigin().catch((error) => {
      console.warn("[serverConfig] Failed to load custom server.", error);
    });

    runVersionCheck(appVersionNumber).catch((error) => {
      console.warn("[versionCheck] Startup check failed.", error);
    });

    import("@/utils/notifications")
      .then(({ initializeNotifications }) => initializeNotifications())
      .catch((error) => {
        console.warn("notifications: init failed", error);
      });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AFoolVisualGradesProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <AppShell />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </AFoolVisualGradesProvider>
    </ThemeProvider>
  );
}
