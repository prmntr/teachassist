import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SecureStorage } from "../(auth)/taauth";
import { appVersionLabel } from "@/utils/appVersion";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import { openWriteReview } from "@/utils/storeReview";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import UpdatesModal from "@/components/modals/UpdatesModal";

const SupportScreen = () => {
  const router = useRouter();
  const { activeTone, isDark } = useTheme();
  const [showUpdates, setShowUpdates] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const storedUserName = await SecureStorage.load("ta_username");
      setUserName(storedUserName);
    };

    loadUser();
  }, []);

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/profile" />
      <UpdatesModal
        visible={showUpdates}
        onClose={() => setShowUpdates(false)}
        version={appVersionLabel}
        username={userName}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
      >
        <Text
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          Support
        </Text>
        <Text
          className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          Get help, leave feedback, and see what{`'`}s changed.
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
                title: "Get Support and Send Feedback",
                subtitle: "Help improve the TeachAssist app",
                icon: require("../../assets/images/support-icon.png"),
                kind: "external",
                action: () =>
                  Linking.openURL("https://forms.gle/3g7D72cFJUYYH9Fh8"),
              },
              {
                title: "Update Log",
                subtitle: "See what's new in the app",
                icon: require("../../assets/images/update.png"),
                kind: "internal",
                action: () => setShowUpdates(true),
              },
              {
                title: "TeachAssist Website",
                subtitle: "Visit the TeachAssist Website",
                icon: require("../../assets/images/link-chain.png"),
                kind: "external",
                action: () => Linking.openURL("https://prmntr.com/teachassist"),
              },
              {
                title: "Rate the App",
                subtitle: "Leave a review for teachassist 😋",
                icon: require("../../assets/images/star.png"),
                kind: "external",
                action: () => openWriteReview(),
              },
            ].map((item, index) => (
              <View key={item.title}>
                <TouchableOpacity
                  className="px-5 py-4"
                  onPress={() => {
                    hapticsNotification(
                      Haptics.NotificationFeedbackType.Success,
                    );
                    item.action();
                  }}
                >
                  <View className="flex-row items-center">
                    <View className="bg-baccent/80 mr-4 p-2 rounded-full">
                      <Image
                        className="w-6 h-6"
                        style={{ tintColor: "#fafafa" }}
                        source={item.icon}
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row">
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
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                      >
                        {item.subtitle}
                      </Text>
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
        <LiquidGlassView
          className="rounded-2xl overflow-hidden  mt-5"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View className="px-4 py-4 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
              >
                Looking for something else?
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  router.push("/Legal");
                }}
              >
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 mt-4`}
                >
                  Terms of Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LiquidGlassView>
      </ScrollView>
    </View>
  );
};

export default SupportScreen;
