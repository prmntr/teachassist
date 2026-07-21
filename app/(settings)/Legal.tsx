import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { hapticsNotification } from "@/utils/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";

const LegalScreen = () => {
  const router = useRouter();
  const { isDark, activeTone } = useTheme();

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/profile" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
      >
        <Text
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          Legal
        </Text>
        <Text
          className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          See policies, source code, and teachassist credits.
        </Text>

        <View className="mt-6">
          <LiquidGlassView
            className=" rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            {[
              {
                title: "Privacy Policy",
                href: "https://prmntr.com/teachassist/privacy",
                kind: "external",
              },
              {
                title: "Terms of Service",
                href: "https://prmntr.com/teachassist/tos",
                kind: "external",
              },
              {
                title: "Source Code",
                href: "https://github.com/prmntr/teachassist",
                kind: "external",
              },
              { title: "Credits!", href: "/credits", kind: "internal" },
            ].map((item, index) => (
              <View key={item.title}>
                <TouchableOpacity
                  className="px-4 py-4"
                  onPress={() => {
                    hapticsNotification(
                      Haptics.NotificationFeedbackType.Success,
                    );
                    if (item.kind === "internal") {
                      router.push(item.href as any);
                    } else {
                      Linking.openURL(item.href);
                    }
                  }}
                >
                  <View className="justify-center">
                    <View className="flex-row items-center">
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"}`}
                      >
                        {item.title}
                      </Text>
                      {item.kind === "external" && (
                        <Image
                          source={require("../../assets/images/external-link.png")}
                          style={{ tintColor: activeTone.accent }}
                          className="w-5 h-5 ml-2"
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                {index < 3 ? (
                  <View
                    className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
                  />
                ) : null}
              </View>
            ))}
          </LiquidGlassView>
        </View>
      </ScrollView>
    </View>
  );
};

export default LegalScreen;
