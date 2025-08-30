import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SecureStorage } from "../(auth)/taauth";
const ProfileScreen = () => {
  const router = useRouter();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const appVersion = "v0.1.5"; //* update w/ app.json

  const [userName, setUserName] = useState<string | null>(null);
  const [passWord, setPassWord] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);

  const getUser = async () => {
    const userName = await SecureStorage.load("ta_username");
    setUserName(userName);
    return userName;
  };

  const getPass = async () => {
    const passWord = await SecureStorage.load("ta_password");
    setPassWord(passWord);
    return passWord;
  };

  const getSchool = async () => {
    const school = await SecureStorage.load("school_name");
    setSchool(school);
    return school;
  };

  useEffect(() => {
    getUser();
    getPass();
    getSchool();
  }, []);

  const handleNotificationToggle = async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationsEnabled(value);
    // TODO: figure out notifications
  };

  const quickLinks = [
    {
      title: "TeachAssist Website",
      url: `https://ta.yrdsb.ca/live/index.php?username=${userName}&password=${passWord}&submit=Login`,
      icon: "🍎",
    },
    { title: "My Blueprint", url: "https://app.myblueprint.ca/", icon: "📃" },
    {
      title: "Brightspace / D2L",
      url: "https://yrdsb.elearningontario.ca/d2l/login?&target=%2fd2l%2fhome",
      icon: "💡",
    },
    {
      title: "Google Classroom",
      url: "https://classroom.google.com/h",
      icon: "🏫",
    },
  ];

  const promptLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          handleLogout();
          Alert.alert("You've been sucessfully signed out.");
        },
      },
    ]);
  };

  const handleLogout = async () => {
    // delete everything
    await SecureStorage.delete("ta_username");
    await SecureStorage.delete("ta_password");
    await SecureStorage.delete("ta_student_id");
    await SecureStorage.delete("ta_session_token");
    await SecureStorage.delete("ta_courses");
    await SecureStorage.delete("grade_previous_average");
    await SecureStorage.delete("grade_last-updated");
    console.log("Logged out successfully. All session data cleared.");
    router.replace("/");
  };
  return (
    <View className="flex-1 bg-2">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-5xl font-semibold text-appwhite mt-18 mx-5 mb-5">
          Settings
        </Text>
        {/* hero */}
        <ImageBackground
          source={require("../../assets/images/mountain-background.webp")}
          className="w-full px-5 py-16 flex justify-center items-center overflow-hidden rounded-xl"
        >
          <View className="bg-baccent/25 backdrop-blur-sm flex items-center py-9 px-15 rounded-2xl border border-white/10">
            <Image
              source={require("../../assets/images/catalina.png")}
              className="w-32 h-32 rounded-2xl mb-4 border-2 border-white/20"
            />
            <Text className="text-3xl font-bold text-appwhite mb-1">
              {userName}
            </Text>
            <Text className="text-appwhite text-lg text-center">{school}</Text>
          </View>
        </ImageBackground>

        <View className="mx-5 mt-6">
          {/* links and stuff */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-appwhite mb-4">
              Quick Actions
            </Text>
            <View className="flex-row flex-wrap -mx-2">
              {quickLinks.map((link, index) => (
                <View key={index} className="w-1/2 px-2 mb-4">
                  <TouchableOpacity
                    className="bg-baccent/20 rounded-xl p-4 items-center border border-baccent/30"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      Linking.openURL(link.url);
                    }}
                  >
                    <Text className="text-3xl mb-2">{link.icon}</Text>
                    <Text className="text-appwhite font-semibold text-center text-sm">
                      {link.title}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* settings */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-appwhite mb-4">
              General
            </Text>

            {/* notifs */}
            <View className="bg-3 rounded-xl p-4 mb-3 border border-slate-600/50">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-appwhite text-lg font-semibold">
                    Push Notifications (coming soon)
                  </Text>
                  <Text className="text-appwhite/60 text-sm mt-1">
                    Keep up to date on your latest grades
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: "#374151", true: "#10B981" }}
                  thumbColor={notificationsEnabled ? "#FFFFFF" : "#9CA3AF"}
                />
              </View>
            </View>

            {/* theme */}
            <TouchableOpacity
              className="bg-3 rounded-xl p-4 mb-3 border border-slate-600/50"
              disabled={true}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                //TODO: LIGHT THEME
              }}
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-appwhite text-lg font-semibold">
                    Appearance (coming soon)
                  </Text>
                  <Text className="text-appwhite/60 text-sm mt-1">
                    Dark Theme
                  </Text>
                </View>
                <Text className="text-baccent text-2xl">🌑</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* help */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-appwhite mb-4">
              Support
            </Text>

            <TouchableOpacity
              className="bg-3 rounded-xl p-4 mb-3 border border-slate-600/50"
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                Linking.openURL("https://forms.gle/3g7D72cFJUYYH9Fh8");
              }}
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-appwhite text-lg font-semibold">
                    Get Support and Send Feedback
                  </Text>
                  <Text className="text-appwhite/60 text-sm mt-1">
                    Help improve the app
                  </Text>
                </View>
                <Text className="text-baccent text-2xl">💬</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* boring stuff */}
          <View className="mb-15">
            <Text className="text-2xl font-bold text-appwhite mb-4">
              More Options
            </Text>

            <View className="flex flex-row">
              <Link
                href="https://prmntr.com/teachassist/privacy"
                className="text-gray-300 mr-2 underline"
              >
                Privacy Policy
              </Link>
              <Link
                href="https://prmntr.com/teachassist/tos"
                className="text-gray-300 mr-2 underline"
              >
                Terms of Service
              </Link>
              <Link
                href="https://github.com/prmntr/teachassist"
                className="text-gray-300 mr-2 underline"
              >
                Source Code
              </Link>
              <Link href="/credits" className="text-gray-300 underline">
                Credits
              </Link>
            </View>
          </View>

          {/* logout button */}
          <TouchableOpacity
            onPress={promptLogout}
            className="bg-red-500/20 border-red-500/30 border rounded-xl p-4 mb-6"
          >
            <View className="flex-row justify-center items-center">
              <Text className="text-red-400 text-xl font-bold mr-2">
                Log Out
              </Text>
            </View>
          </TouchableOpacity>

          {/* footer */}
          <View className="mb-8 mt-5">
            <View className="items-center">
              <TouchableOpacity
                className="bg-3 rounded-xl p-1 mb-3 border border-slate-600/50"
                onPress={() => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  Linking.openURL("https://prmntr.com/teachassist");
                }}
              >
                <Image
                  source={require("../../assets/images/transparent_playstore.png")}
                  className="w-15 h-15"
                />
              </TouchableOpacity>
              <Text className="text-appwhite font-bold text-lg">
                TeachAssist
              </Text>
              <Text className="text-appwhite/60 text-sm mb-2">
                {appVersion}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  Linking.openURL("https://prmntr.com");
                }}
              >
                <Text className="text-appwhite/40 text-sm text-center underline">
                  Made by .prmntr 🧑‍🎓
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
