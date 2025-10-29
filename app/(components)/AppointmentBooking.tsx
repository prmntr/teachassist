import * as Haptics from "expo-haptics";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";

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
  const { isDark } = useTheme();

  // i'm not proud
  if (
    html
      .toLocaleLowerCase()
      .includes("have reports that are available for viewing")
  ) {
    return (
      <View className="flex-1 shadow-md">
        <ScrollView
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-lg w-full`}
          showsVerticalScrollIndicator={false}
        >
          <View className={`flex items-center justify-center`}>
            <Text
              className={`text-2xl text-baccent font-semibold mb-3 text-center`}
            >
              Appointment Update
            </Text>
            <Image
              source={require("../../assets/images/refresh.png")}
              className={`w-20 h-20 my-3`}
              style={{ tintColor: "#27b1fa" }}
            />
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-center text-lg`}
            >
              TeachAssist has refreshed the appointment list. Choose a date to
              see the changes!
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }
  // get date from html
  const extractDate = (htmlContent: string): string => {
    const dateMatch = htmlContent.match(
      /Appointment Bookings on (\d{4}-\d{2}-\d{2})/
    );

    if (!dateMatch) return "Unknown Date";

    const dateString = dateMatch[1];

    // Parse the date components manually to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed

    // Format it consistently with your selected date format
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
      <View className="flex-1 shadow-md">
        <ScrollView
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-4 shadow-lg w-full`}
          showsVerticalScrollIndicator={false}
        >
          <View className={`flex items-center justify-center mt-10`}>
            <Text
              className={`text-2xl text-baccent font-semibold mb-3 text-center`}
            >
              {date}
            </Text>
            <Image
              source={require("../../assets/images/not_found.png")}
              className={`w-30 h-30 my-3`}
              style={{ tintColor: "#27b1fa" }}
            />
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-center text-lg`}
            >
              {date} is not a school day.{"\n"}Choose another date and try
              again.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (appointments.length === 0) {
    return (
      <View className="flex-1 shadow-md">
        <ScrollView
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-6 shadow-lg w-full`}
          showsVerticalScrollIndicator={false}
        >
          <View className={`flex items-center justify-center`}>
            <Text
              className={`text-2xl text-baccent font-semibold mb-3 text-center`}
            >
              {date}
            </Text>
            <Image
              source={require("../../assets/images/not_found.png")}
              className={`w-30 h-30 my-3`}
              style={{ tintColor: "#27b1fa" }}
            />
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-center text-lg`}
            >
              No appointments are currently available for {date}.{"\n"}Choose
              another date and try again.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 shadow-md">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-6 mb-4 shadow-lg w-full`}
      >
        <View className={`mb-5 ${isDark ? "bg-dark4" : "bg-light4"} p-3 py-5 rounded-lg`}>
          <Text
            className={`text-2xl text-baccent font-semibold mb-3 text-center`}
          >
            {date}
          </Text>
          <Text
            className={`text-emerald-500 text-2xl font-semibold mb-1 text-center`}
          >
            {appointments.length} slot{appointments.length !== 1 ? "s" : ""}{" "}
            {appointments.length !== 1 ? "available." : "left!"}
          </Text>
          <Text
            className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-center`}
          >
            Choose a time slot to book an appointment.
          </Text>
        </View>

        {/* may break but probably not this site sucks */}
        {Object.keys(groupedAppointments).some(
          (name) => name.includes("(") || name.includes("-")
        ) && <View className={``}></View>}

        {/* Render appts grouped by counselor */}
        {Object.entries(groupedAppointments).map(
          ([counselorName, counselorAppointments]) => (
            <View key={counselorName} className={`mb-6`}>
              <Text
                className={`text-baccent text-lg font-semibold mb-3 text-center`}
              >
                {counselorName}
              </Text>
              <View className={`flex-row flex-wrap justify-center gap-3`}>
                {counselorAppointments.map((appointment) => (
                  <TouchableOpacity
                    key={appointment.id}
                    onPress={() => handleAppointmentPress(appointment)}
                    className={`${isDark ? "bg-dark4" : "bg-light4"} px-4 py-3 rounded-lg flex-1`}
                    style={{ minWidth: 100, maxWidth: "45%" }}
                  >
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} font-medium text-center`}
                    >
                      {formatTime(appointment.time)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
};

export default AppointmentBooking;
