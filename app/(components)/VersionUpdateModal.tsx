import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import {
  Image,
  Linking,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { hapticsImpact } from "../(utils)/haptics";
import type { VersionUpdateMode } from "../(utils)/versionCheck";
import { appVersionNumber } from "../(utils)/appVersion";

interface VersionUpdateModalProps {
  visible: boolean;
  mode: VersionUpdateMode;
  latestVersion?: string | null;
  minimumVersion?: string | null;
  onClose?: () => void;
}

const VersionUpdateModal: React.FC<VersionUpdateModalProps> = ({
  visible,
  mode,
  latestVersion,
  minimumVersion,
  onClose,
}) => {
  const { isDark } = useTheme();
  const isRequired = mode === "required";
  const resolvedLatest = latestVersion ?? "a newer version";
  const updateTitle = isRequired ? "Update required." : "Update available!";
  const updateMessage = useMemo(() => {
    if (isRequired) {
      return `This version is no longer supported. Please update to continue.`;
    }
    return `A newer version (v${resolvedLatest}) is available. Update for the best experience.`;
  }, [isRequired, resolvedLatest]);

  const openStore = () => {
    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
    Linking.openURL("market://details?id=com.prmntr.teachassist").catch(() => {
      Linking.openURL(
        "https://play.google.com/store/apps/details?id=com.prmntr.teachassist",
      );
    });
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={isRequired ? () => {} : onClose}
    >
      <View className={`flex-1 bg-black/60 justify-center items-center px-5`}>
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-2xl w-full max-w-lg overflow-hidden`}
        >
          <View className={`px-6 pt-8 pb-5`}>
            <View className={`flex-row items-center justify-between`}>
              <View className={`flex-1 pr-4`}>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-semibold`}
                >
                  {updateTitle}
                </Text>
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-base mt-2`}
                >
                  {updateMessage}
                </Text>
              </View>
              <View className={`bg-baccent/80 p-3 rounded-full`}>
                <Image
                  className={`w-8 h-8`}
                  style={{
                    tintColor: "#fafafa",
                  }}
                  source={require("../../assets/images/update.png")}
                />
              </View>
            </View>
          </View>

          <View className={`px-6 pb-2 mt-1`}>
            <TouchableOpacity
              className={`${isDark ? "bg-baccent/90" : "bg-baccent"} rounded-xl py-3 px-6 items-center`}
              onPress={openStore}
            >
              <Text className={`text-white text-lg font-semibold`}>
                Update now
              </Text>
            </TouchableOpacity>
            {!isRequired ? (
              <TouchableOpacity
                className={`mt-3 rounded-xl py-1 px-6 items-center`}
                onPress={() => {
                  if (!onClose) return;
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
              >
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-base`}
                >
                  Maybe later
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {!isRequired && minimumVersion ? (
            <Text
              className={`${isDark ? "text-appwhite/20" : "text-appgraydark"} text-xs mx-3 mb-3 mt-4`}
            >
              The minimum supported version is {minimumVersion}.{`\nYou're`} on
              version {appVersionNumber}.
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

export default VersionUpdateModal;
