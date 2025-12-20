import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SecureStorage } from "../(auth)/taauth";
import { SnowEffect } from "../(components)/SnowEffect";
import UpdatesModal from "../(components)/UpdatesModal";
import { useTheme } from "../contexts/ThemeContext";

const ProfileScreen = () => {
  const router = useRouter();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const appVersion = "v1.2.1"; //* update w/ app.json

  const { theme, toggleTheme, isDark } = useTheme();

  const [userName, setUserName] = useState<string | null>(null);
  const [passWord, setPassWord] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [showUpdates, setShowUpdates] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 11, 20); // Dec 20
  const end = new Date(
    year + (now.getMonth() === 0 ? -1 : 0),
    0,
    5,
    23,
    59,
    59,
    999
  ); // Jan 5

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

  const getImage = async () => {
    const savedImage = await SecureStorage.load("profile_image");
    setImage(savedImage);
    return savedImage;
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library :))))
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);
      await SecureStorage.save("profile_image", imageUri);
    }
  };

  const resetImage = async () => {
    await SecureStorage.delete("profile_image");
    setImage(null); // use default
  };

  useEffect(() => {
    getUser();
    getPass();
    getSchool();
    getImage();
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
      icon: require("../../assets/images/teachassist.webp"),
    },
    {
      title: "My Blueprint",
      url: "https://app.myblueprint.ca/",
      icon: require("../../assets/images/blueprint.webp"),
    },
    {
      title: "Brightspace / D2L",
      url: "https://yrdsb.elearningontario.ca/d2l/login",
      icon: require("../../assets/images/brightspace.webp"),
    },
    {
      title: "Google Classroom",
      url: "market://details?id=com.google.android.apps.classroom", // android exclusive if youre porting to ios modify this
      icon: require("../../assets/images/CoursesIcon.png"),
    },
  ];

  const promptLogout = async () => {
    Alert.alert(
      "Are you Sure?",
      "All saved information will be cleared after logging out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleLogout();
            Alert.alert("You've been sucessfully signed out.");
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    // delete everything
    await SecureStorage.delete("ta_username");
    await SecureStorage.delete("ta_password");
    await SecureStorage.delete("ta_student_id");
    await SecureStorage.delete("ta_session_token");
    await SecureStorage.delete("ta_courses");
    await SecureStorage.delete("school_name");
    await SecureStorage.delete("grade_previous_average");
    await SecureStorage.delete("grade_last_known_average");
    await SecureStorage.delete("grade_last_updated");
    await SecureStorage.delete("ta_appointments");
    await SecureStorage.delete("profile_image");
    await SecureStorage.delete("reason_mapping");
    await AsyncStorage.removeItem("theme");
    console.log("Logged out successfully. All session data cleared.");
    router.replace("/");
  };
  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      {(now >= start && now <= new Date(year, 11, 31, 23, 59, 59, 999)) ||
      (now.getMonth() === 0 && now <= end) ? (
        <SnowEffect count={37} speed={1.1} drift={26} />
      ) : (
        <></>
      )}
      <UpdatesModal
        visible={showUpdates}
        onClose={() => setShowUpdates(false)}
        version={appVersion.replace(/^v/, "")}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text
          className={`text-5xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"} mt-18 mx-5 mb-5`}
        >
          Settings
        </Text>
        {/* hero */}
        <ImageBackground
          source={
            isDark
              ? require("../../assets/images/mountain-background.webp")
              : require("../../assets/images/mountain-background-light.webp")
          }
          className={`w-full px-5 py-16 flex justify-center items-center overflow-hidden rounded-xl`}
        >
          <View className="absolute top-3 right-3 flex-row">
            <TouchableOpacity
              className={`rounded-lg p-2 items-center bg-baccent/60 shadow-md mr-2`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                pickImage();
              }}
            >
              <Image
                className={`w-5 h-5`}
                style={{ tintColor: "#edebea" }}
                source={require("../../assets/images/pencil.png")}
              />
            </TouchableOpacity>
            <TouchableOpacity
              className={`rounded-lg p-2 items-center bg-danger/60 shadow-md`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                resetImage();
              }}
            >
              <Image
                className={`w-5 h-5`}
                style={{ tintColor: "#edebea" }}
                source={require("../../assets/images/trash-bin.png")}
              />
            </TouchableOpacity>
          </View>
          <View className={` flex items-center py-9 px-15 rounded-2xl`}>
            <Image
              source={
                image
                  ? { uri: image }
                  : isDark
                    ? require("../../assets/images/tahoe.webp")
                    : require("../../assets/images/elcapitan.webp")
              }
              className={`w-32 h-32 rounded-2xl mb-4 border-2 border-white/20`}
            />
            <Text
              className={`text-3xl font-bold ${isDark ? "text-appwhite" : "text-appblack"}`}
            >
              {userName ?? "000000000"}
            </Text>
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg text-center`}
            >
              {school ?? "Unknown School"}
            </Text>
            {school?.toLocaleLowerCase().includes("bayview") ? (
              <TouchableOpacity
                onPress={() => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  // ive only seen interior maps for bayview
                  if (school?.toLocaleLowerCase().includes("bayview")) {
                    Linking.openURL("https://www.bayviewstuco.ca/map");
                  } else {
                    Alert.alert(
                      "Your school does not currently have a school map. Make a support ticket if you have one!"
                    );
                  }
                }}
              >
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} p-1 px-2 mt-2 bg-baccent/50 rounded-lg text-sm text-center`}
                >
                  School Map
                </Text>
              </TouchableOpacity>
            ) : (
              <></>
            )}
            <TouchableOpacity
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                router.push("/VolunteerTracking");
              }}
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} p-1 px-2 mt-2 bg-success/50 rounded-lg text-sm text-center`}
              >
                My Volunteer Hours
              </Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View className={`mx-5 mt-6`}>
          {/* links and stuff */}
          <View className={`mb-6`}>
            <Text className={`text-2xl font-bold text-baccent mb-4`}>
              Quick Actions
            </Text>
            <View className={`flex-row flex-wrap -mx-2`}>
              {quickLinks.map((link, index) => (
                <View key={index} className={`w-1/2 px-2 mb-4`}>
                  <TouchableOpacity
                    className={`rounded-xl p-4 items-center ${isDark ? "bg-dark3" : "bg-light3"} shadow-md`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      Linking.openURL(link.url);
                    }}
                  >
                    <Image
                      className={`w-9 h-9 mb-2`}
                      style={{
                        tintColor: isDark ? "#94959c" : "#6d6e77",
                      }}
                      source={link.icon}
                    />
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-center text-sm`}
                    >
                      {link.title}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* settings */}
          <View className={`mb-6`}>
            <Text className={`text-2xl font-bold text-baccent mb-4`}>
              General
            </Text>

            {/* notifs */}
            <View
              className={`${isDark ? "bg-dark3" : "bg-light3"} shadow-md rounded-xl p-4 mb-3`}
            >
              <View className={`flex-row justify-between items-center`}>
                <View className={`flex-1`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold`}
                  >
                    Push Notifications (coming soon)
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1 font-light`}
                  >
                    Keep up to date on your latest grades
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${notificationsEnabled ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    handleNotificationToggle(!notificationsEnabled);
                  }}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${notificationsEnabled ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* theme */}
            <TouchableOpacity
              className={`${isDark ? "bg-dark3" : "bg-light3"} shadow-md rounded-xl p-4 mb-3`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                toggleTheme();
              }}
            >
              <View className={`flex-row justify-between items-center`}>
                <View>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold`}
                  >
                    Appearance
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1 font-light`}
                  >
                    {isDark ? "Dark Theme" : "Light Theme"}
                  </Text>
                </View>
                <Image
                  className={`w-7 h-7`}
                  style={{
                    tintColor: isDark ? "#94959c" : "#6d6e77",
                  }}
                  source={
                    isDark
                      ? require("../../assets/images/moon-fill.webp")
                      : require("../../assets/images/sun-fill.webp")
                  }
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* help */}
          <View className={`mb-6`}>
            <Text className={`text-2xl font-bold text-baccent mb-4`}>
              Support
            </Text>

            <TouchableOpacity
              className={`${isDark ? "bg-dark3" : "bg-light3"} shadow-md rounded-xl p-4 mb-3`}
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                Linking.openURL("https://forms.gle/3g7D72cFJUYYH9Fh8");
              }}
            >
              <View className={`flex-row justify-between items-center`}>
                <View>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold`}
                  >
                    Get Support and Send Feedback
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1 font-light`}
                  >
                    Help improve the app
                  </Text>
                </View>
                <Image
                  className={`w-7 h-7`}
                  style={{
                    tintColor: isDark ? "#94959c" : "#6d6e77",
                  }}
                  source={require("../../assets/images/info-square-fill.webp")}
                />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              className={`${isDark ? "bg-dark3" : "bg-light3"} shadow-md rounded-xl p-4 mb-3`}
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                setShowUpdates(true);
              }}
            >
              <View className={`flex-row justify-between items-center`}>
                <View>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold`}
                  >
                    Update Log
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1 font-light`}
                  >
                    {`See what's new in TeachAssist`}
                  </Text>
                </View>
                <Image
                  className={`w-7 h-7`}
                  style={{
                    tintColor: isDark ? "#94959c" : "#6d6e77",
                  }}
                  source={require("../../assets/images/refresh.png")}
                />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              className={`${isDark ? "bg-dark3" : "bg-light3"} shadow-md rounded-xl p-4 mb-3`}
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                Linking.openURL("market://details?id=com.prmntr.teachassist");
              }}
            >
              <View className={`flex-row justify-between items-center`}>
                <View>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold`}
                  >
                    Leave a Review
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1 font-light`}
                  >
                    Leave a review for TeachAssist
                  </Text>
                </View>
                <Image
                  className={`w-7 h-7`}
                  style={{
                    tintColor: isDark ? "#94959c" : "#6d6e77",
                  }}
                  source={require("../../assets/images/google-play.webp")}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* boring stuff */}
          <View className={`mb-15`}>
            <Text className={`text-2xl font-bold text-baccent mb-4`}>
              More Options
            </Text>

            <View className={`flex flex-row`}>
              <Link
                href="https://prmntr.com/teachassist/privacy"
                className={`${isDark ? "text-appwhite" : "text-appblack"} mr-2 underline`}
              >
                Privacy Policy
              </Link>
              <Link
                href="https://prmntr.com/teachassist/tos"
                className={`${isDark ? "text-appwhite" : "text-appblack"} mr-2 underline`}
              >
                Terms of Service
              </Link>
              <Link
                href="https://github.com/prmntr/teachassist"
                className={`${isDark ? "text-appwhite" : "text-appblack"} mr-2 underline`}
              >
                Source Code
              </Link>
              <Link
                href="/credits"
                className={`${isDark ? "text-appwhite" : "text-appblack"} underline`}
              >
                Credits
              </Link>
            </View>
          </View>

          {/* logout button */}
          <TouchableOpacity
            onPress={() => {
              promptLogout();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }}
            className={`bg-danger rounded-xl p-4 mb-6 shadow-md`}
          >
            <View className={`flex-row justify-center items-center`}>
              <Text className={`text-appwhite text-xl font-bold mr-2`}>
                Log Out
              </Text>
            </View>
          </TouchableOpacity>

          {/* footer */}
          <View className={`mb-8 mt-5`}>
            <View className={`items-center`}>
              <View className="shadow-md">
                <TouchableOpacity
                  className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-1 mb-3`}
                  onPress={() => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    );
                    Linking.openURL("https://prmntr.com/teachassist");
                  }}
                >
                  <Image
                    source={
                      isDark
                        ? require("../../assets/images/teach-icon-transparent.png")
                        : require("../../assets/images/teach-icon-transparent-light.png")
                    }
                    className={`w-16 h-14 my-1`}
                  />
                </TouchableOpacity>
              </View>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} font-bold text-lg`}
              >
                TeachAssist
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mb-2`}
              >
                {appVersion}
              </Text>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    );
                    Linking.openURL("https://prmntr.com/teachassist");
                  }}
                >
                  <Image
                    source={require("../../assets/images/link.png")}
                    className={`w-6 h-6 my-1 mr-3`}
                    style={{ tintColor: "#27b1fa" }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    );
                    Linking.openURL("https://www.instagram.com/teach.assist/");
                  }}
                >
                  <Image
                    source={require("../../assets/images/instagram.png")}
                    className={`w-6 h-6 my-1`}
                    style={{ tintColor: "#27b1fa" }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
