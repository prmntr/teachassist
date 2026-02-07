import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SecureStorage } from "../(auth)/taauth";
import { hapticsImpact } from "../(utils)/haptics";
import { appVersionLabel } from "../(utils)/appVersion";
import { useTheme } from "../contexts/ThemeContext";

interface UpdateItem {
  type: "new" | "improved" | "fixed";
  title: string;
  description: string | ReactNode;
}

interface UpdatesModalProps {
  visible: boolean;
  onClose: () => void;
  version?: string;
  updates?: UpdateItem[];
  username?: string | null;
}

const UpdatesModal: React.FC<UpdatesModalProps> = ({
  visible,
  onClose,
  version = appVersionLabel,
  updates,
  username,
}) => {
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(
    username ?? null,
  );

  useEffect(() => {
    if (username) {
      setResolvedUsername(username);
      return;
    }

    let isMounted = true;
    SecureStorage.load("ta_username")
      .then((value) => {
        if (isMounted) setResolvedUsername(value);
      })
      .catch(() => {
        if (isMounted) setResolvedUsername(null);
      });
    return () => {
      isMounted = false;
    };
  }, [username]);

  const rewardUser = (resolvedUsername ?? "").trim() || "user";
  const rewardUrl = `https://prmntr.com/teachassist/reward/${encodeURIComponent(
    rewardUser,
  )}`;

  const resolvedUpdates =
    updates ??
    ([
      {
        type: "new",
        title: "Notifications",
        description:
          "Get notified for released assignments, guidance appointments, and more!",
      },
      {
        type: "new",
        title: "Midterm and Final Grades",
        description: "View your midterm and final marks from the courses tab",
      },
      {
        type: "improved",
        title: "Revamped Analytics and Courses",
        description: "See past numerical averages,\nplus a cleaned up design",
      },
      {
        type: "new",
        title: "Hidden Grade Viewing",
        description:
          "See grades your teacher has hidden, indicated by a yellow circle",
      },
      {
        type: "new",
        title: "Landscape Support",
        description:
          "Rotate your phone or tablet in landscape to see the effect!",
      },
      {
        type: "new",
        title: "Settings Overhaul",
        description:
          "New privacy settings to control grade visibility, plus greeting messages",
      },
      {
        type: "fixed",
        title: "App Signin Issues",
        description:
          "Fixed a bug with how the app deals with tapping into courses",
      },
      {
        type: "fixed",
        title: "Bug fixes",
        description:
          "General stability improvments to reduce unexpected errors",
      },
      {
        type: "new",
        title: "2000+ users",
        description: (
          <Link href={rewardUrl as any} className={`my-2 underline`}>
            <Text>tysm for using the app (⁠◍⁠•⁠ᴗ⁠•⁠◍⁠)⁠❤</Text>
          </Link>
        ),
      },
    ] satisfies UpdateItem[]);
  const updateIcons: Record<"new" | "improved" | "fixed", any> = {
    new: require("../../assets/images/sparkle.png"),
    improved: require("../../assets/images/lightning.png"),
    fixed: require("../../assets/images/wrench.png"),
  };

  const getUpdateIcon = (type: "new" | "improved" | "fixed") => {
    return updateIcons[type] || require("../../assets/images/update.png");
  };

  const getUpdateColor = (type: "new" | "improved" | "fixed") => {
    switch (type) {
      case "new":
        return "bg-success/60";
      case "improved":
        return "bg-baccent/60";
      case "fixed":
        return "bg-caution/60";
      default:
        return "bg-gray-400/60";
    }
  };

  const { isDark } = useTheme();

  // chat jippity
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className={`flex-1 bg-black/50 justify-center items-center px-5`}>
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-2xl w-full max-w-lg overflow-hidden`}
          style={{ minHeight: "70%" }}
        >
          <View
            className={`bg-gradient-to-l from-blue-500 to-purple-600 px-6 pt-8 pb-5`}
          >
            <View className={`flex-row items-center justify-between`}>
              <View className={`flex-1`}>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-semibold`}
                >
                  You{`'`}re on version{" "}
                  <Text className={`text-baccent text-2xl font-bold`}>
                    {version}
                  </Text>
                  .
                </Text>
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-lg font-light`}
                >
                  Here{`'`}s what{`'`}s new this update.
                </Text>
              </View>
              <View className={`bg-baccent/80 p-3 rounded-full`}>
                <Image
                  className={`w-8 h-8`}
                  style={{
                    tintColor: "#fafafa",
                  }}
                  source={require("../../assets/images/confetti.png")}
                />
              </View>
            </View>
          </View>

          <ScrollView
            className={`flex-1 px-6 py-4`}
            showsVerticalScrollIndicator={false}
          >
            {resolvedUpdates.map((update, index) => (
              <View key={index} className={`mb-6 last:mb-2`}>
                <View className={`flex-row items-start mb-2`}>
                  <View className={`bg-baccent/80 mr-3 p-2 rounded-full`}>
                    <Image
                      className={`w-6 h-6`}
                      style={{
                        tintColor: "#fafafa",
                      }}
                      source={getUpdateIcon(update.type)}
                    />
                  </View>
                  <View className={`flex-1`}>
                    <View className={`flex-row items-center mb-1`}>
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold flex-1`}
                      >
                        {update.title}
                      </Text>
                      <View
                        className={`${getUpdateColor(update.type)} rounded-lg px-2 py-1`}
                      >
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm font-bold text-center`}
                        >
                          {update.type}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-base leading-6 mr-5`}
                    >
                      {update.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {/*
            <View className={`bg-gray-700/30 rounded-xl p-4 mb-4`}>
              <View className={`flex-row items-center mb-2`}>
                <Text className={`text-xl mr-2`}>💡</Text>
                <Text className={`text-white font-semibold text-lg`}>
                  Need Help?
                </Text>
              </View>
              <Text className={`text-gray-300 text-base leading-6`}>
                If you encounter any issues or have feedback, please reach out
                through the app settings or contact support.
              </Text>
            </View>
            */}
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-center font-light text-md mb-8`}
            >
              As always, thank you for using TeachAssist.
            </Text>
          </ScrollView>

          {/* active:bg-baccent*/}
          <View className={`px-6 ${isDark ? "bg-dark3" : "bg-light3"} py-4`}>
            <TouchableOpacity
              className={`${isDark ? "bg-baccent/80" : "bg-baccent"} rounded-xl py-3 px-6 items-center`}
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                onClose();
              }}
            >
              <Text className={`text-white text-xl font-semibold`}>
                Got it!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UpdatesModal;
