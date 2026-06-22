import { Switch, TouchableOpacity, View } from "react-native";
import { useLiquidGlassActive } from "@/utils/liquidGlass";
import { useTheme } from "@/contexts/ThemeContext";

interface AppToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const AppToggle = ({ value, onValueChange, disabled }: AppToggleProps) => {
  const liquidGlass = useLiquidGlassActive();
  const { isDark, activeTone } = useTheme();

  if (liquidGlass) {
    return (
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: activeTone.bg4, true: activeTone.accent }}
        ios_backgroundColor={activeTone.bg4}
      />
    );
  }

  return (
    <TouchableOpacity
      className={`w-13 h-8 rounded-full ${value ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
    >
      <View
        className={`w-6 h-6 rounded-full bg-white ${value ? "ml-6" : "ml-0.5"}`}
      />
    </TouchableOpacity>
  );
};

export default AppToggle;
