import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import TeachAssistAuthFetcher, { AppointmentFormData } from "../(auth)/taauth";
import AppointmentBooking from "../(components)/AppointmentBooking";
import AppointmentReasonForm from "../(components)/AppointmentReasonForm";

const Guidance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [guidanceResult, setGuidanceResult] = useState<string | null>(null);
  const [showFetcher, setShowFetcher] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<string | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentFormHtml, setAppointmentFormHtml] = useState<string>("");
  const router = useRouter();
  const [formSubmissionData, setFormSubmissionData] =
    useState<AppointmentFormData | null>(null);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const checkGuidanceAvailability = () => {
    setError(null);
    setGuidanceResult(null);
    setShowAppointmentForm(false);
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

  // Check if the result is an appointment form
  const isAppointmentForm = (html: string): boolean => {
    return (
      html.includes('name="reason"') &&
      html.includes('type="radio"') &&
      html.includes("Submit Reason")
    );
  };

  // handle appointment booking using taauth
  const handleAppointmentPress = (link: string) => {
    console.log("Booking appointment with link:", link);
    setBookingUrl(link);
    setIsLoading(true);
    setShowAppointmentForm(false);
  };

  const handleBookingResult = (result: string) => {
    console.log("Booking result:", result);

    // Check if the result is a form that needs to be filled
    if (isAppointmentForm(result)) {
      console.log("Form detected, showing appointment form");
      setAppointmentFormHtml(result);
      setShowAppointmentForm(true);
      setBookingUrl(null);
      setIsLoading(false);
      return;
    }

    // Handle final booking result
    if (result.includes("successfully")) {
      Alert.alert(
        "Appointment Successful",
        `You have been booked for a guidance appointment on ${selectedDate.toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }
        )}.`
      );
      // Refresh the guidance data to show updated availability
      setTimeout(() => {
        checkGuidanceAvailability();
      }, 1000);
    }

    setBookingResult(result);
    setBookingUrl(null);
    setIsLoading(false);
    setShowAppointmentForm(false);

    // Clear booking result after 3 seconds
    setTimeout(() => {
      setBookingResult(null);
    }, 3000);
  };

  const handleBookingError = (error: string) => {
    console.error("Booking error:", error);
    setBookingResult(`Booking error: ${error}`);
    setBookingUrl(null);
    setIsLoading(false);
    setShowAppointmentForm(false);

    // Clear booking result after 3 seconds
    setTimeout(() => {
      setBookingResult(null);
    }, 3000);
  };

  // Handle form submission
  const handleFormSubmit = (formData: AppointmentFormData) => {
    console.log("Submitting form data:", formData);
    setFormSubmissionData(formData);
    setShowAppointmentForm(false);
    setIsLoading(true);
  };

  // Handle form cancellation
  const handleFormCancel = () => {
    setShowAppointmentForm(false);
    setAppointmentFormHtml("");
    setBookingResult("Appointment booking cancelled.");

    // Clear result after 2 seconds
    setTimeout(() => {
      setBookingResult(null);
    }, 2000);
  };

  // Handle form submission result
  const handleFormSubmissionResult = (result: string) => {
    console.log("Form submission result:", result);

    if (result.includes("successfully")) {
      Alert.alert(
        "Appointment Successful",
        `Your guidance appointment has been booked for ${selectedDate.toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }
        )}.`
      );
      // Refresh the guidance data to show updated availability
      setTimeout(() => {
        checkGuidanceAvailability();
      }, 1000);
    }

    setBookingResult(result);
    setFormSubmissionData(null);
    setIsLoading(false);

    // Clear booking result after 3 seconds
    setTimeout(() => {
      setBookingResult(null);
    }, 3000);
  };

  const handleFormSubmissionError = (error: string) => {
    console.error("Form submission error:", error);
    setBookingResult(`Form submission error: ${error}`);
    setFormSubmissionData(null);
    setIsLoading(false);

    // Clear booking result after 3 seconds
    setTimeout(() => {
      setBookingResult(null);
    }, 3000);
  };

  const renderGuidanceContent = () => {
    // Show appointment reason form if needed
    if (showAppointmentForm && appointmentFormHtml) {
      return (
        <AppointmentReasonForm
          html={appointmentFormHtml}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      );
    }

    if (isLoading && !bookingUrl && !formSubmissionData) {
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
          <Text
            className={`text-center mt-2 text-lg ${
              bookingResult.includes("successfully")
                ? "text-emerald-400"
                : bookingResult.includes("cancelled")
                  ? "text-yellow-400"
                  : "text-red-400"
            }`}
          >
            {bookingResult}
          </Text>
        </ScrollView>
      );
    }

    if (isLoading && (bookingUrl || formSubmissionData)) {
      const loadingText = formSubmissionData
        ? "Submitting appointment request..."
        : "Booking appointment...";

      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-appwhite text-center mt-2 text-lg">
            {loadingText}
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
          <View className="flex items-center justify-center">
            <Text className="text-2xl text-baccent font-semibold mb-3 text-center">
              {selectedDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </Text>
            <Image
              source={require("../../assets/images/not_found.png")}
              className=" w-30 h-30 my-3"
              style={{ tintColor: "#27b1fa" }}
            />
            <Text className="text-red-700 text-center text-xl font-semibold">
              An error occurred: {error}
            </Text>
          </View>
        </ScrollView>
      );
    }

    if (guidanceResult === "NOT A SCHOOL DAY") {
      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex items-center justify-center">
            <Text className="text-2xl text-baccent font-semibold mb-3 text-center">
              {selectedDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </Text>
            <Image
              source={require("../../assets/images/not_found.png")}
              className=" w-30 h-30 my-3"
              style={{ tintColor: "#27b1fa" }}
            />
            <Text className="text-appwhite text-center text-xl">
              {selectedDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }) + ` `}
              is not a school day.{`\n`}Choose another date and try again.
            </Text>
          </View>
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

    // Check for appointment data
    if (
      guidanceResult &&
      !guidanceResult.includes("Login Failed") &&
      guidanceResult !== "NOT A SCHOOL DAY" &&
      guidanceResult.includes("<")
    ) {
      // use appointment booking component
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
      // fallback for unexpected format
      return (
        <ScrollView
          className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full text-appwhite text-center"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-md text-appwhite">
            {guidanceResult.replace(/<[^>]*>/g, "").trim() +"\n\n"}Relaunch the app.
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
            Choose a date{"\n"}to show appointments.
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-2 px-5">
      <View className="flex-row items-center justify-between mt-18">
        <Text className="text-5xl font-semibold text-appwhite">Guidance</Text>
        <TouchableOpacity
          onPress={() => {
            router.replace("/AppointmentsPage");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          disabled={isLoading}
        >
          <View className="bg-baccent/80 text-appwhite p-2 text-center rounded-lg font-medium text-lg px-3">
            <Image
              source={require("../../assets/images/upcoming-calendar-icon.png")}
              className="w-7 h-8"
              style={{ tintColor: "#edebea" }}
            />
          </View>
        </TouchableOpacity>
      </View>
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
        <View className="flex-row justify-between">
          <TouchableOpacity
            onPress={() => {
              setShowDatePicker(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            disabled={isLoading}
            className="flex-1 mr-2"
          >
            <Text className="bg-4 text-appwhite mt-3 p-2 pb-3 text-center rounded-lg text-lg">
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
            <View className="bg-baccent/80  text-appwhite mt-3 p-2 text-center rounded-lg font-medium text-lg px-3">
              <Image
                source={require("../../assets/images/calendar-icon.png")}
                className="w-6 h-8"
                style={{ tintColor: "#edebea" }}
              />
            </View>
          </TouchableOpacity>
        </View>
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
      {formSubmissionData && (
        <TeachAssistAuthFetcher
          submitAppointmentForm={formSubmissionData}
          onResult={handleFormSubmissionResult}
          onError={handleFormSubmissionError}
          onLoadingChange={setIsLoading}
        />
      )}
    </View>
  );
};

export default Guidance;
