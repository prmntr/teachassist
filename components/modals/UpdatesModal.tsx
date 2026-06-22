import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Image, Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { SecureStorage } from "@/app/(auth)/taauth";
import { appVersionLabel } from "@/utils/appVersion";
import { hapticsImpact } from "@/utils/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";

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
        title: "Themes and Fonts!",
        description:
          "Customize the appearance of the teachassist app in settings.",
      },
      {
        type: "new",
        title: "Grade Updates",
        description: "See a list of detected changes to your courses.",
      },
      {
        type: "new",
        title: "Grade Exporting",
        description: "Export your grades as a image or through a secure link.",
      },
      {
        type: "new",
        title: "Teacher Search",
        description:
          "View teacher qualifications, certificates, degrees, and more.",
      },
      {
        type: "new",
        title: "Virtual ID",
        description: "Store your student ID securely on your phone.",
      },
      {
        type: "new",
        title: "Liquid Glass",
        description:
          "Experience liquid glass on compatible iOS and iPadOS devices; now in testing.",
      },
      {
        type: "improved",
        title: "App Design Cleanup",
        description: "Improved the design of various aspects of the app.",
      },
      {
        type: "fixed",
        title: "General bug fixes",
        description: "Stamped out some nasty bugs in the teachassist app.",
      },
      {
        type: "new",
        title: "5000+ users",
        description: (
          <Link href={rewardUrl as any} className={`my-2 underline`}>
            <Text>tysm for using the app ꒰｡•◡•｡꒱ 🩵</Text>
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
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className={`flex-1 bg-black/50 justify-center items-center px-5`}>
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-2xl w-full max-w-lg overflow-hidden`}
          style={{ minHeight: "70%" }}
        >
          <View className={`px-6 pt-8 pb-5`}>
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
                        className={`${getUpdateColor(update.type)} rounded-xl px-2 py-1`}
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
            <View className="my-3"></View>
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
                        <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-center font-light text-md mb-8`}
            >
              As always, thank you for using TeachAssist.
            </Text>
            */}
          </ScrollView>

          {/* active:bg-baccent*/}
          <View
            className={`px-6 ${isDark ? "bg-dark3" : "bg-light3"} py-4 mb-1`}
          >
            <TouchableOpacity
              className={`${isDark ? "bg-baccent/80" : "bg-baccent"} rounded-xl py-3 px-6 items-center`}
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                onClose();
              }}
            >
              <Text
                className={`${isDark ? "text-appblack" : "text-appwhite"} text-xl font-semibold`}
              >
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UpdatesModal;
