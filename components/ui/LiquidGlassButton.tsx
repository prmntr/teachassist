import { type ComponentProps } from "react";
import { TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import LiquidGlassView, { type LiquidGlassViewProps } from "./LiquidGlassView";

type LiquidGlassButtonProps = Omit<
  ComponentProps<typeof TouchableOpacity>,
  "style" | "className"
> &
  Pick<
    LiquidGlassViewProps,
    | "className"
    | "style"
    | "contentStyle"
    | "glassTintColor"
    | "fallbackBackgroundColor"
    | "fallbackBorderColor"
    | "glassEffectStyle"
  > & {
    containerClassName?: string;
    containerStyle?: StyleProp<ViewStyle>;
  };

const LiquidGlassButton = ({
  className,
  style,
  containerClassName,
  containerStyle,
  contentStyle,
  glassTintColor,
  fallbackBackgroundColor,
  fallbackBorderColor,
  glassEffectStyle = "clear",
  disabled,
  children,
  ...props
}: LiquidGlassButtonProps) => {
  const hasExplicitSurfaceStyle = Boolean(contentStyle || style);
  const resolvedContainerClassName =
    containerClassName ?? (hasExplicitSurfaceStyle ? className : undefined);
  const resolvedSurfaceClassName = hasExplicitSurfaceStyle
    ? undefined
    : className;

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled}
      className={resolvedContainerClassName}
      style={containerStyle}
    >
      <LiquidGlassView
        className={resolvedSurfaceClassName}
        style={style}
        contentStyle={contentStyle}
        glassTintColor={glassTintColor}
        fallbackBackgroundColor={fallbackBackgroundColor}
        fallbackBorderColor={fallbackBorderColor}
        glassEffectStyle={glassEffectStyle}
        interactive={!disabled}
      >
        {children}
      </LiquidGlassView>
    </TouchableOpacity>
  );
};

export default LiquidGlassButton;
