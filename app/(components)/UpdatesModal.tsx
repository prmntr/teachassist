import * as Haptics from "expo-haptics";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";

interface UpdateItem {
  type: "new" | "improved" | "fixed";
  title: string;
  description: string;
}

interface UpdatesModalProps {
  visible: boolean;
  onClose: () => void;
  version?: string;
  updates?: UpdateItem[];
}

const UpdatesModal: React.FC<UpdatesModalProps> = ({
  visible,
  onClose,
  version = "1.2.2",
  updates = [
    {
      type: "new",
      title: "Volunteer Tracking",
      description: "Input, track, and update your YRDSB volunteer hours.",
    },
    {
      type: "improved",
      title: "App Connectivity Issues",
      description:
        "Fixed bugs with the app not playing nice with internet connections",
    },
    {
      type: "fixed",
      title: "Bug fixes",
      description:
        "General bug fixes and speed improvments",
    },
    {
      type: "new",
      title: "2000+ users",
      description: (
        <Link
          href={`https://prmntr.com/teachassist/reward/user`}
          className={`my-2 underline`}
        >
          <Text>tysm for using the app ^w^</Text>
        </Link>
      ),
    },
  ],
}) => {
  const getUpdateIcon = (type: "new" | "improved" | "fixed") => {
    switch (type) {
      case "new":
        return "✨";
      case "improved":
        return "🚀";
      case "fixed":
        return "🔧";
      default:
        return "📱";
    }
  };

  const getUpdateColor = (type: "new" | "improved" | "fixed") => {
    switch (type) {
      case "new":
        return "bg-success";
      case "improved":
        return "bg-baccent";
      case "fixed":
        return "bg-caution";
      default:
        return "bg-gray-400";
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
              <View className={`bg-baccent/50 rounded-full p-3`}>
                <Text className={`text-3xl`}>🎉</Text>
              </View>
            </View>
          </View>

          <ScrollView
            className={`flex-1 px-6 py-4`}
            showsVerticalScrollIndicator={false}
          >
            {updates.map((update, index) => (
              <View key={index} className={`mb-6 last:mb-2`}>
                <View className={`flex-row items-start mb-2`}>
                  <View
                    className={`${isDark ? "bg-appgraydark/40" : "bg-appgraylight/40"} rounded-lg p-2 mr-3 mt-1`}
                  >
                    <Text className={`text-lg`}>
                      {getUpdateIcon(update.type)}
                    </Text>
                  </View>
                  <View className={`flex-1`}>
                    <View className={`flex-row items-center mb-1`}>
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold flex-1`}
                      >
                        {update.title}
                      </Text>
                      <View
                        className={`${getUpdateColor(update.type)} rounded-full px-3 py-1`}
                      >
                        <Text
                          className={`${isDark ? "text-appblack" : "text-appblack"} text-xs font-bold uppercase`}
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
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-center font-light text-md`}
            >
              As always, thank you for using TeachAssist.
            </Text>
          </ScrollView>

          {/* active:bg-baccent*/}
          <View className={`px-6 ${isDark ? "bg-dark3" : "bg-light3"} py-4`}>
            <TouchableOpacity
              className={`${isDark ? "bg-baccent/80" : "bg-baccent"} rounded-xl py-3 px-6 items-center`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
