import { View, Text } from 'react-native'
import { Link } from 'expo-router';
const Guidance = () => {
  return (
    <View className="flex-1  px-5">
      <Text className="text-5xl font-semibold  mt-18">Credits</Text>
      <View className="text-gray-500">
        <Link href="https://www.flaticon.com/free-icons/course">
          <Text>Course icons created by Tanah Basah - Flaticon</Text>
        </Link>
        <Link href="https://www.flaticon.com/free-icons/user">
          <Text>User icons created by Graphics Plazza - Flaticon</Text>
        </Link>
        <Link href="https://www.flaticon.com/free-icons/reload">
          <Text className="text-gray-400">
            Reload icons created by Uniconlabs - Flaticon
          </Text>
        </Link>
        <Link href="hhttps://www.flaticon.com/free-icons/magnifying-glass">
          <Text className="text-gray-400">
            Magnifying glass icons created by paonkz - Flaticon
          </Text>
        </Link>
      </View>

      <Link
        href="/profile"
        className="mt-5 font-bold bg-gray-500 text-lg border border-2 text-center flex"
      >
        <Text>Go back</Text>
      </Link>
    </View>
  );
};
export default Guidance;