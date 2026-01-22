import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import BackButton from "../(components)/Back";
import { useTheme } from "../contexts/ThemeContext";
import { hapticsImpact } from "../(utils)/haptics";

// Some messages to show the user, no meaningful impact

const Onboarding = () => {
  const router = useRouter();
  const { isDark } = useTheme();

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <BackButton path={"/"} />
      <View className={`flex-1 items-center justify-center mr-3`}>
        <Text
          className={`text-4xl font-bold ${isDark ? "text-appwhite" : "text-appblack"} mb-10`}
        >
          About the App
        </Text>
        <View className={`px-10`}>
          <Text className={`text-baccent text-3xl font-bold mb-6`}>
            Privacy First {"\n"}
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-normal`}
            >
              None of your information is, and will never be, shared with 3rd
              parties.
            </Text>
          </Text>
          <Text className={`text-baccent text-3xl font-bold mb-6`}>
            Transparent and Open {"\n"}
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-normal`}
            >
              TeachAssist is open-source and publicly auditable on{" "}
              <Link
                href="https://github.com/prmntr/teachassist"
                className={`underline`}
              >
                GitHub
              </Link>
              .
            </Text>
          </Text>
          <Text className={`text-baccent text-3xl font-bold mb-6`}>
            Responsive Support {"\n"}
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-normal`}
            >
              TeachAssist is still in development, any feedback is greatly
              appreciated!
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            router.replace("/signin");
          }}
        >
          <View
            className={`bg-baccent/85 px-5 py-3 rounded-xl shadow-lg flex-row items-center mt-5`}
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-3xl mr-2`}
            >
              Got it
            </Text>
            <Image
              className={`w-8 h-8`}
              tintColor={isDark ? "#fafafa" : "#2f3035"}
              source={require("../../assets/images/arrow-icon.png")}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default Onboarding;
