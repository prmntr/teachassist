import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { Text, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { hapticsImpact } from "../(utils)/haptics";

const Sorry = () => {
  const { isDark } = useTheme();

  return (
    // i dont know why android keeps defaulting to this screen
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"} px-10`}>
      <View className={`flex-1 items-center justify-center`}>
        <Text
          className={`text-4xl font-bold ${isDark ? "text-appwhite" : "text-appblack"} mb-10 text-center`}
        >
          Parent Login
        </Text>
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl text-center mx-5`}
        >
          You should not be seeing this; file a support ticket.
        </Text>

        <Link
          href="/"
          className={`text-white font-semibold text-3xl bg-baccent/80 px-5 py-3 rounded-lg mt-10`}
          onPress={() => {
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          }}
        >
          Go Back
        </Link>
      </View>
    </View>
  );
};
export default Sorry;
