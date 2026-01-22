import DateTimePicker from "@react-native-community/datetimepicker";
import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TeachAssistAuthFetcher, { AppointmentFormData } from "../(auth)/taauth";
import AppointmentBooking, {
  type AppointmentSlot,
} from "../(components)/AppointmentBooking";
import AppointmentReasonForm from "../(components)/AppointmentReasonForm";
import { SnowEffect } from "../(components)/SnowEffect";
import { useTheme } from "../contexts/ThemeContext";
import { hapticsImpact } from "../(utils)/haptics";

const Guidance = () => {
  const { isDark } = useTheme();
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
  const [pendingAppointmentMeta, setPendingAppointmentMeta] = useState<{
    teacher?: string;
    subject?: string;
  } | null>(null);

  const normalizePickerDate = (date: Date): Date => {
    if (
      date.getHours() === 0 &&
      date.getMinutes() === 0 &&
      date.getSeconds() === 0 &&
      date.getMilliseconds() === 0
    ) {
      return date;
    }
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  };

  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 11, 20); // Dec 20
  const end = new Date(
    year + (now.getMonth() === 0 ? -1 : 0),
    0,
    5,
    23,
    59,
    59,
    999,
  ); // Jan 5

  const router = useRouter();
  const [formSubmissionData, setFormSubmissionData] =
    useState<AppointmentFormData | null>(null);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(normalizePickerDate(date));
    }
  };

  const checkGuidanceAvailability = async () => {
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
      setError(
        "No internet connection. Please check your connection and try again.",
      );
      return;
    }
    setError(null);
    setGuidanceResult(null);
    setShowAppointmentForm(false);
    setShowFetcher(true);
  };

  const handleGuidanceResult = (result: string) => {
    // Handle re-authentication success - retry the guidance check
    if (result.includes("REAUTH SUCCESS")) {
      console.log("Re-authentication successful, retrying guidance check...");
      // Don't set showFetcher to false, keep it true to retry
      return;
    }

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
    console.log(
      "appointment is " + html.includes('name="reason"') &&
        html.includes('type="radio"') &&
        html.includes("Submit Reason"),
    );
    return (
      html.includes('name="reason"') &&
      html.includes('type="radio"') &&
      html.includes("Submit Reason")
    );
  };

  // handle appointment booking using taauth
  const handleAppointmentPress = (appointment: AppointmentSlot) => {
    console.log("Booking appointment with link:", appointment.link);
    setPendingAppointmentMeta({
      teacher: appointment.counselorName,
    });
    setBookingUrl(appointment.link);
    setIsLoading(true);
    setShowAppointmentForm(false);
  };

  const handleBookingResult = (result: string) => {
    // Handle re-authentication success - retry the booking
    if (result === "REAUTH SUCCESS") {
      console.log("Re-authentication successful, retrying booking...");
      // Don't clear bookingUrl, keep the booking request active to retry
      return;
    }

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
          },
        )}.`,
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
    setPendingAppointmentMeta(null);

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
    setPendingAppointmentMeta(null);

    // Clear booking result after 3 seconds
    setTimeout(() => {
      setBookingResult(null);
    }, 3000);
  };

  // Handle form submission
  const handleFormSubmit = (formData: AppointmentFormData) => {
    console.log("Submitting form data:", formData);
    setPendingAppointmentMeta((current) => ({
      teacher: current?.teacher,
      subject: formData.reasonLabel ?? current?.subject,
    }));
    setFormSubmissionData(formData);
    setShowAppointmentForm(false);
    setIsLoading(true);
  };

  // Handle form cancellation
  const handleFormCancel = () => {
    setShowAppointmentForm(false);
    setAppointmentFormHtml("");
    setBookingResult("Appointment booking cancelled.");
    setPendingAppointmentMeta(null);

    // Clear result after 2 seconds
    setTimeout(() => {
      setBookingResult(null);
    }, 2000);
  };

  // Handle form submission result
  const handleFormSubmissionResult = (result: string) => {
    console.log("Form submission result:", result);

    // Handle re-authentication success - retry the form submission
    if (result === "REAUTH SUCCESS") {
      console.log("Re-authentication successful, retrying form submission...");
      // Don't clear formSubmissionData, keep the form submission request active to retry
      return;
    }

    if (result.includes("successfully")) {
      Alert.alert(
        "Appointment Successful",
        `Your guidance appointment has been booked for ${selectedDate.toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          },
        )}.`,
      );
      // Refresh the guidance data to show updated availability
      setTimeout(() => {
        checkGuidanceAvailability();
      }, 1000);
    }

    setBookingResult(result);
    setFormSubmissionData(null);
    setIsLoading(false);
    setPendingAppointmentMeta(null);

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
    setPendingAppointmentMeta(null);

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
        <View className="flex-1 shadow-md">
          <ScrollView
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-lg w-full ${isDark ? "text-appwhite" : "text-appblack"} text-center pt-5`}
            showsVerticalScrollIndicator={false}
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-center mt-2 text-xl`}
            >
              Checking availability for{" "}
              {selectedDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
              ...
            </Text>
            {/* refesh anim effectively disabled until i want to*/}
            <RefreshControl
              refreshing={true}
              tintColor="#27b1fa"
              colors={["#27b1fa"]}
            />
          </ScrollView>
        </View>
      );
    }

    if (bookingResult) {
      return (
        <View className="flex-1 shadow-md">
          <ScrollView
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-lg w-full ${isDark ? "text-appwhite" : "text-appblack"} text-center`}
            showsVerticalScrollIndicator={false}
          >
            <View className="flex items-center">
              {bookingResult.includes("cancelled") ? (
                <Image
                  source={require("../../assets/images/caution.png")}
                  className={` w-20 h-20 my-3 mb-5`}
                  style={{
                    tintColor: "#fcc245",
                  }}
                />
              ) : (
                <Image
                  source={require("../../assets/images/checkmark.png")}
                  className={` w-30 h-30 my-3`}
                  style={{
                    tintColor: "#43a25a",
                  }}
                />
              )}
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-center text-xl font-semibold`}
              >
                {bookingResult}
              </Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    if (isLoading && (bookingUrl || formSubmissionData)) {
      const loadingText = formSubmissionData
        ? "Submitting appointment request..."
        : "Booking appointment...";

      return (
        <View className="flex-1 shadow-md">
          <ScrollView
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-lg w-full ${isDark ? "text-appwhite" : "text-appblack"} text-center`}
            showsVerticalScrollIndicator={false}
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-center mt-2 text-lg`}
            >
              {loadingText}
            </Text>
          </ScrollView>
        </View>
      );
    }

    if (error) {
      return (
        <View className="shadow-md flex-1">
          <ScrollView
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-lg w-full ${isDark ? "text-appwhite" : "text-appblack"} text-center`}
            showsVerticalScrollIndicator={false}
          >
            <View className={`flex items-center justify-center`}>
              <Text
                className={`text-2xl text-baccent font-semibold mb-3 text-center`}
              >
                {selectedDate.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Text>
              <Image
                source={require("../../assets/images/not_found.png")}
                className={` w-30 h-30 my-3`}
                style={{ tintColor: "#d6363f" }}
              />
              <Text className={`text-danger text-center text-lg max-w-md`}>
                An error occurred:{"\n" + error}
              </Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    if (guidanceResult === "NOT A SCHOOL DAY") {
      return (
        <View className="shadow-md flex-1">
          <ScrollView
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-lg w-full ${isDark ? "text-appwhite" : "text-appblack"} text-center`}
            showsVerticalScrollIndicator={false}
          >
            <View className={`flex items-center justify-center`}>
              <Text
                className={`text-2xl text-baccent font-semibold mb-3 text-center`}
              >
                {selectedDate.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Text>
              <Image
                source={require("../../assets/images/not_found.png")}
                className={` w-30 h-30 my-3`}
                style={{ tintColor: "#27b1fa" }}
              />
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-center text-xl`}
              >
                {selectedDate.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }) + ` `}
                is not a school day.{`\n`}Choose another date and try again.
              </Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    // should never happen again
    if (guidanceResult && guidanceResult.includes("Login Failed")) {
      return (
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} my-5 px-5 py-3 rounded-lg`}
        >
          <Text className={`text-xl text-danger text-center font-bold`}>
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
        <View className="flex-1 shadow-md">
          <ScrollView
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-lg w-full ${isDark ? "text-appwhite" : "text-appblack"} text-center`}
            showsVerticalScrollIndicator={false}
          >
            <Text
              className={`text-md ${isDark ? "text-appwhite" : "text-appblack"}`}
            >
              {guidanceResult.replace(/<[^>]*>/g, "").trim() + "\n\n"}Relaunch
              the app.
            </Text>
          </ScrollView>
        </View>
      );
    }

    return (
      <View className="shadow-md flex-1">
        <ScrollView
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-lg w-full ${isDark ? "text-appwhite" : "text-appblack"} text-center shadow-md`}
          showsVerticalScrollIndicator={false}
        >
          <View className={`flex items-center justify-center mt-5`}>
            <Image
              source={require("../../assets/images/search_icon.png")}
              className={` w-30 h-30 my-3 items-center`}
              style={{ tintColor: "#27b1fa" }}
            />
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-center text-xl font-semibold`}
            >
              Choose a date{"\n"}to show appointments.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"} px-5`}>
      {(now >= start && now <= new Date(year, 11, 31, 23, 59, 59, 999)) ||
      (now.getMonth() === 0 && now <= end) ? (
        <SnowEffect count={37} speed={1.1} drift={26} />
      ) : (
        <></>
      )}
      <View className={`flex-row items-center justify-between mt-18`}>
        <Text
          className={`text-5xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          Guidance
        </Text>
        <View className="shadow-md">
          <TouchableOpacity
            onPress={() => {
              router.push("/AppointmentsPage");
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            }}
            disabled={isLoading}
          >
            <View
              className={`${isDark ? "bg-baccent/95 text-appwhite" : "bg-baccent text-appblack"} p-2 text-center rounded-lg font-medium text-lg px-3 `}
            >
              <Image
                source={require("../../assets/images/upcoming-calendar-icon.png")}
                className={`w-7 h-8`}
                style={{
                  tintColor: isDark ? "#111113" : "#fbfbfb",
                }}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View
        className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-lg w-full ${isDark ? "text-appwhite" : "text-appblack"} text-center mt-4`}
      >
        <View className={`items-center`}>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl mb-2`}
          >
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
        <View className={`flex-row justify-between`}>
          <TouchableOpacity
            onPress={() => {
              setShowDatePicker(true);
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            }}
            disabled={isLoading}
            className={`flex-1 mr-2`}
          >
            <Text
              className={`${isDark ? "text-appwhite bg-dark4" : "text-appblack bg-light4"} mt-3 p-2 pb-3 text-center rounded-lg text-lg`}
            >
              Choose a Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              checkGuidanceAvailability();
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            }}
            disabled={isLoading}
          >
            <View
              className={`${isDark ? "bg-baccent/95" : "bg-baccent"} mt-3 p-2 text-center rounded-lg font-medium text-lg px-3`}
            >
              <Image
                source={require("../../assets/images/calendar-icon.png")}
                className={`w-6 h-8`}
                style={{ tintColor: isDark ? "#111113" : "#fbfbfb" }}
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
          appointmentMeta={pendingAppointmentMeta ?? undefined}
          onResult={handleBookingResult}
          onError={handleBookingError}
          onLoadingChange={setIsLoading}
        />
      )}
      {formSubmissionData && (
        <TeachAssistAuthFetcher
          submitAppointmentForm={formSubmissionData}
          appointmentMeta={pendingAppointmentMeta ?? undefined}
          onResult={handleFormSubmissionResult}
          onError={handleFormSubmissionError}
          onLoadingChange={setIsLoading}
        />
      )}
    </View>
  );
};

export default Guidance;
