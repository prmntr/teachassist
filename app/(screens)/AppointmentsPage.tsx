import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
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
import { DEFAULT_STATUS_COLORS } from "@/utils/themeSystem";
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

  // Load appointments. Re-reads from storage every time — this is also
  // what powers pull-to-refresh, since there's no server-side "list my
  // appointments" endpoint to sync against; refreshing means re-deriving
  // the current view from local storage, not a no-op.
  const loadAppointments = useCallback(async () => {
    try {
      const appointmentsJson = await SecureStorage.load("ta_appointments");
      if (appointmentsJson) {
        const parsedAppointments: AppointmentData[] =
          JSON.parse(appointmentsJson);

        // Older bookings could collide on id (a since-fixed bug in demo
        // appointment generation), which made entries randomly vanish from
        // this FlatList since React drops duplicate keys. Self-heal any
        // stored data still carrying that: keep the most recent write per id.
        const dedupedAppointments = Array.from(
          new Map(
            parsedAppointments.map((apt) => [apt.id, apt] as const),
          ).values(),
        );
        if (dedupedAppointments.length !== parsedAppointments.length) {
          await SecureStorage.save(
            "ta_appointments",
            JSON.stringify(dedupedAppointments),
          );
        }

        // Filter out past appointments and sort by date/time
        const futureAppointments = dedupedAppointments
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
  }, []);

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
    AppAlert.alert(
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
      { icon: AlertIcon.question },
    );
  };

  // cancel appointment using TeachAssist
  const cancelAppointment = (appointment: AppointmentData) => {
    setCancelingAppointment(appointment);
    setLoading(true);
  };

  // handle cancellation result. Memoized for the same reason loadAppointments
  // is: TeachAssistAuthFetcher's effect depends on onResult/onError, so an
  // unmemoized handler here could re-fire an in-flight cancel request if
  // this screen re-renders for an unrelated reason mid-request.
  const handleCancellationResult = useCallback(
    (result: string) => {
      setLoading(false);
      setCancelingAppointment(null);

      if (
        result.toLowerCase().includes("success") ||
        result.toLowerCase().includes("cancelled")
      ) {
        AppAlert.alert("Success", "Appointment cancelled successfully!", {
          icon: AlertIcon.success,
        });
        loadAppointments(); // Refresh the list
      } else {
        AppAlert.alert(
          "Error",
          result || "Failed to cancel appointment. Please try again.",
          { icon: AlertIcon.error },
        );
      }
    },
    [loadAppointments],
  );

  // Handle cancellation error
  const handleCancellationError = useCallback((error: string) => {
    setLoading(false);
    setCancelingAppointment(null);
    AppAlert.alert(
      "Error",
      error || "An error occurred while cancelling the appointment.",
      { icon: AlertIcon.error },
    );
  }, []);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  // Reload every time this screen gains focus, not just on first mount —
  // React Navigation keeps pushed screens alive in the background, so a
  // mount-only load would keep showing whatever was booked as of the last
  // time this screen was freshly created, which is what made newly booked
  // appointments require a full app restart to show up.
  useFocusEffect(
    useCallback(() => {
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
    }, [loadAppointments]),
  );

  // Render individual appointment item
  const renderAppointmentItem = ({ item }: { item: AppointmentData }) => (
    <LiquidGlassView
      className="rounded-xl p-4 mb-4"
      fallbackBackgroundColor={activeTone.bg3}
      glassTintColor={activeTone.bg2}
      glassEffectStyle="clear"
    >
      <View className={`flex-row justify-between items-start mb-3`}>
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold flex-1`}
        >
          {formatDate(item.date)}
        </Text>
        <View className={`bg-baccent rounded-xl px-3 py-1.5 ml-3`}>
          <Text
            className={`${isDark ? "text-appblack" : "text-appwhite"} text-sm font-semibold`}
          >
            {formatTime(item.date, item.time)}
          </Text>
        </View>
      </View>

      <View className={`mb-4 gap-1`}>
        {item.teacher && (
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-base`}
          >
            Counselor:{" "}
            <Text className="text-baccent font-semibold">{item.teacher}</Text>
          </Text>
        )}
        {item.reason && (
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-base`}
          >
            Appointment for:{" "}
            <Text className="text-baccent font-semibold">
              {reasonMapping[item.reason] || item.reason}
            </Text>
          </Text>
        )}
        <Text
          className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-base`}
        >
          Booked:{" "}
          <Text className="text-baccent font-semibold">
            {formatSchoolDate(new Date(item.bookedAt), "en-US")}
          </Text>
        </Text>
      </View>

      <LiquidGlassButton
        contentStyle={{
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
        glassTintColor={DEFAULT_STATUS_COLORS.danger}
        fallbackBackgroundColor={DEFAULT_STATUS_COLORS.danger}
        onPress={() => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          handleCancelAppointment(item);
        }}
        disabled={loading}
      >
        <Text className={`text-appwhite font-semibold`}>
          Cancel Appointment
        </Text>
      </LiquidGlassButton>
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
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
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
            progressViewOffset={110}
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
