import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Image } from "react-native";
import { hapticsImpact } from "@/utils/haptics";
import { useLiquidGlassActive } from "@/utils/liquidGlass";
import { useTheme } from "@/contexts/ThemeContext";
import LiquidGlassButton from "./LiquidGlassButton";

interface BackProps {
  path: string;
}
const BackButton: React.FC<BackProps> = ({ path }) => {
  const router = useRouter();
  const { activeTone, isDark } = useTheme();
  const liquidGlassEnabled = useLiquidGlassActive();

  const contentStyle = liquidGlassEnabled
    ? {
        width: 48,
        height: 48,
        borderRadius: 999,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      }
    : {
        borderRadius: 12,
        paddingHorizontal: 9,
        paddingVertical: 10,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      };

  return (
    <LiquidGlassButton
      containerStyle={{
        position: "absolute",
        top: 60,
        left: 20,
        zIndex: 50,
      }}
      contentStyle={contentStyle}
      glassTintColor={activeTone.bg4}
      fallbackBackgroundColor={activeTone.bg4}
      onPress={() => {
        hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
        const canGoBack =
          typeof router.canGoBack === "function" && router.canGoBack();
        if (canGoBack) {
          router.back();
          return;
        }
        router.replace(path as any);
      }}
    >
      <Image
        source={require("../../assets/images/back-arrow.png")}
        className={liquidGlassEnabled ? "w-6 h-6" : "w-6 h-6 mr-1"}
        style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
      />
    </LiquidGlassButton>
  );
};
export default BackButton;
