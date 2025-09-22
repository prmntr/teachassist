import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

// Will be added back in future versions

const Onboarding = () => {
  const router = useRouter();
  const { isDark } = useTheme();
  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <TouchableOpacity
        className={`absolute top-15 left-5 flex flex-row items-center gap-2 bg-gray-700/80 rounded-lg px-4 py-2 shadow-lg`}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.replace("/messages");
        }}
      >
        <Image
          className={`w-8 h-8`}
          style={{ tintColor: "#edebea" }}
          source={require("../../assets/images/arrow-icon-left.png")}
        />
        <Text className={`text-white font-semibold text-lg`}>Back</Text>
      </TouchableOpacity>
      <View className={`flex-1 items-center justify-center px-6`}>
        <Text
          className={`text-4xl font-bold ${isDark ? "text-appwhite" : "text-appblack"} mb-10`}
        >
          Who Are You?
        </Text>
        <View className={`w-full`}>
          {/* space-y-5 doesn't work wtf fuck nativewind i already had to define my own spaces and now they pull this bullshit */}
          <TouchableOpacity
            className={`bg-dark4 rounded-xl py-4 px-6 shadow-md flex flex-row items-baseline place-items-baseline justify-center gap-3 mb-5`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace("/signin");
            }}
          >
            <Text className={`text-white font-normal text-3xl text-center`}>
              🧑‍🎓 I&apos;m a{" "}
              <Text className={`text-baccent font-semibold`}>student</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`bg-dark4 rounded-xl py-4 px-6 shadow-md flex flex-row items-baseline place-items-baseline justify-center gap-3 mb-5`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace("/sorry");
            }}
          >
            <Text className={`text-white font-normal text-3xl text-center`}>
              🧑‍🏫 I&apos;m an{" "}
              <Text className={`text-baccent font-semibold`}>educator</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`bg-dark4 rounded-xl py-4 px-6 shadow-md flex flex-row items-baseline place-items-baseline justify-center gap-3 mb-5`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace("/sorry");
            }}
          >
            {/*//? Maybe should be removed since no one uses parent portal */}
            <Text className={`text-white font-normal text-3xl text-center`}>
              🏡 I&apos;m a{" "}
              <Text className={`text-baccent font-semibold`}>parent</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
export default Onboarding;
