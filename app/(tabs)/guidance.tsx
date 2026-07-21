import DateTimePicker from "@react-native-community/datetimepicker";
import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TeachAssistAuthFetcher, { AppointmentFormData } from "../(auth)/taauth";
import AppointmentBooking, {
  type AppointmentSlot,
} from "@/components/AppointmentBooking";
import AppointmentReasonForm from "@/components/AppointmentReasonForm";
import Text from "@/components/ui/AppText";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { SnowEffect } from "@/components/ui/SnowEffect";
import { hapticsImpact } from "@/utils/haptics";
import { useNativeTabsEnabled } from "@/utils/nativeTabs";
import {
  formatSchoolDate,
  getTodayInSchoolTimeZone,
  normalizeSchoolPickerDate,
  SCHOOL_TIME_ZONE,
} from "@/utils/schoolTime";
import { notePositiveInteraction } from "@/utils/storeReview";
import { useTheme } from "@/contexts/ThemeContext";

const HEADER_ACTION_BUTTON_SIZE = 48;
const HEADER_ACTION_ICON_SIZE = 25;

// Check if the result is an appointment form. Pure function of its input,
// hoisted out of the component so it has a stable identity — it's used
// inside useCallback'd handlers below and mustn't force them to change
// identity on every render.
const isAppointmentForm = (html: string): boolean => {
  return (
    html.includes('name="reason"') &&
    html.includes('type="radio"') &&
    html.includes("Submit Reason")
  );
};

const Guidance = () => {
  const { activeTone, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const nativeTabsEnabled = useNativeTabsEnabled();
  const isIOS = Platform.OS === "ios";
  const isLandscape = width > height;
  const headerTopMargin = isIOS ? 56 : 59;
  const isCompactLandscape = isLandscape && Math.min(width, height) < 600;
  const nativeTabBottomPadding = nativeTabsEnabled
    ? isLandscape
      ? 0
      : insets.bottom + 60
    : 8;
  const [selectedDate, setSelectedDate] = useState(() =>
    getTodayInSchoolTimeZone(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [guidanceResult, setGuidanceResult] = useState<string | null>(null);
  const [showFetcher, setShowFetcher] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentFormHtml, setAppointmentFormHtml] = useState<string>("");

  const [pendingAppointmentMeta, setPendingAppointmentMeta] = useState<{
    teacher?: string;
    subject?: string;
  } | null>(null);

  const minimumGuidanceDate = getTodayInSchoolTimeZone();

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
      setSelectedDate(normalizeSchoolPickerDate(date));
    }
  };

  // Memoized so TeachAssistAuthFetcher's effect (which depends on
  // onResult/onError) doesn't see a new function identity on every
  // Guidance re-render and re-fire an in-flight booking request — that
  // race was silently duplicating/losing appointment writes.
  const checkGuidanceAvailability = useCallback(async () => {
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
      setError(
        "No internet connection. Please check your connection and try again.",
      );
      setIsLoading(false);
      return;
    }
    setError(null);
    setGuidanceResult(null);
    setShowAppointmentForm(false);
    setShowFetcher(true);
  }, []);

  const handleGuidanceResult = useCallback((result: string) => {
    // Handle re-authentication success - retry the guidance check
    if (result.includes("REAUTH SUCCESS")) {
      // Don't set showFetcher to false, keep it true to retry
      return;
    }

    setGuidanceResult(result);
    setShowFetcher(false);
  }, []);

  const handleError = useCallback((error: string) => {
    console.error("Guidance error:", error);
    setError(error);
    setShowFetcher(false);
  }, []);

  // handle appointment booking using taauth
  const handleAppointmentPress = (appointment: AppointmentSlot) => {
    setPendingAppointmentMeta({
      teacher: appointment.counselorName,
    });
    setBookingUrl(appointment.link);
    setIsLoading(true);
    setShowAppointmentForm(false);
  };

  const handleBookingResult = useCallback(
    (result: string) => {
      // Handle re-authentication success - retry the booking
      if (result === "REAUTH SUCCESS") {
        // Don't clear bookingUrl, keep the booking request active to retry
        return;
      }

      // Check if the result is a form that needs to be filled
      if (isAppointmentForm(result)) {
        setAppointmentFormHtml(result);
        setShowAppointmentForm(true);
        setBookingUrl(null);
        setIsLoading(false);
        return;
      }

      // Handle final booking result
      if (result.includes("successfully")) {
        AppAlert.alert(
          "Appointment Successful",
          `You have been booked for a guidance appointment on ${formatSchoolDate(
            selectedDate,
            "en-GB",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            },
          )}.`,
          { icon: AlertIcon.calendar },
        );
        // Refresh the guidance data to show updated availability. Loading
        // is deliberately left on here — clearing it would flash the (now
        // stale) slot list for a moment before this refresh replaces it,
        // which reads as the screen refreshing twice.
        setTimeout(() => {
          checkGuidanceAvailability();
        }, 1000);
        notePositiveInteraction();
      } else {
        AppAlert.alert("Booking Failed", result, { icon: AlertIcon.error });
        setIsLoading(false);
      }

      setBookingUrl(null);
      setShowAppointmentForm(false);
      setPendingAppointmentMeta(null);
    },
    [selectedDate, checkGuidanceAvailability],
  );

  const handleBookingError = useCallback((error: string) => {
    console.error("Booking error:", error);
    AppAlert.alert(
      "Booking Failed",
      error || "An error occurred while booking the appointment.",
      { icon: AlertIcon.error },
    );
    setBookingUrl(null);
    setIsLoading(false);
    setShowAppointmentForm(false);
    setPendingAppointmentMeta(null);
  }, []);

  // Handle form submission
  const handleFormSubmit = (formData: AppointmentFormData) => {
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
    setPendingAppointmentMeta(null);
    AppAlert.alert("Booking Cancelled", "Appointment booking cancelled.", {
      icon: AlertIcon.error,
    });
  };

  // Handle form submission result
  const handleFormSubmissionResult = useCallback(
    (result: string) => {
      // Handle re-authentication success - retry the form submission
      if (result === "REAUTH SUCCESS") {
        // Don't clear formSubmissionData, keep the form submission request active to retry
        return;
      }

      if (result.includes("successfully")) {
        AppAlert.alert(
          "Appointment Successful",
          `Your guidance appointment has been booked for ${formatSchoolDate(
            selectedDate,
            "en-GB",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            },
          )}.`,
          { icon: AlertIcon.calendar },
        );
        // Refresh the guidance data to show updated availability. Loading
        // is deliberately left on here — clearing it would flash the (now
        // stale) slot list for a moment before this refresh replaces it,
        // which reads as the screen refreshing twice.
        setTimeout(() => {
          checkGuidanceAvailability();
        }, 1000);
        notePositiveInteraction();
      } else {
        AppAlert.alert("Booking Failed", result, { icon: AlertIcon.error });
        setIsLoading(false);
      }

      setFormSubmissionData(null);
      setPendingAppointmentMeta(null);
    },
    [selectedDate, checkGuidanceAvailability],
  );

  const handleFormSubmissionError = useCallback((error: string) => {
    console.error("Form submission error:", error);
    AppAlert.alert(
      "Booking Failed",
      error || "An error occurred while submitting the appointment request.",
      { icon: AlertIcon.error },
    );
    setFormSubmissionData(null);
    setIsLoading(false);
    setPendingAppointmentMeta(null);
  }, []);

  const renderDateChooser = () => {
    const content = (
      <>
        <View className={`items-center`}>
          {!isIOS && (
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl mb-1 text-center`}
            >
              {formatSchoolDate(selectedDate, "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          )}
          {isIOS ? (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="compact"
              onChange={handleDateChange}
              minimumDate={minimumGuidanceDate}
              timeZoneName={SCHOOL_TIME_ZONE}
              accentColor={activeTone.accent}
              textColor={isDark ? "#edebea" : "#2f3035"}
            />
          ) : (
            showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={minimumGuidanceDate}
                timeZoneName={SCHOOL_TIME_ZONE}
                accentColor={activeTone.accent}
              />
            )
          )}
        </View>
        <View
          className={
            isLandscape
              ? "mt-4"
              : isIOS
                ? "mt-4"
                : "flex-row justify-between mt-3"
          }
        >
          {!isIOS && (
            <LiquidGlassButton
              onPress={() => {
                setShowDatePicker(true);
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              }}
              disabled={isLoading}
              className={isLandscape ? "w-full mb-3" : "flex-1 mr-2"}
              contentStyle={{
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
              glassTintColor={activeTone.bg4}
              fallbackBackgroundColor={activeTone.bg4}
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-center rounded-xl text-lg`}
              >
                Choose a Date
              </Text>
            </LiquidGlassButton>
          )}
          <LiquidGlassButton
            onPress={() => {
              checkGuidanceAvailability();
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            }}
            disabled={isLoading}
            className={isIOS || isLandscape ? "w-full" : ""}
            contentStyle={{
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              alignItems: "center",
              justifyContent: "center",
            }}
            glassTintColor={activeTone.accent}
            fallbackBackgroundColor={activeTone.accent}
          >
            <View className="flex-row items-center justify-center">
              <Image
                source={require("../../assets/images/calendar-icon.png")}
                className={`w-6 h-8 `}
                style={{ tintColor: activeTone.bg1 }}
              />
              {isLandscape ? (
                <Text
                  className={`${isDark ? "text-appblack" : "text-appwhite"} text-xl text-bg1 font-semibold pl-3 text`}
                >
                  Choose a date
                </Text>
              ) : null}
            </View>
          </LiquidGlassButton>
        </View>
      </>
    );

    if (isLandscape) {
      return <View className="w-full">{content}</View>;
    }

    return (
      <LiquidGlassView
        containerClassName="w-full"
        className="rounded-xl p-6  w-full"
        fallbackBackgroundColor={activeTone.bg3}
        glassTintColor={activeTone.bg2}
        glassEffectStyle="clear"
      >
        {content}
      </LiquidGlassView>
    );
  };

  const renderLandscapeSidebar = () => (
    <LiquidGlassView
      containerClassName="flex-1"
      className="rounded-xl p-6"
      contentStyle={{ flex: 1 }}
      fallbackBackgroundColor={activeTone.bg3}
      glassTintColor={activeTone.bg2}
      glassEffectStyle="clear"
    >
      {!isCompactLandscape ? (
        <View className="items-center mb-10 mt-3">
          <View
            className={`${isDark ? "bg-dark4" : "bg-light4"} rounded-[12px] px-6 py-5 mb-8`}
          >
            <Image
              source={require("../../assets/images/calendar-check.png")}
              className="w-16 h-16"
              style={{ tintColor: activeTone.accent }}
            />
          </View>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-semibold text-center`}
          >
            Book Guidance
          </Text>
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-center text-sm mt-2 leading-6`}
          >
            Pick a day on the left, then review and book available counselor
            appointments on the right.
          </Text>
        </View>
      ) : null}
      {renderDateChooser()}
    </LiquidGlassView>
  );

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
        <LiquidGlassView
          containerClassName="flex-1"
          className="rounded-xl mb-4  w-full overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <ScrollView
            className="w-full h-full"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: 24,
              paddingTop: 20,
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-center mt-2 text-xl`}
            >
              Checking availability for
            </Text>
            <Text
              className={`text-baccent font-bold text-center mt-1 mb-10 text-2xl`}
            >
              {formatSchoolDate(selectedDate, "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <ActivityIndicator color={activeTone.accent} size="large" />
          </ScrollView>
        </LiquidGlassView>
      );
    }

    if (isLoading && (bookingUrl || formSubmissionData)) {
      const loadingText = formSubmissionData
        ? "Submitting appointment request for"
        : "Booking appointment for";

      return (
        <LiquidGlassView
          containerClassName="flex-1"
          className="rounded-xl mb-4  w-full overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <ScrollView
            className="w-full h-full"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 24,
            }}
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-center mt-2 mb-2 text-xl`}
            >
              {loadingText}
            </Text>
            <Text
              className={`text-baccent font-bold text-center mt-2 mb-10 text-2xl`}
            >
              {formatSchoolDate(selectedDate, "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <ActivityIndicator color={activeTone.accent} size="large" />
          </ScrollView>
        </LiquidGlassView>
      );
    }

    if (error) {
      return (
        <LiquidGlassView
          containerClassName="flex-1"
          className="rounded-xl mb-4  w-full overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <ScrollView
            className="w-full h-full"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 24,
            }}
          >
            <View className={`flex items-center justify-center`}>
              <Text
                className={`text-2xl text-baccent font-semibold mb-3 text-center`}
              >
                {formatSchoolDate(selectedDate, "en-GB", {
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
        </LiquidGlassView>
      );
    }

    if (guidanceResult === "NOT A SCHOOL DAY") {
      return (
        <LiquidGlassView
          containerClassName="flex-1"
          className="rounded-xl mb-4  w-full overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <ScrollView
            className="w-full h-full"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 24,
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View className={`flex items-center justify-center`}>
              <Text
                className={`text-2xl text-baccent font-semibold mb-3 text-center`}
              >
                {formatSchoolDate(selectedDate, "en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Text>
              <Image
                source={require("../../assets/images/not_found.png")}
                className={` w-30 h-30 my-3`}
                style={{ tintColor: activeTone.accent }}
              />
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-center text-xl`}
              >
                {formatSchoolDate(selectedDate, "en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }) + ` `}
                is not a school day.{`\n`}Choose another date and try again.
              </Text>
            </View>
          </ScrollView>
        </LiquidGlassView>
      );
    }

    // should never happen again
    if (guidanceResult && guidanceResult.includes("Login Failed")) {
      return (
        <LiquidGlassView
          className="my-5 px-5 py-3 rounded-xl"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <Text className={`text-xl text-danger text-center font-bold`}>
            Session expired. Please log in again.
          </Text>
        </LiquidGlassView>
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
        <LiquidGlassView
          containerClassName="flex-1"
          className="rounded-xl mb-4  w-full overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <ScrollView
            className="w-full h-full"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 24,
            }}
          >
            <Text
              className={`text-md ${isDark ? "text-appwhite" : "text-appblack"}`}
            >
              {guidanceResult.replace(/<[^>]*>/g, "").trim() + "\n\n"}Relaunch
              the app.
            </Text>
          </ScrollView>
        </LiquidGlassView>
      );
    }

    return (
      <LiquidGlassView
        containerClassName="flex-1"
        className="rounded-xl mb-4  w-full overflow-hidden"
        fallbackBackgroundColor={activeTone.bg3}
        glassTintColor={activeTone.bg2}
        glassEffectStyle="clear"
      >
        <ScrollView
          className="w-full h-full"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 24,
          }}
        >
          <View className={`flex items-center justify-center mt-5`}>
            <Image
              source={require("../../assets/images/search_icon.png")}
              className={` w-30 h-30 my-3 items-center`}
              style={{ tintColor: activeTone.accent }}
            />
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-center text-xl font-semibold`}
            >
              Choose a date{"\n"}to show appointments.
            </Text>
          </View>
        </ScrollView>
      </LiquidGlassView>
    );
  };

  return (
    <View
      className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"} px-5`}
      style={{ paddingBottom: nativeTabBottomPadding }}
    >
      <PageBackground />
      {(now >= start && now <= new Date(year, 11, 31, 23, 59, 59, 999)) ||
      (now.getMonth() === 0 && now <= end) ? (
        <SnowEffect count={37} speed={1.1} drift={26} />
      ) : (
        <></>
      )}
      <View
        className={`flex-row items-center justify-between`}
        style={{ marginTop: headerTopMargin }}
      >
        <Text
          className={`text-5xl font-semibold leading-[55px] ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          Guidance
        </Text>
        <View className="">
          <LiquidGlassButton
            onPress={() => {
              router.push("/AppointmentsPage");
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            }}
            disabled={isLoading}
            contentStyle={{
              borderRadius: 12,
              width: HEADER_ACTION_BUTTON_SIZE,
              height: HEADER_ACTION_BUTTON_SIZE - 5,
              alignItems: "center",
              justifyContent: "center",
            }}
            glassTintColor={activeTone.accent}
            fallbackBackgroundColor={activeTone.accent}
          >
            <Image
              source={require("../../assets/images/calendar.png")}
              style={{
                width: HEADER_ACTION_ICON_SIZE,
                height: HEADER_ACTION_ICON_SIZE,
                resizeMode: "contain",
                tintColor: isDark ? "#111113" : "#fbfbfb",
              }}
            />
          </LiquidGlassButton>
        </View>
      </View>
      {isLandscape ? (
        <View className="flex-1 flex-row gap-4 mt-4 mb-1">
          <View className="self-stretch mb-4" style={{ flex: 1 }}>
            {renderLandscapeSidebar()}
          </View>
          <View style={{ flex: 2 }}>{renderGuidanceContent()}</View>
        </View>
      ) : (
        <>
          <View className="mt-4 mb-4">{renderDateChooser()}</View>
          {renderGuidanceContent()}
        </>
      )}
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
