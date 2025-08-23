import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import TeachAssistAuthFetcher, { SecureStorage } from "./(auth)/taauth";
import "./global.css";

// handle login and decide
const InitialRoute = () => {
  const router = useRouter();
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
      Alert.alert("There was an error logging you back in. Please log in again.");
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
      <View className="flex-1 items-center justify-center bg-1">
        <Image
          source={require("../assets/images/transparent_ta_icon.png")}
          className="w-22 h-21 mb-6 object-fill"
        />
        <Text className="text-5xl font-bold text-appwhite mb-4">
          TeachAssist
        </Text>
        <ActivityIndicator size="large" color="#27b1fa" />
        <Text className="text-appwhite text-md mt-4">
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
    <View className="flex-1 items-center justify-center bg-1">
      <Image
        source={require("../assets/images/transparent_ta_icon.png")}
        className="w-22 h-22 mb-6 object-fill"
      />
      <Text className="text-5xl font-bold text-appwhite">TeachAssist</Text>
      <Text className="text-appwhite text-md font-semibold italic mb-15">
        Helping you get ahead.
      </Text>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.replace("/messages");
        }}
      >
        <View className="bg-baccent px-5 py-3 rounded-xl shadow-lg flex-row items-center">
          <Text className="text-appwhite font-semibold text-3xl mr-2">
            Get Started
          </Text>
          <Image
            className="w-8 h-8"
            style={{ tintColor: "#edebea" }}
            source={require("../assets/images/arrow-icon.png")}
          />
        </View>
      </TouchableOpacity>
      <Text className="text-gray-600 text-lg absolute bottom-4">
        0.1.0-alpha.1
      </Text>
    </View>
  );
};

export default InitialRoute;
