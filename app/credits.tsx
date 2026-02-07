import { Link, useRouter } from "expo-router";
import { Image, Text, View } from "react-native";
import { useTheme } from "./contexts/ThemeContext";
import BackButton from "./(components)/Back";

const Guidance = () => {
  const { isDark } = useTheme();

  return (
    <View className={`flex-1 px-5  ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <BackButton path={"/profile"} />
      <Text
        className={`text-5xl font-semibold mt-30 ${isDark ? "text-appwhite" : "text-appblack"}`}
      >
        Credits
      </Text>
      <View className={`my-3 flex flex-row flex-wrap`}>
        <Link
          href="https://www.flaticon.com/free-icons/course"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2 mr-2`}
        >
          <Text>Tanah Basah</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/user"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2 mr-2`}
        >
          <Text>Graphics Plazza</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/reload"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2 mr-2`}
        >
          <Text>Uniconlabs</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/magnifying-glass"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2 mr-2`}
        >
          <Text>paonkz</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/arrow"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2 mr-2`}
        >
          <Text>Dave Gandy</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/pencil"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2 mr-2`}
        >
          <Text>Anggara</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/tick"
          className={`${isDark ? "text-appwhite" : "text-appblack"} my-2 mr-2 mb-3`}
        >
          <Text>Pixel perfect</Text>
        </Link>
      </View>
      {/* 
      <Text className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}>
        Dr. Dykshoorn
      </Text>
      <Text className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}>
        Dr. Dykshoorn
      </Text>
      <Text className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}>
        Dr. Dykshoorn
      </Text>
      <Text className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}>
        Dr. Dykshoorn
      </Text>
      <View className="flex flex-row items-center justify-start">
        <Text className={`${isDark ? "text-appwhite" : "text-appblack"}`}>
          --{">"}
        </Text>
        <Image
          source={require("../assets/images/bear.png")}
          className="object-scale-down"
          style={{
            width: 33,
            height: 50,
          }}
        />
      </View>
      */}
      <View className="flex flex-row">
        <View className="mr-2">
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
          >
            little boy
          </Text>
          <Image
            source={require("../assets/images/portrait.jpeg")}
            className="object-scale-down"
            style={{
              width: 110,
              height: 140,
            }}
          />
        </View>
        <View>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
          >
            fat man
          </Text>
          <Image
            source={require("../assets/images/boy.jpeg")}
            className="object-scale-down"
            style={{
              width: 110,
              height: 140,
            }}
          />
        </View>
      </View>
      <View style={{ alignItems: "center" }}>
        <Link
          href="https://streamable.com/lf027o"
          className={`${isDark ? "text-appwhite" : "text-appblack"} mt-5 bg-success/70 py-2 px-3 rounded-lg`}
          style={{ alignSelf: "center" }}
        >
          <Text>and you, for using the app {`(⁠/⁠･⁠ω⁠･⁠(⁠-⁠ω⁠-⁠)`}</Text>
        </Link>
      </View>

      {/* 
      <View className="absolute bottom-6 left-0 right-0 overflow-hidden items-center">
        <Text className="text-appgraydark mr-2">rien à redire, bss</Text>
      </View>
      */}
    </View>
  );
};
export default Guidance;
