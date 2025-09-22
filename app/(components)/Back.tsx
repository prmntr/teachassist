import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface BackProps {
  path: string;
}
const BackButton: React.FC<BackProps> = ({ path }) => {
  const router = useRouter();
  const { isDark } = useTheme();
  return (
    <TouchableOpacity
      className={`absolute top-15 left-5 flex flex-row items-center z-50 gap-2 ${isDark ? "bg-dark4" : "bg-light4"} rounded-lg px-4 py-2 shadow-md`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.replace(path as any);
      }}
    >
      <Image
        className={`w-7 h-7`}
        style={{
          tintColor: isDark ? "#edebea" : "#2f3035",
        }}
        source={require("../../assets/images/arrow-icon-left.png")}
      />
      <Text
        className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-xl`}
      >
        Back
      </Text>
    </TouchableOpacity>
  );
};
export default BackButton;
