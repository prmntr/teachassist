import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Image, ScrollView, View } from "react-native";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { hapticsImpact } from "@/utils/haptics";
import { useTheme } from "@/contexts/ThemeContext";

const HIGHLIGHTS = [
  {
    title: "Grade tracking",
    body: "View current marks and performance across all your classes.",
    icon: require("../../assets/images/bar-chart.png"),
  },
  {
    title: "Guidance booking",
    body: "Book, view, and cancel guidance appointments all in one place.",
    icon: require("../../assets/images/calendar-icon.png"),
  },
  {
    title: "Mark alerts",
    body: "Get notified when new marks are posted, updated, or hidden.",
    icon: require("../../assets/images/bell.png"),
  },
  {
    title: "No snooping",
    body: "Your data stays yours, and yours only. Period.",
    icon: require("../../assets/images/privacy.png"),
  },
];

const Onboarding = () => {
  const router = useRouter();
  const { activeTone, isDark } = useTheme();

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path={"/"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
      >
        <View className={`px-6 pb-10`}>
          <Text
            className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
          >
            Welcome <Text className="text-baccent font-semibold">aboard!</Text>
          </Text>
          <Text
            className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
          >
            We&apos;re so excited to have you on.
          </Text>
          <View className={`mt-8`}>
            {HIGHLIGHTS.map((item) => (
              <LiquidGlassView
                key={item.title}
                className="mb-4"
                contentStyle={{
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                fallbackBackgroundColor={activeTone.bg3}
                glassTintColor={activeTone.bg2}
                glassEffectStyle="regular"
              >
                <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-baccent/70">
                  <Image
                    source={item.icon}
                    className={`w-7 h-7`}
                    style={{ tintColor: isDark ? "#edebea" : "#edebea" }}
                  />
                </View>
                <View className={`flex-1`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold`}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm mt-1`}
                  >
                    {item.body}
                  </Text>
                </View>
              </LiquidGlassView>
            ))}
          </View>
        </View>
      </ScrollView>
      <View className="px-6 pb-20">
        <LiquidGlassButton
          contentStyle={{
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
          glassTintColor={activeTone.accent}
          fallbackBackgroundColor={activeTone.accent}
          onPress={() => {
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            router.push("/Customization");
          }}
        >
          <Text
            className={`${isDark ? "text-appblack" : "text-appwhite"} font-semibold text-2xl mr-2`}
          >
            Continue
          </Text>
        </LiquidGlassButton>
      </View>
    </View>
  );
};
export default Onboarding;
