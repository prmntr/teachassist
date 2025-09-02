import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import TeachAssistAuthFetcher, {
  SecureStorage,
  AppointmentData,
} from "../(auth)/taauth";

interface AppointmentsPageProps {
  navigation?: any; // If using React Navigation
}

// view booked appointments
//* NOTE: not exaustive only since last fresh login, ta's appts tracking are unstable

const AppointmentsPage: React.FC<AppointmentsPageProps> = ({ navigation }) => {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelingAppointment, setCancelingAppointment] =
    useState<AppointmentData | null>(null);

  const router = useRouter();

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
    const date = new Date(dateString);
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
      ]
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
        result || "Failed to cancel appointment. Please try again."
      );
    }
  };

  // Handle cancellation error
  const handleCancellationError = (error: string) => {
    setLoading(false);
    setCancelingAppointment(null);
    Alert.alert(
      "Error",
      error || "An error occurred while cancelling the appointment."
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
    loadAppointments();
  }, []);

  // Render individual appointment item
  const renderAppointmentItem = ({ item }: { item: AppointmentData }) => (
    <View className="bg-3 rounded-xl p-4 mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-white text-lg font-semibold flex-1">
          {formatDate(item.date)}
        </Text>
        <View className="bg-blue-500/20 border border-blue-500/30 px-3 py-1 rounded-lg">
          <Text className="text-blue-400 font-semibold">
            {formatTime(item.time)}
          </Text>
        </View>
      </View>

      <View className="mb-4">
        {item.teacher && (
          <Text className="text-gray-300 mb-1">Teacher: {item.teacher}</Text>
        )}
        {item.subject && (
          <Text className="text-gray-300 mb-1">Subject: {item.subject}</Text>
        )}
        {item.reason && (
          <Text className="text-gray-300 mb-1">Reason: {item.reason}</Text>
        )}
        <Text className="text-gray-500 text-sm mt-2">
          Booked: {new Date(item.bookedAt).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity
        className={`py-3 px-4 rounded-lg items-center ${loading ? "bg-red-500/30" : "bg-red-500/80"}`}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          handleCancelAppointment(item);
        }}
        disabled={loading}
      >
        <Text className="text-white font-semibold">Cancel Appointment</Text>
      </TouchableOpacity>
    </View>
  );

  // Empty state component
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8">
      <Image
        source={require("../../assets/images/not_found.png")}
        className="w-30 h-30 mb-3"
        style={{ tintColor: "#27b1fa" }}
      />
      <Text className="text-white text-xl font-semibold text-center mb-2">
        No Upcoming Appointments
      </Text>
      <Text className="text-gray-400 text-center text-lg leading-6">
        You don&apos;t have any scheduled appointments. Book one through the guidance
        page!
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-2">
      <TouchableOpacity
        className="absolute top-15 left-5 flex flex-row items-center gap-2 bg-gray-700/80 rounded-lg px-4 py-2 shadow-lg z-10"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.replace("/guidance");
        }}
      >
        <Image
          className="w-8 h-8"
          style={{ tintColor: "#edebea" }}
          source={require("../../assets/images/arrow-icon-left.png")}
        />
        <Text className="text-white font-semibold text-lg">Back</Text>
      </TouchableOpacity>

      <View className="px-5 mt-23 mb-5 items-center ">
        <Text className="text-4xl font-semibold text-white mt-8">
          My Appointments
        </Text>
        <Text className="text-gray-300 text-md mt-1">
          Manage your scheduled guidance appointments
        </Text>
      </View>

      {/* stuff */}
      <View className="flex-1 px-5">
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
