import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { hapticsImpact } from "../(utils)/haptics";

// no one should ever see this

const Error = () => {
  const router = useRouter();

  const { isDark } = useTheme();

  const handleGoToCourses = () => {
    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
    router.push("/courses");
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <ScrollView
        className={`flex-1 px-5`}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className={`text-5xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"} mt-18 mb-6`}
        >
          Course Not Found
        </Text>

        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-2xl p-6 mb-6 text-center`}
        >
          <Text
            className={`text-2xl font-bold ${isDark ? "text-appwhite" : "text-appblack"} mb-4 text-center`}
          >
            404
          </Text>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"}/80 text-lg text-center leading-6 mb-4`}
          >
            Your course could not be found.
          </Text>
          <Text
            className={`text-xl font-bold ${isDark ? "text-appwhite" : "text-appblack"} mb-4`}
          >
            This might be because:
          </Text>
          <View className={`space-y-3`}>
            <View className={`flex-row items-start`}>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-lg mr-3`}
              >
                -
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/80 text-base flex-1`}
              >
                Your internet connection is unstable
              </Text>
            </View>
            <View className={`flex-row items-start`}>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-lg mr-3`}
              >
                -
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/80 text-base flex-1`}
              >
                The course ID is invalid or outdated
              </Text>
            </View>
            <View className={`flex-row items-start`}>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-lg mr-3`}
              >
                -
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/80 text-base flex-1`}
              >
                TeachAssist servers are temporarily unavailable
              </Text>
            </View>
            <View className={`flex-row items-start`}>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-lg mr-3`}
              >
                -
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/80 text-base flex-1`}
              >
                Your session may have expired
              </Text>
            </View>
          </View>
        </View>

        <View className={`space-y-4 mb-8`}>
          <TouchableOpacity
            onPress={handleGoToCourses}
            className={`bg-success/20 rounded-xl p-4`}
          >
            <View className={`flex-row justify-center items-center`}>
              <Text className={`text-success text-lg font-bold`}>Courses</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-2xl p-6 mb-8`}
        >
          <Text
            className={`text-xl font-bold ${isDark ? "text-appwhite" : "text-appblack"} mb-4 text-center`}
          >
            Still having trouble?
          </Text>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-base text-center leading-6 mb-4`}
          >
            Check your internet connection and try refreshing the app. If the
            problem persists, contact our support.
          </Text>

          <View className={`bg-slate-700/50 rounded-lg p-3`}>
            <View className={`flex-row justify-between items-center`}>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm`}
              >
                Network Status:
              </Text>
              <View className={`flex-row items-center`}>
                <View className={`w-2 h-2 bg-green-500 rounded-full mr-2`} />
                <Text className={`text-green-400 text-sm font-medium`}>
                  Connected
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className={`items-center pb-8`}>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-xs text-center`}
          >
            Error occurred at {new Date().toLocaleTimeString()} {`\n`}{" "}
            COURSE_NOT_FOUND {/*lol*/}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default Error;
