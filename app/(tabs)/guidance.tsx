import { Text, View } from "react-native";

// coming soon

const Guidance = () => {
  return (
    <View className="flex-1 bg-2 px-5">
      <Text className="text-5xl font-semibold text-appwhite mt-18">
        Guidance
      </Text>
      <Text className="text-appwhite mt-3 text-center">
        This feature is under maintenance and will be back soon.
      </Text>
      <View className="bg-baccent/15 my-5 px-5 py-3 rounded-lg">
        <Text className="text-xl text-appwhite text-center font-bold">
          No guidance appointments are available for{" "}
          <Text className="text-baccent">
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </Text>
          .{`\n`} Choose another date and try again.
        </Text>
      </View>
    </View>
  );
};
export default Guidance;
