import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TeachAssistAuthFetcher, {
  AppointmentData,
  SecureStorage,
} from "../(auth)/taauth";
import { useTheme } from "../contexts/ThemeContext";
import BackButton from "./Back";
import { hapticsImpact, hapticsNotification } from "../(utils)/haptics";

// view booked appointments
//* NOTE: not exaustive only since last fresh login, ta's appts tracking are shit and unstable

const AppointmentsPage = () => {
  const { isDark } = useTheme();
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
            const appointmentDateTime = new Date(`${apt.date}T${apt.time}`);
            return appointmentDateTime > new Date();
          })
          .sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.time}`);
            const dateTimeB = new Date(`${b.date}T${b.time}`);
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
    const [year, month, day] = dateString.split("-").map(Number);
    const date =
      Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)
        ? new Date(dateString)
        : new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time for display
  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // handle appointment cancellation
  const handleCancelAppointment = (appointment: AppointmentData) => {
    Alert.alert(
      "Cancel Appointment",
      `Are you sure you want to cancel your appointment on ${formatDate(appointment.date)} at ${formatTime(appointment.time)}?`,
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
          console.log(JSON.parse(mappingJson));
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
    <View
      className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-4 mb-4`}
    >
      <View className={`flex-row justify-between items-center mb-2`}>
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold flex-1`}
        >
          {formatDate(item.date)}
        </Text>
        <View className={`bg-baccent/80 px-3 py-2 rounded-lg`}>
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} font-normal`}
          >
            {formatTime(item.time)}
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
            {new Date(item.bookedAt).toLocaleDateString()}
          </Text>
        </Text>
      </View>

      <TouchableOpacity
        className={`py-3 px-4 rounded-lg items-center bg-danger`}
        onPress={() => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          handleCancelAppointment(item);
        }}
        disabled={loading}
      >
        <Text className={`text-white font-semibold`}>Cancel Appointment</Text>
      </TouchableOpacity>
    </View>
  );

  // Empty state component
  const renderEmptyState = () => (
    <View className={`flex-1 items-center justify-center px-8`}>
      <Image
        source={require("../../assets/images/not_found.png")}
        className={`w-30 h-30 mb-3`}
        style={{ tintColor: "#27b1fa" }}
      />
      <Text
        className={`${isDark ? "text-light3" : "text-dark3"} text-xl font-semibold text-center mb-2`}
      >
        No Upcoming Appointments
      </Text>
      <Text className={`text-gray-400 text-center text-lg leading-6`}>
        You don&apos;t have any scheduled appointments. Book one through the
        guidance page!
      </Text>
    </View>
  );

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <Modal visible={showInfo} transparent animationType="slide">
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
              app, allowing you to view, and delete appointments, and notifies
              you before your time.
              {`\n\n`}
              <Text className="font-semibold text-baccent">
                Note: This list is not exaustive! If you booked an appointment
                off the app or if you signed out recently, it may not show up.
                Check the TeachAssist website for confirmation.
              </Text>
            </Text>
            <TouchableOpacity
              className={`mt-2 ${isDark ? "bg-baccent/80" : "bg-baccent"} rounded-lg p-3`}
              onPress={() => {
                hapticsNotification(Haptics.NotificationFeedbackType.Success);
                setShowInfo(false);
                Linking.openURL("https://ta.yrdsb.ca/yrdsb/");
              }}
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} font-medium text-center`}
              >
                TeachAssist Website
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`mt-2 ${isDark ? "bg-dark4" : "bg-light4"} rounded-lg p-3`}
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
      <TouchableOpacity
        className={`absolute top-13 right-5 flex flex-row items-center z-50 gap-2 ${isDark ? "bg-dark4" : "bg-light4"} rounded-lg px-2 py-2 shadow-md`}
        onPress={() => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          setShowInfo(true);
        }}
      >
        <Image
          source={require("../../assets/images/question.png")}
          className="w-8 h-8"
          style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
        />
      </TouchableOpacity>
      <View className={`px-5 mt-23 mb-5 items-center`}>
        <Text
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"} mt-8`}
        >
          My Appointments
        </Text>
        <Text
          className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-center text-lg mt-1`}
        >
          Manage upcoming guidance appointments
        </Text>
      </View>

      {/* stuff */}
      <View className={`flex-1 px-5`}>
        {appointments.length === 0 && !loading ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={appointments}
            renderItem={renderAppointmentItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#27b1fa"
                colors={["#27b1fa"]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

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
    </View>
  );
};

export default AppointmentsPage;
