import * as Haptics from "expo-haptics";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
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
  version = "1.1.1",
  updates = [
    {
      type: "new",
      title: "Light Mode",
      description: "Added a light mode option\nalongside dark mode.",
    },
    {
      type: "new",
      title: "Course Editing",
      description:
        "You can now add and edit courses to preview grade outcomes.",
    },
    {
      type: "improved",
      title: "App Design",
      description:
        "Refined the color palette, icons, and layout for a cleaner look.",
    },
    {
      type: "fixed",
      title: "Bug Fixes",
      description: "Resolved guidance timeout issues and fixed bugs.",
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
          style={{ minHeight: "60%" }}
        >
          <View
            className={`bg-gradient-to-l from-blue-500 to-purple-600 px-6 py-8`}
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
                  <View className={`bg-baccent/50 rounded-lg p-2 mr-3 mt-1`}>
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
                          className={`${isDark ? "text-appwhite/80" : "text-appblack"} text-xs font-medium uppercase`}
                        >
                          {update.type}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-base leading-6`}
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
          <View className={`px-6 ${isDark ? "bg-dark3" : "bg-light3"} py-5`}>
            <TouchableOpacity
              className={`${isDark ? "bg-baccent/80" : "bg-baccent"} rounded-xl py-4 px-6 items-center`}
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
