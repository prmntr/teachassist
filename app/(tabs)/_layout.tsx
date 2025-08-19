import { Tabs } from "expo-router";
import { Image, View } from "react-native";
import * as Haptics from "expo-haptics";


// todo add hollow icon sources
type TabIconProps = {
  source: any;
  hollowSource: any;
  title: string;
  width: string;
  focused: boolean;
};


const TabIcon = ({ source, hollowSource, width, focused }: TabIconProps) => {
  if (focused) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    return (
      <View className="flex-col items-center mt-7 min-w-[112px] scale-120 transition duration-200">
        <Image
          source={source}
          className={width}
          tintColor="#27b1fa"
          resizeMode="contain"
        />
      </View>
    );
  } else {
    return (
      <View className="size-full justify-center items-center mt-7 min-w-[112px]">
        <Image
          source={hollowSource}
          className={width}
          tintColor="#5d5d5d"
          resizeMode="contain"
        />
      </View>
    );
  }
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarItemStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
        },
        tabBarStyle: {
          backgroundColor: "#161616",
          overflow: "hidden",
          borderColor: "#2a2a2a",
          borderTopWidth: 2,
        },
      }}
    >
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              title="Courses"
              source={require("../../assets/images/CoursesIcon.png")}
              hollowSource={require("../../assets/images/CoursesIcon_Hollow.png")}
              width="w-10"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="guidance"
        options={{
          title: "Guidance",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              source={require("../../assets/images/GuidanceIcon.png")}
              hollowSource={require("../../assets/images/GuidanceIcon_Hollow.png")}
              title="Guidance"
              width="w-8"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              source={require("../../assets/images/ProfileIcon.png")}
              hollowSource={require("../../assets/images/ProfileIcon_Hollow.png")}
              title="Profile"
              width="w-9"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
