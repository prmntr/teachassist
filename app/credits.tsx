import { Link } from "expo-router";
import { Image, ScrollView, View } from "react-native";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import PageBackground from "@/components/ui/PageBackground";
import { useTheme } from "@/contexts/ThemeContext";

const Guidance = () => {
  const { isDark } = useTheme();

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path={"/profile"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
      >
        <Text
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          Credits
        </Text>
        <Text
          className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          burger fries mustard mango yara yara tung tung
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
        <View className="flex-row items-center justify-center">
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
          <View className="mr-2">
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
          <View>
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} my-2`}
            >
              bum
            </Text>
            <Image
              source={require("../assets/images/ethan.webp")}
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
            className={`${isDark ? "text-appwhite" : "text-appblack"} mt-5 bg-success/70 py-2 px-3 rounded-xl`}
            style={{ alignSelf: "center" }}
          >
            <Text>and you, for using the app {`(⁠/⁠･⁠ω⁠･⁠(⁠-⁠ω⁠-⁠)`}</Text>
          </Link>
        </View>
        <Text
          className={`${isDark ? "text-appgraydark" : "text-appgraylight"} my-2 mb-3 mt-5 font-semibold leading-relaxed`}
        >
          ;3
        </Text>

        {/* 
      <View className="absolute bottom-6 left-0 right-0 overflow-hidden items-center">
        <Text className="text-appgraydark mr-2">rien à redire, bss</Text>
      </View>
      */}
      </ScrollView>
    </View>
  );
};
export default Guidance;
