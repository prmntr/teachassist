import { View, Text } from 'react-native'
import { Link } from 'expo-router';
const Guidance = () => {
  return (
    <View className="flex-1 px-5 bg-2">
      <Text className="text-5xl font-semibold mt-18 text-appwhite">
        Credits
      </Text>
      <View className="my-3">
        <Link
          href="https://www.flaticon.com/free-icons/course"
          className="text-appwhite my-2"
        >
          <Text>Course icons created by Tanah Basah - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/user"
          className="text-appwhite my-2"
        >
          <Text>User icons created by Graphics Plazza - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/reload"
          className="text-appwhite my-2"
        >
          <Text>Reload icons created by Uniconlabs - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/magnifying-glass"
          className="text-appwhite my-2"
        >
          <Text>Magnifying glass icons created by paonkz - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/arrow"
          className="text-appwhite my-2"
        >
          <Text>Arrow icons created by Dave Gandy - Flaticon</Text>
        </Link>
        <Link
          href="https://www.flaticon.com/free-icons/rectangle"
          className="text-appwhite my-2"
        >
          <Text>Rectangle icons created by Freepik - Flaticon</Text>
        </Link>
      </View>

      <Link
        href="/profile"
        className="mt-5 font-bold bg-baccent/70 text-appwhite py-2 rounded-lg text-lg border border-2 text-center flex"
      >
        <Text>Go back</Text>
      </Link>
    </View>
  );
};
export default Guidance;