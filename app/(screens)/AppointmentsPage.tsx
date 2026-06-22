import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import TeachAssistAuthFetcher, {
  AppointmentData,
  SecureStorage,
} from "../(auth)/taauth";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import {
  formatSchoolDate,
  formatSchoolTime,
  parseSchoolDate,
  parseSchoolDateTime,
} from "@/utils/schoolTime";
import { buildTeachAssistUrl } from "@/utils/serverConfig";
import { useLiquidGlassActive } from "@/utils/liquidGlass";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";

// view booked appointments
//* NOTE: not exaustive only since last fresh login, ta's appts tracking are shit and unstable

const AppointmentsPage = () => {
  const { activeTone, isDark } = useTheme();
  const liquidGlassEnabled = useLiquidGlassActive();
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelingAppointment, setCancelingAppointment] =
    useState<AppointmentData | null>(null);

  const [showInfo, setShowInfo] = useState(false);

  const [reasonMapping, setReasonMapping] = useState<Record<string, string>>(
    {},
  );

  // Load appointments
  const loadAppointments = async () => {
    try {
      const appointmentsJson = await SecureStorage.load("ta_appointments");
      if (appointmentsJson) {
        const parsedAppointments: AppointmentData[] =
          JSON.parse(appointmentsJson);
        // Filter out past appointments and sort by date/time
        const futureAppointments = parsedAppointments
          .filter((apt) => {
            const appointmentDateTime = parseSchoolDateTime(apt.date, apt.time);
            return appointmentDateTime > new Date();
          })
          .sort((a, b) => {
            const dateTimeA = parseSchoolDateTime(a.date, a.time);
            const dateTimeB = parseSchoolDateTime(b.date, b.time);
            return dateTimeA.getTime() - dateTimeB.getTime();
          });

        setAppointments(futureAppointments);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error("Error loading appointments:", error);
      setAppointments([]);
    }
  };

  // format
  const formatDate = (dateString: string): string => {
    return formatSchoolDate(parseSchoolDate(dateString), "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time for display
  const formatTime = (dateString: string, timeString: string): string => {
    return formatSchoolTime(
      parseSchoolDateTime(dateString, timeString),
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      },
    );
  };

  // handle appointment cancellation
  const handleCancelAppointment = (appointment: AppointmentData) => {
    Alert.alert(
      "Cancel Appointment",
      `Are you sure you want to cancel your appointment on ${formatDate(appointment.date)} at ${formatTime(appointment.date, appointment.time)}?`,
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => cancelAppointment(appointment),
        },
      ],
    );
  };

  // cancel appointment using TeachAssist
  const cancelAppointment = (appointment: AppointmentData) => {
    setCancelingAppointment(appointment);
    setLoading(true);
  };

  // handle cancellation result
  const handleCancellationResult = (result: string) => {
    setLoading(false);
    setCancelingAppointment(null);

    if (
      result.toLowerCase().includes("success") ||
      result.toLowerCase().includes("cancelled")
    ) {
      Alert.alert("Success", "Appointment cancelled successfully!");
      loadAppointments(); // Refresh the list
    } else {
      Alert.alert(
        "Error",
        result || "Failed to cancel appointment. Please try again.",
      );
    }
  };

  // Handle cancellation error
  const handleCancellationError = (error: string) => {
    setLoading(false);
    setCancelingAppointment(null);
    Alert.alert(
      "Error",
      error || "An error occurred while cancelling the appointment.",
    );
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  // Load appointments on component mount
  useEffect(() => {
    const loadReasonMapping = async () => {
      try {
        const mappingJson = await SecureStorage.load("reason_mapping");
        if (mappingJson) {
          setReasonMapping(JSON.parse(mappingJson));
        }
      } catch (error) {
        console.error("Error loading reason mapping:", error);
      }
    };

    loadReasonMapping();
    loadAppointments();
  }, []);

  // Render individual appointment item
  const renderAppointmentItem = ({ item }: { item: AppointmentData }) => (
    <LiquidGlassView
      className="rounded-xl p-4 mb-4"
      fallbackBackgroundColor={activeTone.bg3}
      glassTintColor={activeTone.bg2}
      glassEffectStyle="clear"
    >
      <View className={`flex-row justify-between items-center mb-2`}>
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold flex-1`}
        >
          {formatDate(item.date)}
        </Text>
        <View className={`bg-baccent/80 px-3 py-2 rounded-xl`}>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} font-normal`}
          >
            {formatTime(item.date, item.time)}
          </Text>
        </View>
      </View>

      <View className={`mb-6 mt-2`}>
        {item.teacher && (
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-lg`}
          >
            Counselor:{" "}
            <Text className="text-baccent font-bold">{item.teacher}</Text>
          </Text>
        )}
        {item.reason && (
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-lg`}
          >
            Appointment for:{" "}
            <Text className="text-baccent font-bold">
              {reasonMapping[item.reason] || item.reason}
            </Text>
          </Text>
        )}
        <Text
          className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-lg`}
        >
          Booked:{" "}
          <Text className="text-baccent font-bold">
            {formatSchoolDate(new Date(item.bookedAt), "en-US")}
          </Text>
        </Text>
      </View>

      <TouchableOpacity
        className={`py-3 px-4 rounded-xl items-center bg-danger/70`}
        onPress={() => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          handleCancelAppointment(item);
        }}
        disabled={loading}
      >
        <Text className={`text-appwhite font-semibold`}>
          Cancel Appointment
        </Text>
      </TouchableOpacity>
    </LiquidGlassView>
  );

  // Empty state component
  const renderEmptyState = () => (
    <LiquidGlassView
      className="rounded-xl p-5 h-full"
      fallbackBackgroundColor={activeTone.bg3}
      glassTintColor={activeTone.bg2}
      glassEffectStyle="clear"
    >
      <View className={`flex-1 items-center justify-center px-8`}>
        <Image
          source={require("../../assets/images/not_found.png")}
          className={`w-30 h-30 mb-3`}
          style={{ tintColor: activeTone.accent }}
        />
        <Text
          className={`${isDark ? "text-light3" : "text-dark3"} text-xl font-semibold text-center mb-2`}
        >
          No upcoming appointments
        </Text>
        <Text className={`text-gray-400 text-center text-lg leading-6`}>
          You don&apos;t have any scheduled appointments. Book one through the
          guidance page!
        </Text>
      </View>
    </LiquidGlassView>
  );

  const renderListHeader = () => (
    <View className="mb-6">
      <Text
        className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
      >
        My Appointments
      </Text>
      <Text
        className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
      >
        View, manage, and cancel upcoming guidance appointments.
      </Text>
    </View>
  );

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <Modal visible={showInfo} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl py-6 px-6 w-full max-w-md`}
          >
            <View className="flex items-center mb-6">
              <Image
                source={require("../../assets/images/betta-fish3.png")}
                className="object-scale-down"
                style={{
                  width: 110,
                  height: 92,
                }}
              ></Image>
            </View>
            <View className="flex-row items-center mb-4">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
              >
                My Appointments
              </Text>
            </View>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} mb-4`}
            >
              This page keeps track of guidance appointments made within the
              app, allowing you to view and delete appointments.
              {`\n\n`}
              <Text className="font-semibold text-baccent">
                Note: This list is not exaustive! If you booked an appointment
                off the app or if you signed out recently, it may not show up.
                Check the TeachAssist website for confirmation.
              </Text>
            </Text>
            <TouchableOpacity
              className={`mt-2 ${isDark ? "bg-baccent/80" : "bg-baccent"} rounded-xl p-3`}
              onPress={() => {
                hapticsNotification(Haptics.NotificationFeedbackType.Success);
                setShowInfo(false);
                buildTeachAssistUrl("yrdsb/").then((url) => {
                  Linking.openURL(url);
                });
              }}
            >
              <Text
                className={`${isDark ? "text-appblack" : "text-appwhite"} font-medium text-center`}
              >
                TeachAssist Website
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`mt-2 ${isDark ? "bg-dark4" : "bg-light4"} rounded-xl p-3`}
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                setShowInfo(false);
              }}
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-center font-medium`}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <BackButton path={"/guidance"} />
      <LiquidGlassButton
        containerStyle={{
          position: "absolute",
          top: 60,
          right: 20,
          zIndex: 50,
        }}
        contentStyle={{
          width: liquidGlassEnabled ? 48 : undefined,
          height: liquidGlassEnabled ? 48 : undefined,
          borderRadius: liquidGlassEnabled ? 999 : 12,
          paddingHorizontal: liquidGlassEnabled ? 0 : 8,
          paddingVertical: liquidGlassEnabled ? 0 : 8,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.18 : 0.1,
          shadowRadius: 8,
          shadowOffset: {
            width: 0,
            height: 4,
          },
          elevation: 4,
        }}
        glassTintColor={activeTone.bg4}
        fallbackBackgroundColor={activeTone.bg4}
        onPress={() => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          setShowInfo(true);
        }}
      >
        <Image
          source={require("../../assets/images/question.png")}
          className={liquidGlassEnabled ? "w-7 h-7" : "w-8 h-8"}
          style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
        />
      </LiquidGlassButton>
      <FlatList
        data={appointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={activeTone.accent}
            colors={[activeTone.accent, "#43a25a", "#fcc245", "#f67c15"]}
            progressBackgroundColor={activeTone.bg1}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 118,
          paddingBottom: 150,
          paddingHorizontal: 20,
          flexGrow: 1,
        }}
      />

      {cancelingAppointment && (
        <TeachAssistAuthFetcher
          cancelAppointment={{
            date: cancelingAppointment.date,
            time: cancelingAppointment.time,
            id: cancelingAppointment.id,
            schoolId: cancelingAppointment.schoolId,
          }}
          onResult={handleCancellationResult}
          onError={handleCancellationError}
          onLoadingChange={setLoading}
        />
      )}

      {/* stuff */}
    </View>
  );
};

export default AppointmentsPage;
