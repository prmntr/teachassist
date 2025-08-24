import * as Haptics from "expo-haptics";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

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

const AppointmentBooking: React.FC<AppointmentBookingProps> = ({
  html,
  onAppointmentPress,
}) => {
  // date has to be rendered here b/c if date is changed the component won't refresh and this is easier than using a useeffect
  const extractDate = (htmlContent: string): string => {
    const dateMatch = htmlContent.match(
      /Appointment Bookings on (\d{4}-\d{2}-\d{2})/
    );
    return dateMatch ? dateMatch[1] : "Unknown Date";
  };

  const parseAppointments = (htmlContent: string): Appointment[] => {
    const appointments: Appointment[] = [];

    // find all guidance councellors
    const counselorRegex =
      /<div class="box"[^>]*><h3>([^:]+):\s*<\/h3>([\s\S]*?)<\/div>/g;
    let counselorMatch;

    while ((counselorMatch = counselorRegex.exec(htmlContent)) !== null) {
      const counselorName = counselorMatch[1].trim();
      const appointmentSection = counselorMatch[2];
      // get the links for each person
      const linkRegex = /<a href="([^"]+)">@\s*(\d{2}:\d{2}:\d{2})<\/a>/g;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(appointmentSection)) !== null) {
        const link = linkMatch[1];
        const time = linkMatch[2];

        // get id
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
    // sort by time; should already be done
    appointments.sort((a, b) => a.time.localeCompare(b.time));

    return appointments;
  };

  const date = extractDate(html);
  const appointments = parseAppointments(html);

  const handleAppointmentPress = (appointment: Appointment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Book Appointment",
      `Book with ${appointment.counselorName} at ${appointment.time}?`,
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

  // format time
  const formatTime = (time: string): string => {
    return time.substring(0, 5); // dont show seconds
  };

  // grouped by councellor
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

  if (html.includes("NOT A SCHOOL DAY")) {
    return (
      <ScrollView
        className="bg-3 rounded-xl p-6 mb-4 shadow-lg w-full"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl text-baccent font-semibold mb-3 text-center">
          {date}
        </Text>
        <Text className="text-appwhite text-center text-lg">
          {date + ` `}
          is not a school day.{`\n`}Choose another date and try again.
        </Text>
      </ScrollView>
    );
  }

  if (appointments.length === 0) {
    return (
      <ScrollView showsVerticalScrollIndicator={false} className="items-center">
        <Text className="text-2xl text-baccent font-semibold mb-3 text-center">
          {date}
        </Text>
        <Text className="font-semibold text-xl mb-2">
          No appointments available
        </Text>
        <Text className="text-appwhite text-center">
          There are currently no open appointment slots for {date}.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="bg-3 rounded-xl p-6 mb-4 shadow-lg w-full"
    >
      <View className="mb-4">
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
                  className="bg-blue-500/20 border-blue-500/30 border px-4 py-3 rounded-lg flex-1"
                  style={{ minWidth: 100, maxWidth: "45%" }}
                >
                  <Text className="text-blue-400 font-medium text-center">
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
