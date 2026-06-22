import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});

const PageBackground = () => {
  const { isDark, pageBackgroundEnabled, pageBackgroundImageUri } = useTheme();

  if (!pageBackgroundEnabled || !pageBackgroundImageUri) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.fill}>
      <Image
        source={{ uri: pageBackgroundImageUri }}
        resizeMode="cover"
        blurRadius={isDark ? 14 : 10}
        style={[
          styles.fill,
          {
            opacity: isDark ? 0.22 : 0.30,
          },
        ]}
      />
    </View>
  );
};

export default PageBackground;
