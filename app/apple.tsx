import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

const AppleSubscriptionParody = () => {
  const [timeLeft, setTimeLeft] = useState(47);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View className="h-screen bg-white font-sans overflow-hidden flex flex-col pt-15">
      {/* Main Content */}
      <View className="px-6 pt-4 flex-1 flex flex-col">
        {/* Title */}
        <View className="text-center mb-4">
          <Text className="text-2xl font-light mb-2 text-black text-center">
            Your iPhone Time is Up.
          </Text>
          <Text className="text-gray-600 text-sm leading-relaxed text-center">
            Your ad-supported iPhone session has expired. {"\n"}Choose a payment
            plan below.
          </Text>
        </View>

        {/* Timer */}
        <View className="rounded-2xl mb-4  py-4 text-center bg-[#ff180d]/70">
          <Text className="text-lg mb-1 text-center text-white">
            Your phone has{" "}
            <Text className="text-2xl font-mono font-bold text-white text-center">
              {formatTime(timeLeft)}
            </Text>{" "}
            until it implodes.
          </Text>
        </View>

        {/* Options */}
        <View className="space-y-3 mb-4 flex-1">
          {/* Daily Pass */}
          <View className="bg-gray-100 rounded-2xl p-4">
            <View className="flex justify-between items-start mb-3">
              <View>
                <Text className="text-lg font-semibold mb-1 text-black">
                  Daily Pass
                </Text>
                <Text className="text-gray-600 text-xs">
                  Continue using your iPhone until midnight
                </Text>
              </View>
              <View className="text-right">
                <Text className="text-2xl font-bold text-black">$25</Text>
                <Text className="text-xs text-gray-600">per day</Text>
              </View>
            </View>

            <View className="space-y-1 mb-3">
              <Text className="text-sm text-gray-700">
                Full iPhone functionality until 11:59 PM
              </Text>
              <Text className="text-sm text-gray-700">
                Includes 30-second unskippable ads every 10 minutes
              </Text>
              <Text className="text-sm text-gray-700">
                Camera is limited to 144p resolution
              </Text>
            </View>

            <TouchableOpacity
              className="w-full rounded-xl py-3 transition-colors"
              style={{ backgroundColor: "#007aff" }}
            >
              <Text className="font-semibold text-white text-sm text-center">
                Purchase Daily Pass
              </Text>
            </TouchableOpacity>
          </View>

          {/* Apple Plus */}
          <View className="bg-gray-100 rounded-2xl p-4 relative overflow-hidden mt-2">
            <View className="absolute top-3 right-3 bg-emerald-500 px-2 py-1 rounded-full">
              <Text className="text-xs font-bold text-white">PREMIUM</Text>
            </View>

            <View className="flex justify-between items-start mb-3">
              <View>
                <Text className="text-lg font-semibold mb-1 text-blue-700">
                  Apple Plus+ Ultimate Ultron XDR
                </Text>
                <Text className="text-gray-700 text-xs">
                  The ultimate iPhone experience*
                </Text>
              </View>
              <View className="text-right">
                <Text className="text-2xl font-bold text-blue-700">
                  $199.99
                </Text>
                <Text className="text-xs text-gray-700">per month</Text>
              </View>
            </View>

            <View className="space-y-1 mb-3">
              <View className="flex items-start">
                <Text className="text-sm text-gray-800">
                  Unlimited iPhone usage
                </Text>
              </View>
              <View className="flex items-start">
                <Text className="text-sm text-gray-800">Half as many ads</Text>
              </View>
              <View className="flex items-start">
                <Text className="text-sm text-gray-800">
                  Camera upgrade to 720p HD
                </Text>
              </View>
              <View className="flex items-start">
                <Text className="text-sm text-gray-800">
                  Access to 3 additional home screen apps
                </Text>
              </View>
              <View className="flex items-start">
                <Text className="text-sm text-gray-800">
                  {`when.the's`} personal onlyfans
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="w-full rounded-xl py-3 transition-all"
              style={{ backgroundColor: "#007aff" }}
            >
              <Text className="font-semibold text-white text-sm text-center">
                Subscribe to Apple Plus+
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Links */}
        <View className="flex items-center justify-center mb-3">
          <View className="mb-3">
            <Text className="text-xs text-gray-500 text-center leading-relaxed">
              *Additional subscriptions required: iMessage+ ($19.99/mo),
              FaceTime Pro ($14.99/mo), Apple Intelligence Premium Plus Ultra
              ($24.99/mo). Your iPhone will self-destruct and Tim Cook will
              anally penetrate you if payments are missed.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default AppleSubscriptionParody;
