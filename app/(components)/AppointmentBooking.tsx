import * as Haptics from "expo-haptics";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Appointment {
  counselorName: string;
  time: string;
  link: string;
  id: string;
}

interface AppointmentBookingProps {
  html: string;
  onAppointmentPress: (link: string) => void;
}

// booking component to show dates + people

const AppointmentBooking: React.FC<AppointmentBookingProps> = ({
  html,
  onAppointmentPress,
}) => {
  // get date from html
  const extractDate = (htmlContent: string): string => {
    const dateMatch = htmlContent.match(
      /Appointment Bookings on (\d{4}-\d{2}-\d{2})/
    );
    return dateMatch ? dateMatch[1] : "Unknown Date";
  };

  const parseAppointments = (htmlContent: string): Appointment[] => {
    const appointments: Appointment[] = [];

    const counselorRegex =
      /<div class="box"[^>]*>\s*<h3>([^:]+):\s*(?:Guidance\s*\(([^)]+)\))?[^<]*<\/h3>([\s\S]*?)(?=<\/div>|<div class="box")/g;

    let counselorMatch;
    while ((counselorMatch = counselorRegex.exec(htmlContent)) !== null) {
      const baseName = counselorMatch[1].trim();
      const guidanceLetters = counselorMatch[2]; // could be undefined if no letters
      const appointmentSection = counselorMatch[3];

      // some schools have last name based people
      const counselorName = guidanceLetters
        ? `${baseName} (${guidanceLetters})`
        : baseName;

      // get appointment links and times
      const linkRegex = /<a href="([^"]+)">@\s*(\d{2}:\d{2}:\d{2})<\/a>/g;
      let linkMatch;

      while ((linkMatch = linkRegex.exec(appointmentSection)) !== null) {
        const link = linkMatch[1];
        const time = linkMatch[2];
        // Extract ID from link for unique identification
        const idMatch = link.match(/id=(\d+)/);
        const id = idMatch ? idMatch[1] : Math.random().toString();

        appointments.push({
          counselorName,
          time,
          link: `https://ta.yrdsb.ca/live/students/${link}`,
          id: `${counselorName}-${time}-${id}`,
        });
      }
    }

    // sort by time, should already be sorted
    appointments.sort((a, b) => a.time.localeCompare(b.time));

    return appointments;
  };

  const date = extractDate(html);
  const appointments = parseAppointments(html);

  const handleAppointmentPress = (appointment: Appointment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Book Appointment",
      `Book with ${appointment.counselorName} at ${formatTime(appointment.time)}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
        {
          text: "Book",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAppointmentPress(appointment.link);
          },
        },
      ]
    );
  };

  // remove seconds
  const formatTime = (time: string): string => {
    return time.substring(0, 5);
    // not adding appt duration because we dont know how long each lasts; councillors have lives
  };

  // group appointments by counselor
  const groupedAppointments = appointments.reduce(
    (groups, appointment) => {
      const counselor = appointment.counselorName;
      if (!groups[counselor]) {
        groups[counselor] = [];
      }
      groups[counselor].push(appointment);
      return groups;
    },
    {} as Record<string, Appointment[]>
  );

  // Handle special cases
  if (html.includes("NOT A SCHOOL DAY")) {
    return (
      <ScrollView
        className="bg-3 rounded-xl p-6 mb-4 shadow-lg w-full"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex items-center justify-center mt-10">
          <Text className="text-2xl text-baccent font-semibold mb-3 text-center">
            {date}
          </Text>
          <Image
            source={require("../../assets/images/not_found.png")}
            className="w-30 h-30 my-3"
            style={{ tintColor: "#27b1fa" }}
          />
          <Text className="text-appwhite text-center text-lg">
            {date} is not a school day.{"\n"}Choose another date and try again.
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (appointments.length === 0) {
    return (
      <ScrollView
        className="bg-3 rounded-xl p-6 mb-6 shadow-lg w-full"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex items-center justify-center">
          <Text className="text-2xl text-baccent font-semibold mb-3 text-center">
            {date}
          </Text>
          <Image
            source={require("../../assets/images/not_found.png")}
            className="w-30 h-30 my-3"
            style={{ tintColor: "#27b1fa" }}
          />
          <Text className="text-appwhite text-center text-lg">
            No appointments are currently available for {date}.{"\n"}Choose
            another date and try again.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="bg-3 rounded-xl p-6 mb-4 shadow-lg w-full"
    >
      <View className="mb-5">
        <Text className="text-2xl text-baccent font-semibold mb-3 text-center">
          {date}
        </Text>
        <Text className="text-emerald-400 text-2xl font-semibold mb-1 text-center">
          {appointments.length} slot{appointments.length !== 1 ? "s" : ""}{" "}
          {appointments.length !== 1 ? "available." : "left!"}
        </Text>
        <Text className="text-appwhite/70 text-center">
          Choose a time slot to book an appointment.
        </Text>
      </View>

      {/* may break but probably not this site sucks */}
      {Object.keys(groupedAppointments).some((name) => name.includes("(")) && (
        <View className="mb-4">
          <Text className="bg-emerald-500/20 border-emerald-500/30 border text-emerald-400/80 p-2 px-3 text-center rounded-lg font-medium">
            Your school has last name based counselors! Remember to choose the
            counselor corresponding to your last name.
          </Text>
        </View>
      )}

      {/* Render appts grouped by counselor */}
      {Object.entries(groupedAppointments).map(
        ([counselorName, counselorAppointments]) => (
          <View key={counselorName} className="mb-6">
            <Text className="text-baccent text-lg font-semibold mb-3 text-center">
              {counselorName}
            </Text>
            <View className="flex-row flex-wrap justify-center gap-3">
              {counselorAppointments.map((appointment) => (
                <TouchableOpacity
                  key={appointment.id}
                  onPress={() => handleAppointmentPress(appointment)}
                  className="bg-4 px-4 py-3 rounded-lg flex-1"
                  style={{ minWidth: 100, maxWidth: "45%" }}
                >
                  <Text className="text-appwhite font-medium text-center">
                    {formatTime(appointment.time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      )}
    </ScrollView>
  );
};

export default AppointmentBooking;
