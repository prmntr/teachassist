import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { type ComponentProps } from "react";
import { cssInterop } from "nativewind";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useLiquidGlassEnabled } from "@/utils/liquidGlass";
import { useTheme } from "@/contexts/ThemeContext";

cssInterop(GlassView, {
  className: "style",
});

export type LiquidGlassViewProps = Omit<
  ComponentProps<typeof View>,
  "style" | "className"
> & {
  className?: string;
  containerClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  glassTintColor?: string;
  fallbackBackgroundColor?: string;
  fallbackBorderColor?: string;
  glassEffectStyle?: ComponentProps<typeof GlassView>["glassEffectStyle"];
  interactive?: boolean;
};

const addGlassAlpha = (color: string) =>
  /^#[0-9a-f]{6}$/i.test(color) ? `${color}99` : color;

const LiquidGlassView = ({
  className,
  containerClassName,
  containerStyle,
  contentStyle,
  style,
  glassTintColor,
  fallbackBackgroundColor,
  fallbackBorderColor,
  glassEffectStyle = "clear",
  interactive = false,
  children,
  ...props
}: LiquidGlassViewProps) => {
  const { activeTone, isDark } = useTheme();
  const liquidGlassEnabled = useLiquidGlassEnabled();
  const glassAvailable = isLiquidGlassAvailable();
  const flattenedContentStyle = StyleSheet.flatten([style, contentStyle]) ?? {};
  const resolvedRadius =
    typeof flattenedContentStyle.borderRadius === "number"
      ? flattenedContentStyle.borderRadius
      : 24;
  const baseSurfaceStyle = [style, contentStyle];
  const resolvedSurfaceColor =
    (typeof flattenedContentStyle.backgroundColor === "string"
      ? flattenedContentStyle.backgroundColor
      : fallbackBackgroundColor ?? activeTone.bg4) ?? activeTone.bg4;
  const resolvedTintColor = addGlassAlpha(
    glassTintColor ??
      resolvedSurfaceColor,
  );
  const resolvedBorderColor = fallbackBorderColor ?? resolvedSurfaceColor;
  const fallbackStyle = {
    ...(fallbackBackgroundColor !== undefined
      ? { backgroundColor: fallbackBackgroundColor }
      : {}),
    borderColor: resolvedBorderColor,
  };

  return (
    <View
      {...props}
      className={containerClassName}
      style={containerStyle}
    >
      {liquidGlassEnabled && glassAvailable ? (
        <GlassView
          className={className}
          style={[
            baseSurfaceStyle,
            {
              borderRadius: resolvedRadius,
              borderColor: resolvedBorderColor,
            },
          ]}
          isInteractive={interactive}
          tintColor={resolvedTintColor}
          colorScheme={isDark ? "dark" : "light"}
          glassEffectStyle={glassEffectStyle}
        >
          {children}
        </GlassView>
      ) : (
        <View
          className={className}
          style={[baseSurfaceStyle, fallbackStyle]}
        >
          {children}
        </View>
      )}
    </View>
  );
};

export default LiquidGlassView;
