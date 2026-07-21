import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import AnimatedProgressWheel from "react-native-progress-wheel";
import { SecureStorage } from "../(auth)/taauth";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import { useLiquidGlassActive } from "@/utils/liquidGlass";
import { notePositiveInteraction } from "@/utils/storeReview";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import AppToggle from "@/components/ui/AppToggle";
import AppTextInput from "@/components/ui/AppTextInput";
import BackButton from "@/components/ui/Back";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";

const VolunteerTracking = () => {
  const { activeTone, isDark } = useTheme();
  const liquidGlassEnabled = useLiquidGlassActive();
  const isIOS = Platform.OS === "ios";
  const [volunteerHours, setVolunteerHours] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  // Save to storage on change, but only after initial load
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await SecureStorage.save(
          "volunteer_hours",
          JSON.stringify(volunteerHours),
        );
      } catch (e) {
        console.error("Failed to save volunteer hours:", e);
      }
    })();
  }, [volunteerHours, loaded]);

  // Open modal for add
  const openAddModal = () => {
    setModalData(null);
    setEditingIndex(null);
    setShowModal(true);
  };

  // Open modal for edit
  const openEditModal = (index: number) => {
    setModalData(volunteerHours[index]);
    setEditingIndex(index);
    setShowModal(true);
  };

  // Save handler (add or edit)
  const handleSave = (data: any) => {
    if (editingIndex !== null) {
      // Edit
      const updated = [...volunteerHours];
      updated[editingIndex] = data;
      setVolunteerHours(updated);
    } else {
      // Add
      setVolunteerHours([data, ...volunteerHours]);
      notePositiveInteraction();
    }
    setShowModal(false);
    setEditingIndex(null);
    setModalData(null);
  };

  // Delete handler
  const handleDelete = (index: number) => {
    AppAlert.alert(
      "Delete Entry",
      "Are you sure you want to delete this volunteer hour entry?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setVolunteerHours(volunteerHours.filter((_, i) => i !== index));
          },
        },
      ],
      { icon: AlertIcon.delete },
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // prompt
  const VolunteerHourModal = ({
    visible,
    onClose,
    onSave,
    initialData = null,
  }: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
  }) => {
    const [assignmentName, setAssignmentName] = useState(
      initialData?.name || "",
    );
    const [hoursCompleted, setHoursCompleted] = useState(
      initialData?.hours ? String(initialData.hours) : "",
    );
    const [dateCompleted, setDateCompleted] = useState(
      initialData?.date ? new Date(initialData.date) : new Date(),
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [organization, setOrganization] = useState(
      initialData?.organization || "",
    );
    const [contactInfo, setContactInfo] = useState(
      initialData?.contactInfo || "",
    );
    const [approved, setApproved] = useState(initialData?.approved || false);

    // Allow decimals for hours
    const handleHoursChange = (text: string) => {
      // Allow only numbers and a single decimal point
      const num = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
      // If the input is blank, set hours to 0, otherwise set to the input value
      setHoursCompleted(num);
    };

    return (
      <Modal visible={visible} transparent animationType="fade">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={24}
        >
          <View className="flex-1 bg-black/50 items-center justify-center px-4">
            <LiquidGlassView
              containerClassName="w-full max-w-md"
              className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl py-6`}
              style={{ maxHeight: "85%", minHeight: "80%" }}
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="regular"
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-4 px-6`}
              >
                {initialData ? "Edit Volunteer Hours" : "Add Volunteer Hours"}
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
              >
                <View className="mb-7 px-6">
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2 font-medium`}
                  >
                    Activity Name
                  </Text>
                  <AppTextInput
                    className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded-xl p-3`}
                    value={assignmentName}
                    onChangeText={setAssignmentName}
                    placeholder="e.g. Chemistry Tutor"
                    placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
                  />
                </View>
                <View className="mb-7 px-6">
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2 font-medium`}
                  >
                    Hours Completed
                  </Text>
                  <AppTextInput
                    className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded-xl p-3`}
                    value={hoursCompleted}
                    onChangeText={handleHoursChange}
                    placeholder="e.g. 2.5"
                    placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                </View>
                <View className="mb-7 px-6">
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2 font-medium`}
                  >
                    Date Completed
                  </Text>
                  <LiquidGlassButton
                    onPress={() => setShowDatePicker(true)}
                    contentStyle={styles.fieldButton}
                    glassTintColor={activeTone.bg4}
                    fallbackBackgroundColor={activeTone.bg4}
                  >
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"}`}
                    >
                      {dateCompleted.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </Text>
                  </LiquidGlassButton>
                  {isIOS ? (
                    <DateTimePicker
                      value={dateCompleted}
                      mode="date"
                      display="compact"
                      onChange={(_, date) => {
                        if (date) setDateCompleted(date);
                      }}
                    />
                  ) : (
                    showDatePicker && (
                      <DateTimePicker
                        value={dateCompleted}
                        mode="date"
                        display="default"
                        onChange={(_, date) => {
                          setShowDatePicker(false);
                          if (date) setDateCompleted(date);
                        }}
                      />
                    )
                  )}
                </View>
                <View className="mb-7 px-6">
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2 font-medium`}
                  >
                    Organization
                  </Text>
                  <AppTextInput
                    className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded-xl p-3`}
                    value={organization}
                    onChangeText={setOrganization}
                    placeholder="e.g. National Superheavy Association"
                    placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
                  />
                </View>
                <View className="mb-7 px-6">
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2 font-medium`}
                  >
                    Contact Info
                  </Text>
                  <AppTextInput
                    className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded-xl p-3`}
                    value={contactInfo}
                    onChangeText={setContactInfo}
                    placeholder="e.g. Victor Ninov (647) 116-1180"
                    placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
                  />
                </View>
                <View className="mb-7 mx-6">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md font-medium`}
                    >
                      Approved
                    </Text>
                    <AppToggle
                      value={approved}
                      onValueChange={(v) => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                        setApproved(v);
                      }}
                    />
                  </View>
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-sm mt-1`}
                  >
                    Has your counsellor approved these hours?
                  </Text>
                </View>
              </ScrollView>
              <View className="flex-row gap-3 mt-4 px-6">
                <LiquidGlassButton
                  containerClassName="flex-1"
                  onPress={() => {
                    onClose();
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  }}
                  contentStyle={styles.modalButton}
                  glassTintColor={activeTone.bg4}
                  fallbackBackgroundColor={activeTone.bg4}
                >
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-center font-medium`}
                  >
                    Cancel
                  </Text>
                </LiquidGlassButton>
                <LiquidGlassButton
                  containerClassName="flex-1"
                  onPress={() => {
                    onSave({
                      name: !assignmentName.trim()
                        ? "Untitled Activity"
                        : assignmentName,
                      hours: !parseFloat(hoursCompleted)
                        ? 0
                        : parseFloat(hoursCompleted),
                      date: dateCompleted.toISOString(),
                      organization: !organization.trim()
                        ? "Unknown Organization"
                        : organization,
                      contactInfo: !contactInfo.trim()
                        ? "Unknown Contact"
                        : contactInfo,
                      approved,
                    });
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  }}
                  contentStyle={styles.modalButton}
                  glassTintColor={activeTone.accent}
                  fallbackBackgroundColor={activeTone.accent}
                >
                  <Text className={`${isDark? "text-appblack" : "text-appwhite"} text-center font-medium`}>
                    {initialData ? "Save Changes" : "Add Hours"}
                  </Text>
                </LiquidGlassButton>
              </View>
            </LiquidGlassView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStorage.load("volunteer_hours");
        if (stored) setVolunteerHours(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load volunteer hours:", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Calculate total hours
  const totalHours = volunteerHours.reduce(
    (sum, entry) =>
      sum +
      (typeof entry.hours === "number"
        ? entry.hours
        : entry.hours === ""
          ? 0
          : parseFloat(entry.hours)),
    0,
  );

  let totalHoursDisplay = totalHours;
  if (totalHoursDisplay > 100) {
    totalHoursDisplay = totalHours - 100;
  } else if (totalHoursDisplay > 50) {
    totalHoursDisplay = totalHours - 50;
  }

  let progress = 0;
  if (totalHours >= 200) {
    progress = 100;
  } else if (totalHours >= 100) {
    progress = Math.min(((totalHours - 100) / 100) * 100, 100);
  } else if (totalHours >= 50) {
    progress = Math.min(((totalHours - 50) / 50) * 100, 100);
  } else {
    progress = Math.min((totalHours / 40) * 100, 100);
  }

  // Determine badge
  let badge: { label: string; color: string; text: string } | null = null;
  if (totalHours >= 200) {
    badge = {
      label: "Gold",
      color: "#D3Af37",
      text: `${isDark ? "#111113" : "#fbfbfb"}`,
    };
  } else if (totalHours >= 100) {
    badge = { label: "Silver", color: "#C0C0C0", text: "#23232a" };
  } else if (totalHours >= 50) {
    badge = { label: "Bronze", color: "#cd7f32", text: "#fff" };
  }

  // Progress color
  let progressColor = "#d6363f"; // default red
  if (totalHours >= 200) {
    progressColor = "#D3Af37"; // gold
  } else if (totalHours >= 100) {
    progressColor = "#C0C0C0"; // silver
  } else if (totalHours >= 50) {
    progressColor = "#cd7f32"; // bronze
  } else if (totalHours >= 40) {
    progressColor = "#43a25a"; // green
  } else if (totalHours >= 20) {
    progressColor = "#fcc245"; // orange
  }

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"} px-5`}>
      <PageBackground />
      <BackButton path="/profile" />
      {/* Info Button */}
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
      {/* Info Modal */}
      <Modal visible={showInfo} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-5">
          <LiquidGlassView
            containerClassName="w-full max-w-md"
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl py-6 px-6`}
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="regular"
          >
            <View className="flex items-center mb-6">
              <Image
                source={require("../../assets/images/betta-fish2.png")}
                className="w-30 h-35 object-scale-down"
              ></Image>
            </View>
            <View className="flex-row items-center mb-4">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
              >
                Volunteer Hours
              </Text>
            </View>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} mb-4`}
            >
              As part of the Ontario High School Diploma requirements, you must
              complete a minimum of 40 hours of volunteer activities during high
              school.{`\n\n`}You can also earn a{` `}
              <Link
                href={`https://www.ontario.ca/page/use-high-school-volunteer-hours-build-your-future`}
                className="text-baccent underline"
              >
                Minister&apos;s Certificate
              </Link>{" "}
              for achieving more than 50 hours. The requirments are as follows:
              {`\n\n`}
              <View>
                <View className=" items-center flex-wrap flex-row">
                  <View className="px-2 py-1 rounded-xl bg-[#cd7f32]/80 mr-3">
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold`}
                    >
                      Bronze
                    </Text>
                  </View>
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} font-semibold`}
                  >
                    50 to 99 hours
                  </Text>
                </View>
                <View className=" items-center flex-wrap flex-row pt-1">
                  <View className="px-2 py-1 rounded-xl bg-[#C0C0C0]/80 mr-3">
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold px-1`}
                    >
                      {`Silver`}
                    </Text>
                  </View>
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} font-semibold`}
                  >
                    100 to 199 hours
                  </Text>
                </View>
                <View className=" items-center flex-wrap flex-row pt-1">
                  <View className="px-2 py-1 rounded-xl bg-[#D3Af37]/80 mr-3">
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold px-1`}
                    >
                      {` Gold `}
                    </Text>
                  </View>
                  <Text
                    className={`${isDark ? "text-appgraylight" : "text-appgraydark"} font-semibold`}
                  >
                    200+ hours
                  </Text>
                </View>
              </View>
              {`\n\n`}
              Your volunteer tracker updates your progress to these awards as
              you accumulate hours.
            </Text>
            <LiquidGlassButton
              containerClassName="mt-2"
              onPress={() => {
                hapticsNotification(Haptics.NotificationFeedbackType.Success);
                setShowInfo(false);
                Linking.openURL(
                  "https://www2.yrdsb.ca/sites/default/files/2023-06/FOR-communityinvolvement.pdf",
                );
              }}
              contentStyle={styles.modalButton}
              glassTintColor={activeTone.accent}
              fallbackBackgroundColor={activeTone.accent}
            >
              <Text
                className={`${isDark ? "text-appblack" : "text-appwhite"} font-medium text-center`}
              >
                YRDSB Volunteer Form
              </Text>
            </LiquidGlassButton>
            <LiquidGlassButton
              containerClassName="mt-2"
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                setShowInfo(false);
              }}
              contentStyle={styles.modalButton}
              glassTintColor={activeTone.bg4}
              fallbackBackgroundColor={activeTone.bg4}
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-center font-medium`}
              >
                Close
              </Text>
            </LiquidGlassButton>
          </LiquidGlassView>
        </View>
      </Modal>
      <View className="items-center mt-30 mb-6">
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} text-center font-semibold text-3xl mb-4`}
        >
          My Volunteer Hours
        </Text>
        <View className="items-center justify-center">
          <AnimatedProgressWheel
            size={140}
            width={17}
            color={progressColor}
            backgroundColor={activeTone.bg3}
            progress={progress}
            max={100}
            rounded={true}
            rotation={"-90deg"}
            delay={75}
            duration={400}
            showPercentageSymbol={true}
          />
          <View className="absolute">
            <Text
              className="text-center"
              style={{
                color: progressColor,
                fontSize: 31,
                fontWeight: "700",
              }}
            >
              {totalHours > 9999 ? "9999+" : totalHours}
            </Text>
            <Text
              className="text-center mb-2"
              style={{
                color: progressColor,
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              hours / 40
            </Text>
          </View>
        </View>
        {badge && (
          <View
            style={{
              backgroundColor: badge.color,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 4,
              marginTop: 14,
              alignSelf: "center",
            }}
          >
            <Text
              style={{
                color: badge.text,
                fontWeight: "bold",
                fontSize: 16,
                textAlign: "center",
              }}
            >
              {badge.label} Certificate
            </Text>
          </View>
        )}
      </View>
      <View className="flex-row">
        <LiquidGlassButton
          containerClassName="flex-1 mr-2"
          onPress={() => {
            openAddModal();
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          }}
          contentStyle={styles.primaryButton}
          glassTintColor={activeTone.accent}
          fallbackBackgroundColor={activeTone.accent}
        >
          <Text
            className={`${isDark ? "text-appblack" : "text-appwhite"} text-center font-semibold text-lg`}
          >
            + Add Volunteer Hours
          </Text>
        </LiquidGlassButton>
      </View>
      <VolunteerHourModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        initialData={modalData}
      />
      <ScrollView
        className={`mt-5 mb-7 rounded-xl ${volunteerHours.length === 0 ? (isDark ? "bg-dark3" : "bg-light3") : ""}`}
        contentContainerStyle={
          volunteerHours.length === 0
            ? { flexGrow: 1, justifyContent: "center" }
            : undefined
        }
      >
        {volunteerHours.length === 0 ? (
          <View className={`items-center px-8 py-8`}>
            <Image
              source={require("../../assets/images/not_found.png")}
              className={`w-30 h-30 mb-3`}
              style={{ tintColor: activeTone.accent }}
            />
            <Text
              className={`${isDark ? "text-light3" : "text-dark3"} text-xl font-semibold text-center mb-2`}
            >
              No Volunteer Hours
            </Text>
            <Text className={`text-gray-400 text-center text-lg leading-6`}>
              You haven&apos;t logged any{`\n`}volunteer hours yet.
            </Text>
          </View>
        ) : (
          volunteerHours.map((item, idx) => (
            <LiquidGlassView
              key={idx}
              className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-5 mb-4 `}
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View className={`flex-row justify-between items-center mb-1`}>
                <View className="flex-row items-center flex-1 gap-2">
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-semibold`}
                  >
                    {item.name}
                  </Text>
                  <View
                    className={`bg-${item.approved ? "success" : "warning"} pl-3 pt-3 rounded-full ml-1`}
                  ></View>
                </View>
                <View className={`bg-baccent/80 px-3 py-2 rounded-xl`}>
                  <Text
                    className={`${isDark ? "text-appblack" : "text-appwhite"} font-semibold`}
                  >
                    {item.hours} hrs
                  </Text>
                </View>
              </View>
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-lg font-semibold`}
              >
                {formatDate(item.date)}
              </Text>
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md`}
              >
                {item.organization}
                {<Text className="font-bold text-xl text-baccent"> | </Text>}
                {item.contactInfo}
              </Text>
              <View className="flex-row mt-4 gap-3">
                <LiquidGlassButton
                  containerClassName="flex-1"
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    openEditModal(idx);
                  }}
                  contentStyle={styles.actionButton}
                  glassTintColor={activeTone.bg4}
                  fallbackBackgroundColor={activeTone.bg4}
                >
                  <Image
                    className="w-4 h-4"
                    style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
                    source={require("../../assets/images/pencil.png")}
                  />
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} font-medium`}
                  >
                    Edit
                  </Text>
                </LiquidGlassButton>
                <LiquidGlassButton
                  containerClassName="flex-1"
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    handleDelete(idx);
                  }}
                  contentStyle={styles.actionButton}
                  glassTintColor="#ef444444"
                  fallbackBackgroundColor="#ef444444"
                >
                  <Image
                    className="w-4 h-4"
                    style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
                    source={require("../../assets/images/trash-bin.png")}
                  />
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} font-medium`}
                  >
                    Delete
                  </Text>
                </LiquidGlassButton>
              </View>
            </LiquidGlassView>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldButton: {
    borderRadius: 12,
    padding: 12,
  },
  modalButton: {
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

export default VolunteerTracking;
