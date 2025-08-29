import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { Text, View } from "react-native";
const Sorry = () => {
  return (
    // i dont know why android keeps defaulting to this screen
    <View className="flex-1 bg-1 px-10">
      <View className="flex-1 items-center justify-center">
        <Text className="text-4xl font-bold text-appwhite mb-10 text-center">
          Teacher and Parent Login
        </Text>
        <Text className="text-appwhite text-xl text-center mx-5">
          You should not be seeing this; file a support ticket.
        </Text>

        <Link
          href="/"
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
