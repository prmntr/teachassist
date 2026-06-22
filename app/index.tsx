import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  StyleSheet,
  View,
} from "react-native";
import TeachAssistAuthFetcher, { SecureStorage } from "./(auth)/taauth";
import Text from "@/components/ui/AppText";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { appVersionNumber } from "@/utils/appVersion";
import { hapticsImpact } from "@/utils/haptics";
import { consumeStudentGradeStartupPrompt } from "@/utils/notifications";
import { useTheme } from "@/contexts/ThemeContext";
import "./global.css";

const styles = StyleSheet.create({
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
});

// handle login and decide
const InitialRoute = () => {
  const router = useRouter();

  const { isDark, activeTone } = useTheme();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const wordmark = isDark
    ? require("../assets/images/teachassist-wordmark.png")
    : require("../assets/images/teachassist-wordmark-light.png");
  const backgroundVideo = isDark
    ? require("../assets/images/flower2-paper.mp4")
    : require("../assets/images/bubble-wallpaper-light.mp4");
  const backgroundPlayer = useVideoPlayer(backgroundVideo, (player) => {
    player.loop = isDark ? false : true;
    player.muted = true;
    player.play();
  });

  // so the user doesn't fake sign in every time

  useEffect(() => {
    const checkSavedCredentialsOrCourses = async () => {
      try {
        const savedUsername = await SecureStorage.load("ta_username");
        const savedPassword = await SecureStorage.load("ta_password");
        const savedCourses = await SecureStorage.load("ta_courses");
        // Immediately show courses page if cached courses exist
        if (savedCourses) {
          const shouldShowStudentGradePage =
            await consumeStudentGradeStartupPrompt();
          router.replace(
            shouldShowStudentGradePage ? "/DetermineGrade" : "/courses",
          );
          setIsCheckingAuth(false);
          return;
        }
        // If no cached courses, proceed as before (auto-login if possible)
        if (savedUsername && savedPassword) {
          setSavedCredentials({
            username: savedUsername,
            password: savedPassword,
          });
          setIsAutoLoggingIn(true);
          setIsCheckingAuth(false);
        } else {
          setIsCheckingAuth(false);
        }
      } catch (error) {
        // error getting auth
        Alert.alert(
          "There was an error logging you back in. Please log in again.",
        );
        console.warn("index: failed to load saved credentials", error);
        setIsCheckingAuth(false);
      }
    };

    checkSavedCredentialsOrCourses();
  }, [router]);

  // handle the result from auto login
  const handleAuthResult = async (_result: string) => {
    const savedCourses = await SecureStorage.load("ta_courses");
    const shouldShowStudentGradePage = savedCourses
      ? await consumeStudentGradeStartupPrompt()
      : false;
    router.replace(shouldShowStudentGradePage ? "/DetermineGrade" : "/courses");
    {
      /* 
    if (result === "Login Success") {
      hapticsNotification(Haptics.NotificationFeedbackType.Success);
      router.replace("/courses");
    } else {
      // Auto-login failed, show landing page
      hapticsNotification(Haptics.NotificationFeedbackType.Error);
      setIsAutoLoggingIn(false);
      setIsCheckingAuth(false);
    }  
      */
    }
  };

  // handle auth error
  const onError = (error: string) => {
    console.warn("index: auto-login failed", error);
    setIsAutoLoggingIn(false);
    setIsCheckingAuth(false);
  };

  // loading
  const onLoadingChange = (loading: boolean) => {
    setIsAutoLoggingIn(loading);
  };

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(18)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(300),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // show loading spinner at loading
  if (isCheckingAuth || isAutoLoggingIn) {
    return (
      <View
        className={`flex-1 items-center justify-center ${isDark ? "bg-dark1" : "bg-light1"}`}
      >
        <PageBackground />
        <VideoView
          player={backgroundPlayer}
          style={styles.backgroundVideo}
          contentFit="cover"
          pointerEvents="none"
          nativeControls={false}
        />
        <LinearGradient
          colors={
            isDark
              ? ["rgba(8, 10, 14, 0.15)", "rgba(8, 10, 14, 0.95)"]
              : ["rgba(245, 247, 250, 0.2)", "rgba(245, 247, 250, 0.95)"]
          }
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <LiquidGlassView
          containerStyle={{ width: "100%", paddingHorizontal: 24 }}
          contentStyle={{
            borderRadius: 32,
            paddingHorizontal: 28,
            paddingVertical: 32,
            alignItems: "center",
          }}
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="regular"
        >
          <Image
            source={
              isDark
                ? require("../assets/images/teach-icon-transparent.png")
                : require("../assets/images/teach-icon-transparent-light.png")
            }
            className={`w-26 h-25 mb-6 object-fill`}
          />
          <Text
            className={`text-5xl font-bold ${isDark ? "text-appwhite" : "text-appblack"} mb-4`}
          >
            TeachAssist
          </Text>
          <ActivityIndicator size="large" color={activeTone.accent} />
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-md mt-4`}
          >
            {isCheckingAuth ? "Checking credentials..." : "Signing you in..."}
          </Text>
        </LiquidGlassView>

        {isAutoLoggingIn && savedCredentials && (
          <TeachAssistAuthFetcher
            loginParams={savedCredentials}
            prefetchCourses
            onResult={handleAuthResult}
            onError={onError}
            onLoadingChange={onLoadingChange}
          />
        )}
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <VideoView
        player={backgroundPlayer}
        style={styles.backgroundVideo}
        contentFit="cover"
        pointerEvents="none"
        nativeControls={false}
      />
      <LinearGradient
        colors={
          isDark
            ? ["rgba(8, 10, 14, 0.15)", "rgba(8, 10, 14, 0.95)"]
            : ["rgba(245, 247, 250, 0.2)", "rgba(245, 247, 250, 0.95)"]
        }
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <View className={`flex-1 justify-between px-6 pt-40 pb-10`}>
        <Animated.View
          className={`items-center`}
          style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}
        >
          <Image
            resizeMode="contain"
            style={{ width: 240, height: 45 }}
            source={wordmark}
          />
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg text-center mt-2`}
          >
            Your next superpower.
          </Text>
        </Animated.View>
        <Animated.View className={`w-full`} style={{ opacity: buttonOpacity }}>
          {/*
          <View
            className={`${isDark ? "bg-dark3/75" : "bg-light3/85"} rounded-2xl px-5 py-4 mb-6`}
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm`}
            >
              Unofficial mobile app for the YRDSB TeachAssist portal.
            </Text>
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm mt-2`}
            >
              Not affiliated with YRDSB or the TeachAssist Foundation.
            </Text>
          </View>
          */}
          <LiquidGlassButton
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              router.push("/onboarding");
            }}
            contentStyle={{
              borderRadius: 12,
              paddingHorizontal: 20,
              paddingVertical: 13,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: isDark ? 0.18 : 0.1,
              shadowRadius: 10,
              shadowOffset: {
                width: 0,
                height: 4,
              },
              elevation: 4,
            }}
            glassTintColor={activeTone.accent}
            fallbackBackgroundColor={activeTone.accent}
          >
            <Text
              className={`${isDark ? "text-appblack" : "text-appwhite"} font-semibold text-2xl mr-2`}
            >
              Get started
            </Text>
            <Image
              className="w-8 h-8"
              tintColor={isDark ? "#2f3035" : "#fafafa"}
              source={require("../assets/images/arrow-icon.png")}
            />
          </LiquidGlassButton>
          <Text
            className={`${isDark ? "text-appgraydark" : "text-appgraylight"} text-sm mt-4 text-center`}
          >
            Version {appVersionNumber}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

export default InitialRoute;
