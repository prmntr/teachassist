import { type ComponentProps } from "react";
import { StyleSheet, Text as RNText, type TextStyle } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type AppTextProps = ComponentProps<typeof RNText> & {
  className?: string;
};

const FONT_WEIGHT_CLASS_NAMES = [
  "font-normal",
  "font-medium",
  "font-semibold",
  "font-bold",
  "font-extrabold",
  "font-black",
] as const;

const normalizeFontWeight = (fontWeight?: TextStyle["fontWeight"]) => {
  return typeof fontWeight === "number" ? String(fontWeight) : fontWeight;
};

const getFontWeightFromClassName = (className?: string) => {
  if (!className) {
    return undefined;
  }

  const classes = className.split(/\s+/);

  if (classes.includes("font-black")) {
    return "900";
  }

  if (classes.includes("font-extrabold")) {
    return "800";
  }

  if (classes.includes("font-bold")) {
    return "700";
  }

  if (classes.includes("font-semibold")) {
    return "600";
  }

  if (classes.includes("font-medium")) {
    return "500";
  }

  if (classes.includes("font-normal")) {
    return "400";
  }

  return undefined;
};

const stripFontWeightClasses = (className?: string) => {
  if (!className) {
    return className;
  }

  const stripped = className
    .split(/\s+/)
    .filter((name) => name && !FONT_WEIGHT_CLASS_NAMES.includes(name as (typeof FONT_WEIGHT_CLASS_NAMES)[number]))
    .join(" ");

  return stripped || undefined;
};

const resolveFontFamily = (
  fontPreset: ReturnType<typeof useTheme>["fontPreset"],
  fontWeight?: TextStyle["fontWeight"],
) => {
  if (!fontPreset.regularFamily) {
    return undefined;
  }

  const normalizedWeight = normalizeFontWeight(fontWeight);

  if (
    normalizedWeight === "bold" ||
    normalizedWeight === "700" ||
    normalizedWeight === "800" ||
    normalizedWeight === "900"
  ) {
    return (
      fontPreset.boldFamily ??
      fontPreset.semiboldFamily ??
      fontPreset.regularFamily
    );
  }

  if (normalizedWeight === "600" || normalizedWeight === "semibold") {
    return (
      fontPreset.semiboldFamily ??
      fontPreset.boldFamily ??
      fontPreset.regularFamily
    );
  }

  if (normalizedWeight === "500" || normalizedWeight === "medium") {
    return fontPreset.mediumFamily ?? fontPreset.regularFamily;
  }

  return fontPreset.regularFamily;
};

const AppText = ({ style, className, ...props }: AppTextProps) => {
  const { fontPreset } = useTheme();
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const explicitFontFamily = flattenedStyle?.fontFamily;
  const requestedFontWeight =
    flattenedStyle?.fontWeight ?? getFontWeightFromClassName(className);
  const fontFamily = explicitFontFamily
    ? undefined
    : resolveFontFamily(fontPreset, requestedFontWeight);

  if (explicitFontFamily || !fontFamily) {
    return <RNText {...props} className={className} style={style} />;
  }

  const sanitizedStyle = flattenedStyle
    ? {
        ...flattenedStyle,
        fontWeight: undefined,
      }
    : undefined;

  return (
    <RNText
      {...props}
      className={stripFontWeightClasses(className)}
      style={[sanitizedStyle, { fontFamily }]}
    />
  );
};

export default AppText;
