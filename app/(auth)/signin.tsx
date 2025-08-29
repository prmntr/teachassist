import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import TeachAssistAuthFetcher from "../(auth)/taauth";

// Sign in screen

const SignInScreen = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const router = useRouter();

  // simple client side error checking
  const handleLogin = () => {
    if (username === "" || password === "") {
      setMessage("Please enter a student ID and password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    } else if (!/^\d+$/.test(username)) {
      // regex i stole, check for numbers and at least 1 number
      setMessage("Username must be a number.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setMessage("");
    setIsLoading(true);
  };

  // get what was returned from TeachAssistAuthFetcher's onResult prop
  const handleAuthResult = (result: string) => {
    if (result === "Login Success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/courses");
    } else {
      // use the setMessage from before
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  useEffect(() => {
    Alert.alert(
      "Hey there!",
      `Are you a tester? Use the placeholder username and password '123456789' and 'password' to test the app!`
    );
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-1 px-6">
      <TouchableOpacity
        className="absolute top-15 left-5 flex flex-row items-center gap-2 bg-gray-700/80 rounded-lg px-4 py-2 shadow-lg"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.replace("/messages");
        }}
      >
        <Image
          className="w-8 h-8"
          style={{ tintColor: "#edebea" }}
          source={require("../../assets/images/arrow-icon-left.png")}
        />
        <Text className="text-white font-semibold text-lg">Back</Text>
      </TouchableOpacity>
      <Text className="text-4xl font-bold text-appwhite mb-2 text-center">
        Sign in to <Text className="text-baccent">TeachAssist</Text>
      </Text>
      {/* conditional render */}
      {message ? (
        <Text className="text-appwhite mb-4 mt-2 text-md text-center bg-danger rounded-lg w-full py-2">
          {message}
        </Text>
      ) : (
        <Text></Text> // displays better with this idk why
      )}

      <TextInput
        className="w-full bg-4 text-white rounded-lg px-4 py-4 mb-4"
        placeholder="Student ID"
        placeholderTextColor="#a1a1aa"
        value={username}
        onChangeText={setUsername}
        keyboardType="numeric"
        editable={!isLoading}
      />
      <TextInput
        className="w-full bg-4 text-white rounded-lg px-4 py-4 mb-4"
        placeholder="Password"
        placeholderTextColor="#a1a1aa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!isLoading}
      />
      <Text className=" text-white mx-2 text-center mb-6 text-sm">
        {/* <Text className="bg-danger">DISCLAIMER:</Text> This app is not
        sponsored, endorsed by, or affiliated with YRDSB or the TeachAssist
        Foundation. Use at your own risk.*/}
        By using this app, you agree to the TeachAssist{" \n"}
        <Link
          href="https://prmntr.com/teachassist/tos"
          className="underline text-baccent"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="https://prmntr.com/teachassist/privacy"
          className="underline text-baccent"
        >
          Privacy policy
        </Link>
        .
      </Text>
      <TouchableOpacity
        disabled={isLoading}
        className="w-full bg-baccent text-center rounded-lg px-4 py-2 mb-3"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          handleLogin();
        }}
      >
        <Text className="text-white font-bold text-2xl text-center">
          Sign In
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="text-2xl text-center rounded-lg"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          Alert.alert(
            "Try these steps",
            `1. Try disabling your VPN; TeachAssist is only available to YRDSB students with an IP in Canada; we're working on a fix.\n\n2. Check your internet connection.\n\n3. Check the play store for any updates.`
          );
        }}
      >
        <Text className="text-appwhite text-md text-center underline underline-offset-1">
          Trouble signing in?
        </Text>
      </TouchableOpacity>

      {isLoading && (
        <ActivityIndicator size="large" color="#27b1fa" className="mt-6" />
      )}

      {/*call auth service*/}
      {isLoading && message === "" && (
        <TeachAssistAuthFetcher
          loginParams={{ username, password }}
          onResult={handleAuthResult}
          onError={onError}
          onLoadingChange={onLoadingChange}
        />
      )}
    </View>
  );
};

export default SignInScreen;
