import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BackButton from "../(components)/Back";
import { useTheme } from "../contexts/ThemeContext";
import { hapticsImpact } from "../(utils)/haptics";

const styles = StyleSheet.create({
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
});

const HIGHLIGHTS = [
  {
    title: "Grade tracking",
    body: "View current marks and performance across all your classes.",
    icon: require("../../assets/images/sparkle.png"),
  },
  {
    title: "Guidance booking",
    body: "Book, view, and cancel guidance appointments all in one place.",
    icon: require("../../assets/images/calendar-icon.png"),
  },
  {
    title: "Mark alerts",
    body: "Get notified when new marks are posted, updated, or hidden.",
    icon: require("../../assets/images/lightning.png"),
  },
  {
    title: "No snooping",
    body: "Your data stays between you, your phone, and TeachAssist. We're also open source.",
    icon: require("../../assets/images/privacy.png"),
  },
];

const Onboarding = () => {
  const router = useRouter();
  const { isDark } = useTheme();

  const wordmark = isDark
    ? require("../../assets/images/teachassist-wordmark.png")
    : require("../../assets/images/teachassist-wordmark-light.png");

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <LinearGradient
        colors={
          isDark
            ? ["rgba(8, 10, 14, 0.2)", "rgba(8, 10, 14, 0.96)"]
            : ["rgba(248, 250, 252, 0.2)", "rgba(248, 250, 252, 0.96)"]
        }
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <BackButton path={"/"} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className={`px-6 pt-24 pb-10`}>
          <View className={`items-center`}>
            <Image
              source={wordmark}
              className={`w-56 h-16 mt-7`}
              resizeMode="contain"
            />
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-bold mt-4`}
            >
              Welcome to TeachAssist
            </Text>
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-light text-center mt-0`}
            >
              Everything you need to stay on top of marks.
            </Text>
          </View>
          <View className={`mt-8`}>
            {HIGHLIGHTS.map((item) => (
              <View
                key={item.title}
                className={`${isDark ? "bg-dark3/75" : "bg-light3/85"} rounded-2xl px-4 py-4 flex-row items-start mb-4`}
              >
                <View
                  className={`w-12 h-12 rounded-full bg-[#27b1fa]/70 items-center justify-center mr-4 mt-3`}
                >
                  <Image
                    source={item.icon}
                    className={`w-7 h-7`}
                    style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
                  />
                </View>
                <View className={`flex-1`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold`}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm font-light mt-1`}
                  >
                    {item.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity
            className={`mt-8`}
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              router.push("/signin");
            }}
          >
            <View
              className={`bg-baccent/80 px-5 py-3 rounded-xl shadow-lg flex-row items-center justify-center`}
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-3xl mr-2`}
              >
                Continue
              </Text>
              <Image
                className={`w-8 h-8`}
                tintColor={isDark ? "#fafafa" : "#2f3035"}
                source={require("../../assets/images/arrow-icon.png")}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
export default Onboarding;
