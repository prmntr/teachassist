import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { Text, View, TouchableOpacity, Image } from "react-native";

// Some messages to show the user, no meaningful impact

const Onboarding = () => {
  const router = useRouter();
  return (
    <View className="flex-1 bg-1">
      <TouchableOpacity
        className="absolute top-15 left-5 flex flex-row items-center gap-2 bg-gray-700/80 rounded-lg px-4 py-2 shadow-lg"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.replace("/");
        }}
      >
        <Image
          className="w-8 h-8"
          style={{ tintColor: "#edebea" }}
          source={require("../../assets/images/arrow-icon-left.png")}
        />
        <Text className="text-white font-semibold text-lg">Back</Text>
      </TouchableOpacity>
      <View className="flex-1 items-center justify-center mr-3">
        <Text className="text-4xl font-bold text-appwhite mb-10">
          Before we Begin...
        </Text>
        <View className="px-10">
          <Text className="text-baccent text-3xl font-bold mb-6">
            Privacy First {"\n"}
            <Text className="text-appwhite text-lg font-normal">
              None of your information is, and will never be, shared with 3rd
              parties.
            </Text>
          </Text>
          <Text className="text-baccent text-3xl font-bold mb-6">
            Transparent and Open {"\n"}
            <Text className="text-appwhite text-lg font-normal">
              TeachAssist is open-source and publicly auditable on{" "}
              <Link
                href="https://github.com/prmntr/teachassist"
                className="underline"
              >
                GitHub
              </Link>
              .
            </Text>
          </Text>
          <Text className="text-baccent text-3xl font-bold mb-6">
            Responsive Support {"\n"}
            <Text className="text-appwhite text-lg font-normal">
              TeachAssist is still in development, any feedback is greatly
              appreciated!
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace("/signin");
          }}
        >
          <Text className="text-appwhite font-semibold text-3xl bg-baccent px-5 py-3 rounded-xl shadow-md mt-10">
            Got it
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default Onboarding;
