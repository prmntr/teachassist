import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Tabs, usePathname } from "expo-router";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { useEffect, useRef, useState } from "react";
import {
  DynamicColorIOS,
  Image,
  Platform,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hapticsImpact } from "@/utils/haptics";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import {
  getLiquidGlassEnabled,
  subscribeLiquidGlass,
} from "@/utils/liquidGlass";
import { useTheme } from "@/contexts/ThemeContext";

const TAB_PATHS = new Set(["/courses", "/guidance", "/profile"]);

type JavaScriptTabIconProps = {
  source: any;
  hollowSource: any;
  width: string;
  focused: boolean;
};

const JavaScriptTabIcon = ({
  source,
  hollowSource,
  width,
  focused,
}: JavaScriptTabIconProps) => {
  const { activeTone } = useTheme();

  if (focused) {
    return (
      <View className="flex-col items-center mt-7 min-w-[112px] scale-120 transition duration-200">
        <Image
          source={source}
          className={width}
          tintColor={activeTone.accent}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View className="size-full justify-center items-center mt-7 min-w-[112px]">
      <Image
        source={hollowSource}
        className={width}
        tintColor={activeTone.muted}
        resizeMode="contain"
      />
    </View>
  );
};

const NativeTabLayout = () => {
  const { activeTone, isDark } = useTheme();
  const glassActive = isLiquidGlassAvailable();
  const iosDefaultColor =
    Platform.OS === "ios"
      ? DynamicColorIOS({
          light: "rgba(0, 0, 0, 0.68)",
          dark: "rgba(255, 255, 255, 0.72)",
        })
      : activeTone.muted;
  const iosSelectedColor =
    Platform.OS === "ios"
      ? DynamicColorIOS({
          light: "#000000",
          dark: "#ffffff",
        })
      : activeTone.accent;
  const iconTintColor = activeTone.accent;

  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      backgroundColor={Platform.OS === "android" ? activeTone.bg1 : null}
      // On iOS 26+ the glass tab bar uses tintColor for its native tint.
      // On pre-iOS 26 it bleeds onto all items (icons + labels), so omit it
      // and let per-state iconColor/labelStyle handle colouring instead.
      tintColor={glassActive ? iconTintColor : undefined}
      iconColor={{
        default: iosDefaultColor,
        selected: iconTintColor,
      }}
      labelStyle={{
        default: {
          color: iosDefaultColor,
          fontSize: 11,
          fontWeight: "500",
        },
        selected: {
          // On iOS 26+ glass uses its own treatment (black/white);
          // on pre-iOS 26 we explicitly set accent since tintColor isn't helping.
          color: glassActive ? iosSelectedColor : iconTintColor,
          fontSize: 11,
          fontWeight: "500",
        },
      }}
      shadowColor={Platform.OS === "ios" ? activeTone.border : undefined}
      disableIndicator={Platform.OS === "android"}
      rippleColor={
        Platform.OS === "android"
          ? isDark
            ? "rgba(255,255,255,0.12)"
            : "rgba(0,0,0,0.08)"
          : undefined
      }
      backBehavior="history"
    >
      <NativeTabs.Trigger name="courses">
        <Icon
          sf={{ default: "book.closed.fill", selected: "book.closed.fill" }}
          androidSrc={<VectorIcon family={MaterialIcons} name="menu-book" />}
        />
        <Label>Courses</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="guidance">
        <Icon
          sf={{
            default: "bubble.left.and.bubble.right.fill",
            selected: "bubble.left.and.bubble.right.fill",
          }}
          androidSrc={<VectorIcon family={MaterialIcons} name="chat-bubble" />}
        />
        <Label>Guidance</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon
          sf={{
            default: "person.crop.circle.fill",
            selected: "person.crop.circle.fill",
          }}
          androidSrc={
            <VectorIcon family={MaterialIcons} name="account-circle" />
          }
        />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

const JavaScriptTabLayout = () => {
  const { activeTone } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarBaseHeight = 56;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
        },
      }}
      screenOptions={{
        tabBarShowLabel: false,
        tabBarItemStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
        },
        tabBarStyle: {
          backgroundColor: activeTone.bg1,
          overflow: "hidden",
          borderColor: activeTone.border,
          borderTopWidth: 2,
          height:
            Platform.OS === "ios"
              ? tabBarBaseHeight + insets.bottom - 7
              : tabBarBaseHeight + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <JavaScriptTabIcon
              source={require("../../assets/images/CoursesIcon.png")}
              hollowSource={require("../../assets/images/CoursesIcon_Hollow.png")}
              width="w-10"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="guidance"
        options={{
          title: "Guidance",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <JavaScriptTabIcon
              source={require("../../assets/images/GuidanceIcon.png")}
              hollowSource={require("../../assets/images/GuidanceIcon_Hollow.png")}
              width="w-8"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <JavaScriptTabIcon
              source={require("../../assets/images/ProfileIcon.png")}
              hollowSource={require("../../assets/images/ProfileIcon_Hollow.png")}
              width="w-9"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default function TabLayout() {
  const { activeTone, isDark } = useTheme();
  const pathname = usePathname();
  const nativeTabsSupported = Platform.OS !== "android";
  const [nativeTabsEnabled, setNativeTabsEnabled] = useState(false);
  const previousTabPathRef = useRef<string | null>(null);
  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: activeTone.accent,
          background: activeTone.bg1,
          card: activeTone.bg1,
          text: "#edebea",
          border: activeTone.border,
          notification: activeTone.accent,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: activeTone.accent,
          background: activeTone.bg1,
          card: activeTone.bg1,
          text: "#2f3035",
          border: activeTone.border,
          notification: activeTone.accent,
        },
      };

  useEffect(() => {
    if (!nativeTabsEnabled || !TAB_PATHS.has(pathname)) {
      previousTabPathRef.current = TAB_PATHS.has(pathname) ? pathname : null;
      return;
    }

    if (previousTabPathRef.current && previousTabPathRef.current !== pathname) {
      hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
    }

    previousTabPathRef.current = pathname;
  }, [nativeTabsEnabled, pathname]);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      const nextNativeTabsEnabled = await getLiquidGlassEnabled();
      if (!isMounted) return;
      setNativeTabsEnabled(nextNativeTabsEnabled && nativeTabsSupported);
    };

    loadSettings();

    const unsubscribeNativeTabs = subscribeLiquidGlass((enabled) => {
      setNativeTabsEnabled(enabled && nativeTabsSupported);
    });

    return () => {
      isMounted = false;
      unsubscribeNativeTabs();
    };
  }, [nativeTabsSupported]);

  return (
    <View className="flex-1">
      <NavigationThemeProvider value={navigationTheme}>
        {nativeTabsEnabled ? <NativeTabLayout /> : <JavaScriptTabLayout />}
      </NavigationThemeProvider>
    </View>
  );
}
