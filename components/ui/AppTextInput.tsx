import { type ComponentProps } from "react";
import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextStyle,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type AppTextInputProps = ComponentProps<typeof RNTextInput> & {
  className?: string;
};

const AppTextInput = ({ style, ...props }: AppTextInputProps) => {
  const { fontPreset } = useTheme();
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const explicitFontFamily = flattenedStyle?.fontFamily;
  const fontFamily =
    explicitFontFamily ??
    fontPreset.inputFamily ??
    fontPreset.regularFamily ??
    undefined;

  if (!fontFamily || explicitFontFamily) {
    return <RNTextInput {...props} style={style} />;
  }

  return (
    <RNTextInput
      {...props}
      style={[flattenedStyle, { fontFamily }]}
    />
  );
};

export default AppTextInput;
