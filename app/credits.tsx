import { Link } from "expo-router";
import { Text, View } from "react-native";
import { useTheme } from "./contexts/ThemeContext";

const Guidance = () => {
  const { isDark } = useTheme();

  return (
    <View className={`flex-1 px-5  ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <Text
        className={`text-5xl font-semibold mt-18 ${isDark ? "text-appwhite" : "text-appblack"}`}
      >
        Credits
      </Text>
      <View className={`my-3`}>
        <Link
          href="https://www.flaticon.com/free-icons/course"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
        >
          <Text>Course icons created by Tanah Basah - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/user"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
        >
          <Text>User icons created by Graphics Plazza - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/reload"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
        >
          <Text>Reload icons created by Uniconlabs - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/magnifying-glass"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
        >
          <Text>Magnifying glass icons created by paonkz - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/arrow"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
        >
          <Text>Arrow icons created by Dave Gandy - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/rectangle"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
        >
          <Text>Rectangle icons created by Freepik - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/pencil"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
        >
          <Text>Pencil icons created by Anggara - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/tick"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
        >
          <Text>Tick icons created by Pixel perfect - Flaticon</Text>
        </Link>
        <Link
          href="https://streamable.com/lf027o"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2 underline`}
        >
          <Text>You, for using the app 💖</Text>
        </Link>
      </View>

      <Link
        href="/profile"
        className={`mt-5 font-bold bg-baccent/70 ${isDark ? "text-appwhite" : "text-appblack"} py-2 rounded-lg text-lg text-center flex`}
      >
        <Text>Go back</Text>
      </Link>

      <View
        className="absolute bottom-4 overflow-hidden"
        style={{ width: "200%" }}
      >
        <Text className="text-appgraydark">
          THE END IS NEVER THE END IS NEVER THE END IS NEVER THE END IS NEVER
          THE END IS NEVER THE END
        </Text>
      </View>
    </View>
  );
};
export default Guidance;
