import * as Haptics from "expo-haptics";
import { Image, Modal, TouchableOpacity, View } from "react-native";
import { hapticsImpact } from "@/utils/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";

interface FoolsModalProps {
  visible: boolean;
  onClose: () => void;
}

const FoolsModal: React.FC<FoolsModalProps> = ({ visible, onClose }) => {
  const { isDark } = useTheme();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-center items-center px-5">
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-2xl w-full max-w-lg overflow-hidden`}
        >
          <View className="px-6 pt-8 pb-5">
            <View className="bg-baccent/80 p-5 rounded-full justify-center items-center self-center">
              <Image
                className="w-18 h-18 pr-9"
                style={{ tintColor: "#fafafa" }}
                source={require("../../assets/images/sparkle.png")}
              />
            </View>
            <View className="flex-row items-center justify-between pt-5">
              <View className="flex-1 pr-4">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-semibold text-center`}
                >
                  a new direction
                </Text>
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-base mt-2`}
                >
                  in honor of the invention of burgers and mustard, small
                  changes have been made to the teachassist app for a limited
                  time
                  {`\n\n`}
                  check them out in the settings panel
                </Text>
              </View>
            </View>
          </View>

          <View className="px-6 pb-6">
            <TouchableOpacity
              className={`${isDark ? "bg-baccent/85" : "bg-baccent"} rounded-xl py-3 px-6 items-center`}
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                onClose();
              }}
            >
              <Text
                className={`${isDark ? "text-appblack" : "text-appwhite"} text-lg font-semibold`}
              >
                Embrace
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default FoolsModal;
