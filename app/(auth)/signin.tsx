import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  View,
} from "react-native";
import TeachAssistAuthFetcher, { SecureStorage } from "../(auth)/taauth";
import Text from "@/components/ui/AppText";
import AppTextInput from "@/components/ui/AppTextInput";
import BackButton from "@/components/ui/Back";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import { appVersionNumber } from "@/utils/appVersion";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import { useLiquidGlassActive } from "@/utils/liquidGlass";
import { runVersionCheck } from "@/utils/versionCheck";
import { ensureVpnDisabled } from "@/utils/vpn";
import { useTheme } from "@/contexts/ThemeContext";
// Sign in screen

const SignInScreen = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const router = useRouter();
  const { isDark, activeTone } = useTheme();
  const liquidGlassEnabled = useLiquidGlassActive();

  // simple client side error checking
  const handleLogin = async () => {
    if (username === "" || password === "") {
      setMessage("Please enter a student ID and password.");
      hapticsNotification(Haptics.NotificationFeedbackType.Error);
      return;
    } else if (!/^\d+$/.test(username)) {
      // regex i stole, check for numbers and at least 1 number
      setMessage("Username must be a number.");
      hapticsNotification(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const vpnOk = await ensureVpnDisabled();
    if (!vpnOk) {
      hapticsNotification(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setMessage("");
    setIsLoading(true);
  };

  // get what was returned from TeachAssistAuthFetcher's onResult prop
  const handleAuthResult = async (result: string) => {
    if (result === "Login Success") {
      await SecureStorage.save(
        "marks_last_retrieved",
        new Date().toISOString(),
      );
      await runVersionCheck(appVersionNumber);
      hapticsNotification(Haptics.NotificationFeedbackType.Success);
      router.replace("/courses");
    } else {
      // use the setMessage from before
      hapticsNotification(Haptics.NotificationFeedbackType.Error);
      setMessage(result);
      setIsLoading(false);
    }
  };

  // Show some error
  const onError = (error: string) => {
    setMessage(`Error: ${error}`);
    setIsLoading(false);
  };

  // boiletplate to handle loading thing
  const onLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  useEffect(() => {}, []);

  return (
    <View
      className={`flex-1 justify-center items-center ${isDark ? "bg-dark1" : "bg-light1"} px-6`}
    >
      <BackButton path={"/onboarding"} />
      <LiquidGlassButton
        containerStyle={{
          position: "absolute",
          top: 56,
          right: 20,
          zIndex: 50,
        }}
        contentStyle={{
          width: liquidGlassEnabled ? 48 : undefined,
          height: liquidGlassEnabled ? 48 : undefined,
          borderRadius: liquidGlassEnabled ? 999 : 12,
          paddingHorizontal: liquidGlassEnabled ? 0 : 9,
          paddingVertical: liquidGlassEnabled ? 0 : 10,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.18 : 0.1,
          shadowRadius: 8,
          shadowOffset: {
            width: 0,
            height: 4,
          },
          elevation: 4,
        }}
        glassTintColor={activeTone.bg4}
        fallbackBackgroundColor={activeTone.bg4}
        onPress={() => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          Linking.openURL("https://prmntr.com/teachassist#support");
        }}
      >
        <Image
          source={require("../../assets/images/support-help.png")}
          className={liquidGlassEnabled ? "w-6 h-6" : "w-7 h-7"}
          style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
        />
      </LiquidGlassButton>
      <View style={{ width: "100%", maxWidth: 420 }}>
        <Text
          className={`text-4xl leading-[40px] ${isDark ? "text-appwhite" : "text-appblack"} mb-0 text-center`}
        >
          Alright.
        </Text>
        <Text
          className={`text-4xl leading-[40px] ${isDark ? "text-baccent" : "text-appblack"} mb-7 text-center font-bold`}
        >
          Login time.
        </Text>
        {message ? (
          <LiquidGlassView
            className="mb-4 mt-2"
            contentStyle={{
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
            glassTintColor="#dc2626"
            fallbackBackgroundColor="#dc2626"
            glassEffectStyle="regular"
          >
            <Text className="text-appwhite text-md text-center">{message}</Text>
          </LiquidGlassView>
        ) : null}

        <LiquidGlassView
          className="mb-4"
          contentStyle={{ borderRadius: 12 }}
          fallbackBackgroundColor={activeTone.bg4}
          glassTintColor={activeTone.bg4}
        >
          <AppTextInput
            className={`px-4 py-4 ${isDark ? "text-appwhite" : "text-appblack"}`}
            placeholder="Student ID"
            placeholderTextColor="#a1a1aa"
            value={username}
            onChangeText={setUsername}
            keyboardType="numeric"
            editable={!isLoading}
          />
        </LiquidGlassView>
        <LiquidGlassView
          className="mb-4"
          contentStyle={{ borderRadius: 12 }}
          fallbackBackgroundColor={activeTone.bg4}
          glassTintColor={activeTone.bg4}
        >
          <AppTextInput
            className={`px-4 py-4 ${isDark ? "text-appwhite" : "text-appblack"}`}
            placeholder="Password"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#a1a1aa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />
        </LiquidGlassView>
        <Text
          className={` ${isDark ? "text-appwhite" : "text-appblack"} mx-2 text-center mb-5 text-sm`}
        >
          {/* <Text className={`bg-danger/70`}>DISCLAIMER:</Text> This app is not
          sponsored, endorsed by, or affiliated with YRDSB or the TeachAssist
          Foundation. Use at your own risk.*/}
          By using this app, you agree to the TeachAssist{" \n"}
          <Link
            href="https://prmntr.com/teachassist/tos"
            className={`underline text-baccent`}
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="https://prmntr.com/teachassist/privacy"
            className={`underline text-baccent`}
          >
            Privacy Policy
          </Link>
          .
        </Text>
        <LiquidGlassButton
          disabled={isLoading}
          contentStyle={{
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
          glassTintColor={activeTone.accent}
          fallbackBackgroundColor={activeTone.accent}
          onPress={() => {
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            handleLogin();
          }}
        >
          <Text
            className={`${isDark ? "text-appblack" : "text-appwhite"} font-semibold text-2xl text-center`}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </Text>
        </LiquidGlassButton>

        {isLoading && (
          <ActivityIndicator
            size="large"
            color={activeTone.accent}
            className={`mt-6`}
          />
        )}
      </View>

      {/*call auth service*/}
      {isLoading && message === "" && (
        <TeachAssistAuthFetcher
          loginParams={{ username, password }}
          prefetchCourses
          onResult={handleAuthResult}
          onError={onError}
          onLoadingChange={onLoadingChange}
        />
      )}
    </View>
  );
};

export default SignInScreen;
