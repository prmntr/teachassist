import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TeachAssistAuthFetcher, { SecureStorage } from "./(auth)/taauth";
import { hapticsImpact } from "./(utils)/haptics";
import { useTheme } from "./contexts/ThemeContext";
import "./global.css";

const styles = StyleSheet.create({
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
});

// handle login and decide
const InitialRoute = () => {
  const router = useRouter();

  const { isDark } = useTheme();

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
    ? require("../assets/images/bubble-wallpaper.mp4")
    : require("../assets/images/bubble-wallpaper-light.mp4");
  const backgroundPlayer = useVideoPlayer(backgroundVideo, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  // so the user doesn't fake sign in every time

  useEffect(() => {
    checkSavedCredentialsOrCourses();
  }, []);

  const checkSavedCredentialsOrCourses = async () => {
    try {
      const savedUsername = await SecureStorage.load("ta_username");
      const savedPassword = await SecureStorage.load("ta_password");
      const savedCourses = await SecureStorage.load("ta_courses");

      const networkState = await NetInfo.fetch();

      if (savedCourses && !networkState.isConnected) {
        // If cached courses exist, go straight to courses tab
        router.replace("/courses");
        return;
      }

      if (savedUsername && savedPassword) {
        // try and auto login
        setSavedCredentials({
          username: savedUsername,
          password: savedPassword,
        });
        setIsAutoLoggingIn(true);
        setIsCheckingAuth(false);
      } else {
        // first time, signed out
        setIsCheckingAuth(false);
      }
    } catch (error) {
      // error getting auth
      Alert.alert(
        "There was an error logging you back in. Please log in again.",
      );
      console.log("Error loading credentials:", error);
      setIsCheckingAuth(false);
    }
  };

  // handle the result from auto login
  const handleAuthResult = (result: string) => {
    console.log("handleAuthResult called with:", result);
    router.replace("/courses");
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
    console.log("Auto-login error:", error);
    setIsAutoLoggingIn(false);
    setIsCheckingAuth(false);
  };

  // loading
  const onLoadingChange = (loading: boolean) => {
    console.log("onLoadingChange called with:", loading);
    setIsAutoLoggingIn(loading);
  };

  // show loading spinner at loading
  if (isCheckingAuth || isAutoLoggingIn) {
    return (
      <View
        className={`flex-1 items-center justify-center ${isDark ? "bg-dark1" : "bg-light1"}`}
      >
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
        <ActivityIndicator size="large" color="#27b1fa" />
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} text-md mt-4`}
        >
          {isCheckingAuth ? "Checking credentials..." : "Signing you in..."}
        </Text>

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
        <View className={`items-center`}>
          <View className="pb-3">
            <Image
              resizeMode="contain"
              style={{
                width: 240,
                height: 45,
              }}
              source={wordmark}
            />
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg text-center font-light`}
            >
              unofficial client for yrdsb
            </Text>
          </View>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg text-center mt-10 font-light leading-10`}
          >
            check grades{`\n`}book guidance{`\n`}
            <Text className="">get notified</Text>
            {`\n`}stay ahead
          </Text>
        </View>
        <View className={`w-full`}>
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
          <TouchableOpacity
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              router.push("/onboarding");
            }}
          >
            <View
              className={`bg-baccent/90 px-5 py-3 rounded-xl shadow-lg flex-row items-center justify-center`}
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-3xl mr-2`}
              >
                Get started
              </Text>
              <Image
                className={`w-8 h-8`}
                tintColor={isDark ? "#fafafa" : "#2f3035"}
                source={require("../assets/images/arrow-icon.png")}
              />
            </View>
          </TouchableOpacity>
          <Text className={`text-baccent text-lg mt-6 text-center`}>
            Version 1.3.0
          </Text>
        </View>
      </View>
    </View>
  );
};

export default InitialRoute;
