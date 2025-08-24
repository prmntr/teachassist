import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
  Alert
} from "react-native";
import TeachAssistAuthFetcher from "../(auth)/taauth";
import AppointmentBooking from "../(components)/AppointmentBooking";
import * as Haptics from "expo-haptics";

const Guidance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [guidanceResult, setGuidanceResult] = useState<string | null>(null);
  const [showFetcher, setShowFetcher] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<string | null>(null);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
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

  // handle appointment booking using taauth
  const handleAppointmentPress = (link: string) => {
    console.log("Booking appointment with link:", link);
    setBookingUrl(link);
    setIsLoading(true);
  };

  const handleBookingResult = (result: string) => {
    console.log("booking result:", result);
    if (result.includes("successfully")){
      Alert.alert("Appointment Successful",`You have now been booked for a guidance appointment on ${selectedDate}.`)
    } setBookingResult(result);
    setBookingUrl(null);
    setIsLoading(false);
    
    // Clear booking result after 3 secs
    setTimeout(() => {
      setBookingResult(null);
    }, 3000);
  };

  const handleBookingError = (error: string) => {
    console.error("Booking error:", error);
    setBookingResult(`Booking error: ${error}`);
    setBookingUrl(null);
    setIsLoading(false);
    
    // Clear booking result after 3 seconds
    setTimeout(() => {
      setBookingResult(null);
    }, 3000);
  };

  const renderGuidanceContent = () => {
    if (isLoading && !bookingUrl) {
      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-appwhite text-center mt-2 text-xl">
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
    
    if (bookingResult) {
      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <Text className={`text-center mt-2 text-lg ${
            bookingResult.includes('successfully') 
              ? 'text-emerald-400' 
              : 'text-red-400'
          }`}>
            {bookingResult}
          </Text>
        </ScrollView>
      );
    }

    if (isLoading && bookingUrl) {
      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-appwhite text-center mt-2 text-lg">
            Booking appointment...
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
          <Text className="text-red-400 text-center mt-2 text-lg">
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
          <Text className="text-2xl text-baccent font-semibold mb-3 text-center">
            {selectedDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </Text>
          <Text className="text-appwhite text-center mt-2 text-lg">
            {selectedDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}{" "}
            is not a school day.{`\n`}Choose another date and try again.
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

    // Check for maybe appt data
    if (
      guidanceResult &&
      !guidanceResult.includes("Login Failed") &&
      guidanceResult !== "NOT A SCHOOL DAY" &&
      guidanceResult.includes("<")
    ) {
      // use appt booking component
      return (
          <AppointmentBooking
            html={guidanceResult}
            onAppointmentPress={handleAppointmentPress}
          />
      );
    }

    if (
      guidanceResult &&
      !guidanceResult.includes("Login Failed") &&
      guidanceResult !== "NOT A SCHOOL DAY"
    ) {
      // from before
      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-sm text-appwhite">
            There are guidance appointments available! Go to the TeachAssist
            Website to register.
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
        <View className="flex items-center justify-center mt-5">
          <Image
            source={require("../../assets/images/search_icon.png")}
            className=" w-30 h-30 my-3 items-center"
            style={{ tintColor: "#27b1fa" }}
          />
          <Text className="text-appwhite text-center text-xl font-semibold">
            Choose a date{'\n'}to show appointments.
          </Text>
        </View>
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
          <Text className="text-appwhite text-xl mb-2">
            Selected Date:{" "}
            {selectedDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </Text>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            setShowDatePicker(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          disabled={isLoading}
        >
          <Text className="bg-baccent/20 border-baccent/30 border text-baccent/80 mt-3 p-2 text-center rounded-lg font-medium text-lg">
            Choose a Date
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            checkGuidanceAvailability();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          disabled={isLoading}
        >
          <Text className="bg-emerald-500/20 border-emerald-500/30 border text-emerald-400/80 mt-3 p-2 text-center rounded-lg font-medium text-lg">
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
      {bookingUrl && (
        <TeachAssistAuthFetcher
          bookAppointment={bookingUrl}
          onResult={handleBookingResult}
          onError={handleBookingError}
          onLoadingChange={setIsLoading}
        />
      )}
    </View>
  );
};

export default Guidance;