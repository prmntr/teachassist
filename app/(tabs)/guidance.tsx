import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import TeachAssistAuthFetcher from "../(auth)/taauth";
import * as Haptics from "expo-haptics";

const Guidance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [guidanceResult, setGuidanceResult] = useState<string | null>(null);
  const [showFetcher, setShowFetcher] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const checkGuidanceAvailability = () => {
    setError(null);
    setGuidanceResult(null);
    setShowFetcher(true);
  };

  const handleGuidanceResult = (result: string) => {
    console.log("Guidance result:", result);
    setGuidanceResult(result);
    setShowFetcher(false);
  };

  const handleError = (error: string) => {
    console.error("Guidance error:", error);
    setError(error);
    setShowFetcher(false);
  };

  const renderGuidanceContent = () => {
    if (isLoading) {
      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-appwhite text-center mt-2 text-lg">
            Checking availability for{" "}
            {selectedDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
            ...
          </Text>
        </ScrollView>
      );
    }

    if (error) {
      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-appwhite text-center mt-2 text-lg">
            Error: {error}
          </Text>
        </ScrollView>
      );
    }

    if (guidanceResult === "NOT A SCHOOL DAY") {
      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-appwhite text-center mt-2 text-lg">
            {selectedDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })} is not a school day.{`\n`}Choose another date and try again.
          </Text>
        </ScrollView>
      );
    }

    if (guidanceResult && guidanceResult.includes("Login Failed")) {
      return (
        <View className="bg-red-500/15 my-5 px-5 py-3 rounded-lg">
          <Text className="text-xl text-red-400 text-center font-bold">
            Session expired. Please log in again.
          </Text>
        </View>
      );
    }

    if (
      guidanceResult &&
      !guidanceResult.includes("Login Failed") &&
      guidanceResult !== "NOT A SCHOOL DAY"
    ) {
      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-2xl text-baccent font-semibold mb-3">
            {selectedDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </Text>
          <Text className="text-sm text-appwhite">
            There are guidance appointments available! Go to the TeachAssist Website to register.
            {guidanceResult.replace(/<[^>]*>/g, "").trim()}
          </Text>
        </ScrollView>
      );
    }

    return (
      <ScrollView
        className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-appwhite text-center mt-2">
          Choose a date to show appointment availability.
        </Text>
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-2 px-5">
      <Text className="text-5xl font-semibold text-appwhite mt-18">
        Guidance
      </Text>
      <View className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center mt-4">
        <View className="items-center">
          <Text className="text-appwhite text-xl mb-2">Choose a date  </Text>
          <View className="mr-5">
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            checkGuidanceAvailability();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          disabled={isLoading}
        >
          <Text className="bg-emerald-500/20 border-emerald-500/30 border text-emerald-400/80 mt-5 p-2 text-center rounded-lg font-medium text-lg">
            Check Availability
          </Text>
        </TouchableOpacity>
      </View>
      {renderGuidanceContent()}
      {showFetcher && (
        <TeachAssistAuthFetcher
          getGuidance={selectedDate}
          onResult={handleGuidanceResult}
          onError={handleError}
          onLoadingChange={setIsLoading}
        />
      )}
    </View>
  );
};

export default Guidance;
