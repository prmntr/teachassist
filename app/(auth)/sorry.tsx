import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { Text, View } from "react-native";
const Sorry = () => {
  return (
    <View className="flex-1 bg-1">
      <View className="flex-1 items-center justify-center">
        <Text className="text-4xl font-bold text-appwhite mb-10">Teacher and Parent Login</Text>
        <Text className="text-appwhite text-xl">The teacher and parent portal are not currently supported. This may change in future updates.</Text>

        <Link
          href="/onboarding"
          className="text-white font-semibold text-3xl bg-baccent/70 px-5 py-3 rounded-lg mt-10"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          Go Back
        </Link>
      </View>
    </View>
  );
};
export default Sorry;
