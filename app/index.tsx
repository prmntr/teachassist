import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TeachAssistAuthFetcher, { SecureStorage } from "./(auth)/taauth";
import { useTheme } from "./contexts/ThemeContext";
import "./global.css";

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

  // so the user doesn't fake sign in every time
  useEffect(() => {
    checkSavedCredentials();
  }, []);

  const checkSavedCredentials = async () => {
    try {
      const savedUsername = await SecureStorage.load("ta_username");
      const savedPassword = await SecureStorage.load("ta_password");

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
        "There was an error logging you back in. Please log in again."
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/courses");
    } else {
      // Auto-login failed, show landing page
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            onResult={handleAuthResult}
            onError={onError}
            onLoadingChange={onLoadingChange}
          />
        )}
      </View>
    );
  }

  // landing page
  return (
    <View
      className={`flex-1 items-center justify-center ${isDark ? "bg-dark1" : "bg-light1"}`}
    >
      <Image
        source={
          isDark
            ? require("../assets/images/teach-icon-transparent.png")
            : require("../assets/images/teach-icon-transparent-light.png")
        }
        className={`w-22 h-22 mb-6 object-fill`}
      />
      <Text
        className={`text-5xl font-bold ${isDark ? "text-appwhite" : "text-appblack"}`}
      >
        TeachAssist
      </Text>
      <Text
        className={`${isDark ? "text-appwhite" : "text-appblack"} text-md font-semibold italic mb-15`}
      >
        Helping you get ahead.
      </Text>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.replace("/messages");
        }}
      >
        <View
          className={`bg-baccent/85 px-5 py-3 rounded-xl shadow-lg flex-row items-center`}
        >
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-3xl mr-2`}
          >
            Get Started
          </Text>
          <Image
            className={`w-8 h-8`}
            tintColor={isDark ? "#fafafa" : "#2f3035"}
            source={require("../assets/images/arrow-icon.png")}
          />
        </View>
      </TouchableOpacity>
      <Text className={`text-gray-600 text-2xl absolute bottom-5`}>v1.1.0</Text>
    </View>
  );
};

export default InitialRoute;
