import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as LocalAuthentication from "expo-local-authentication";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SecureStorage } from "../(auth)/taauth";
import { SnowEffect } from "../(components)/SnowEffect";
import UpdatesModal from "../(components)/UpdatesModal";
import {
  clearGuidanceReminders,
  ensureNotificationPermissions,
  loadNotificationSettings,
  saveNotificationSetting,
  scheduleGuidanceReminders,
  syncBackgroundTasks,
  triggerMarksTest,
} from "../(utils)/notifications";
import { useTheme } from "../contexts/ThemeContext";
import {
  getHapticsEnabled,
  hapticsImpact,
  hapticsNotification,
  setHapticsEnabled as saveHapticsEnabled,
} from "../(utils)/haptics";
import {
  getBiometricLockEnabled,
  setBiometricLockEnabled as persistBiometricLockEnabled,
  subscribeBiometricLock,
} from "../(utils)/biometricLock";

type QuickAction = {
  id: string;
  title: string;
  url: string;
  iconKey: keyof typeof QUICK_ACTION_ICONS;
  kind: "external" | "internal";
  isDefault?: boolean;
  isHidden?: boolean;
};

const QUICK_ACTION_ICONS = {
  teachassist: require("../../assets/images/apple.png"),
  blueprint: require("../../assets/images/blueprint.png"),
  brightspace: require("../../assets/images/brightspace.webp"),
  classroom: require("../../assets/images/g-class.png"),
  volunteer: require("../../assets/images/volunteer.png"),
  googleplay: require("../../assets/images/blocks.png"),
  map: require("../../assets/images/map.png"),
  custom: require("../../assets/images/link.png"),
};

const BAYVIEW_MAP_ACTION: QuickAction = {
  id: "bayview-map",
  title: "Bayview School Map",
  url: "https://www.bayviewstuco.ca/map",
  iconKey: "map",
  kind: "external",
  isDefault: true,
  isHidden: false,
};

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "teachassist",
    title: "TeachAssist Website",
    url: "https://ta.yrdsb.ca/live/index.php?subject_id=0&username=${username}&password=${password}&submit=Login",
    iconKey: "teachassist",
    kind: "external",
    isDefault: true,
    isHidden: false,
  },
  {
    id: "volunteer-hours",
    title: "My Volunteer Hours",
    url: "/VolunteerTracking",
    iconKey: "volunteer",
    kind: "internal",
    isDefault: true,
    isHidden: false,
  },
  {
    id: "blueprint",
    title: "myBlueprint",
    url: "https://app.myblueprint.ca/",
    iconKey: "blueprint",
    kind: "external",
    isDefault: true,
    isHidden: false,
  },
  {
    id: "brightspace",
    title: "Brightspace / D2L",
    url: "https://yrdsb.elearningontario.ca/d2l/login",
    iconKey: "brightspace",
    kind: "external",
    isDefault: true,
    isHidden: false,
  },
  {
    id: "classroom",
    title: "Google Classroom",
    url: "market://details?id=com.google.android.apps.classroom",
    iconKey: "classroom",
    kind: "external",
    isDefault: true,
    isHidden: true,
  },
  {
    id: "googleplay",
    title: "TeachAssist App",
    url: "https://play.google.com/store/apps/details?id=com.prmntr.teachassist",
    iconKey: "googleplay",
    kind: "external",
    isDefault: true,
    isHidden: true,
  },
];

const DEFAULT_ACTIONS_BY_ID = DEFAULT_QUICK_ACTIONS.reduce(
  (acc, action) => {
    acc[action.id] = action;
    return acc;
  },
  {} as Record<string, QuickAction>,
);

const normalizeQuickActions = (actions: QuickAction[]) => {
  const normalized = actions.map((action) => {
    const defaultAction = DEFAULT_ACTIONS_BY_ID[action.id];
    if (defaultAction) {
      return {
        ...defaultAction,
        ...action,
        isDefault: true,
        isHidden: action.isHidden ?? false,
      };
    }
    return {
      ...action,
      isDefault: false,
      isHidden: action.isHidden ?? false,
    };
  });

  DEFAULT_QUICK_ACTIONS.forEach((action) => {
    if (!normalized.some((item) => item.id === action.id)) {
      normalized.push({ ...action, isHidden: true, isDefault: true });
    }
  });

  return normalized;
};

const ProfileScreen = () => {
  const router = useRouter();

  const appVersion = "v1.3.1"; //* update w/ app.json

  const { theme, toggleTheme, isDark } = useTheme();

  const [userName, setUserName] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showUpdates, setShowUpdates] = useState(false);
  const [guidanceNotificationsEnabled, setGuidanceNotificationsEnabled] =
    useState(false);
  const [markNotificationsEnabled, setMarkNotificationsEnabled] =
    useState(false);
  const [hideMarksInNotifications, setHideMarksInNotifications] =
    useState(false);
  const [notifyWhenMarksHidden, setNotifyWhenMarksHidden] = useState(false);
  const [notifyWhenNoChanges, setNotifyWhenNoChanges] = useState(false);
  const [hideUnavailableMarks, setHideUnavailableMarks] = useState(false);
  const [tapToRevealMarks, setTapToRevealMarks] = useState(false);
  const [biometricLockEnabled, setBiometricLockEnabledState] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [showActionManager, setShowActionManager] = useState(false);
  const [showActionEditor, setShowActionEditor] = useState(false);
  const [editingAction, setEditingAction] = useState<QuickAction | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [messageMode, setMessageMode] = useState<
    "default" | "inspirational" | "off"
  >("default");
  const [showTestingInfo, setShowTestingInfo] = useState(false);
  const [showProfileImagesModal, setShowProfileImagesModal] = useState(false);

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

  const getUser = async () => {
    const userName = await SecureStorage.load("ta_username");
    setUserName(userName);
    return userName;
  };

  const getSchool = async () => {
    const school = await SecureStorage.load("school_name");
    setSchool(school);
    return school;
  };

  const getImage = async () => {
    const savedImage = await SecureStorage.load("profile_image");
    setImage(savedImage);
    return savedImage;
  };

  const getBackgroundImage = async () => {
    const savedImage = await SecureStorage.load("profile_background");
    setBackgroundImage(savedImage);
    return savedImage;
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library :))))
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);
      await SecureStorage.save("profile_image", imageUri);
    }
  };

  const pickBackgroundImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setBackgroundImage(imageUri);
      await SecureStorage.save("profile_background", imageUri);
    }
  };

  const resetImage = async () => {
    await SecureStorage.delete("profile_image");
    setImage(null); // use default
  };

  const resetBackgroundImage = async () => {
    await SecureStorage.delete("profile_background");
    setBackgroundImage(null);
  };

  useEffect(() => {
    getUser();
    getSchool();
    getImage();
    getBackgroundImage();
    const loadSettings = async () => {
      const settings = await loadNotificationSettings();
      setGuidanceNotificationsEnabled(settings.guidanceRemindersEnabled);
      setMarkNotificationsEnabled(settings.markChangeEnabled);
      setHideMarksInNotifications(settings.hideMarksInNotifications);
      setNotifyWhenMarksHidden(settings.notifyWhenMarksHidden);
      setNotifyWhenNoChanges(settings.notifyWhenNoChanges);
      const storedMessageMode = await AsyncStorage.getItem("messages_mode");
      if (
        storedMessageMode === "default" ||
        storedMessageMode === "inspirational" ||
        storedMessageMode === "off"
      ) {
        setMessageMode(storedMessageMode);
      }
      const storedHideUnavailable = await AsyncStorage.getItem(
        "hide_unavailable_marks",
      );
      if (storedHideUnavailable === "true") {
        setHideUnavailableMarks(true);
      }
      const storedTapToReveal = await AsyncStorage.getItem(
        "tap_to_reveal_marks",
      );
      setTapToRevealMarks(storedTapToReveal === "true");
      const storedBiometricLock = await getBiometricLockEnabled();
      setBiometricLockEnabledState(storedBiometricLock);
      const storedHaptics = await getHapticsEnabled();
      setHapticsEnabled(storedHaptics);
    };
    const loadQuickActions = async () => {
      const storedActions = await AsyncStorage.getItem("quick_actions");
      if (storedActions) {
        try {
          const parsed: QuickAction[] = JSON.parse(storedActions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = normalizeQuickActions(parsed);
            setQuickActions(normalized);
            await AsyncStorage.setItem(
              "quick_actions",
              JSON.stringify(normalized),
            );
            return;
          }
        } catch {
          // fall back to defaults
        }
      }
      setQuickActions(DEFAULT_QUICK_ACTIONS);
    };
    loadSettings();
    loadQuickActions();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBiometricLock((enabled) => {
      setBiometricLockEnabledState(enabled);
    });
    return unsubscribe;
  }, []);

  const toggleGuidanceNotifications = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    const granted = await ensureNotificationPermissions();
    if (!granted) {
      Alert.alert(
        "Notifications Disabled",
        "Enable notifications in system settings to receive guidance reminders.",
      );
      return;
    }

    await saveNotificationSetting("guidanceRemindersEnabled", value);
    setGuidanceNotificationsEnabled(value);

    if (value) {
      await scheduleGuidanceReminders();
    } else {
      await clearGuidanceReminders();
    }
  };

  const sendTestMarkAlerts = async () => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    const scheduled = await triggerMarksTest();
    if (!scheduled) {
      Alert.alert(
        "Notifications Disabled",
        "Enable notifications in system settings to receive mark alerts.",
      );
      return;
    }

    Alert.alert(
      "Test Alerts Sent",
      "Mark change and hidden alerts should appear shortly.",
    );
  };

  const toggleMarkNotifications = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    const granted = await ensureNotificationPermissions();
    if (!granted) {
      Alert.alert(
        "Notifications Disabled",
        "Enable notifications in system settings to receive mark alerts.",
      );
      return;
    }

    await saveNotificationSetting("markChangeEnabled", value);
    setMarkNotificationsEnabled(value);
    await syncBackgroundTasks();
  };

  const toggleHideMarks = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await saveNotificationSetting("hideMarksInNotifications", value);
    setHideMarksInNotifications(value);
  };

  const toggleHiddenMarkAlerts = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await saveNotificationSetting("notifyWhenMarksHidden", value);
    setNotifyWhenMarksHidden(value);
  };

  const toggleNoChangeAlerts = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await saveNotificationSetting("notifyWhenNoChanges", value);
    setNotifyWhenNoChanges(value);
    await syncBackgroundTasks();
  };

  const updateMessageMode = async (
    mode: "default" | "inspirational" | "off",
  ) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setMessageMode(mode);
    await AsyncStorage.setItem("messages_mode", mode);
  };

  const toggleHideUnavailableMarks = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setHideUnavailableMarks(value);
    await AsyncStorage.setItem("hide_unavailable_marks", String(value));
  };

  const toggleTapToRevealMarks = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setTapToRevealMarks(value);
    await AsyncStorage.setItem("tap_to_reveal_marks", String(value));
  };

  const toggleBiometricLock = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          "Biometrics Unavailable",
          "Set up Face ID, Touch ID, or a fingerprint in your device settings to enable app lock.",
        );
        return;
      }
    }
    setBiometricLockEnabledState(value);
    await persistBiometricLockEnabled(value);
  };

  const toggleHaptics = async (value: boolean) => {
    await saveHapticsEnabled(value);
    setHapticsEnabled(value);
    if (value) {
      await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const saveQuickActions = async (actions: QuickAction[]) => {
    const normalized = normalizeQuickActions(actions);
    setQuickActions(normalized);
    await AsyncStorage.setItem("quick_actions", JSON.stringify(normalized));
  };

  const openActionManager = async () => {
    if (quickActions.length === 0) {
      await saveQuickActions(DEFAULT_QUICK_ACTIONS);
    }
    setShowActionManager(true);
  };

  const openActionEditor = (action?: QuickAction) => {
    setEditingAction(action ?? null);
    setActionTitle(action?.title ?? "");
    setActionUrl(action?.url ?? "");
    setShowActionManager(false);
    setShowActionEditor(true);
  };

  const closeActionEditor = () => {
    setEditingAction(null);
    setActionTitle("");
    setActionUrl("");
    setShowActionEditor(false);
    setShowActionManager(true);
  };

  const saveActionEdits = async () => {
    if (!actionTitle.trim() || !actionUrl.trim()) {
      Alert.alert("Missing info", "Add a title and a URL to save this action.");
      return;
    }

    const normalizedUrl = actionUrl.trim();
    const kind: QuickAction["kind"] = normalizedUrl.startsWith("/")
      ? "internal"
      : "external";

    const isEditingDefault = Boolean(editingAction?.isDefault);
    if (!isEditingDefault) {
      const matchesDefault = DEFAULT_QUICK_ACTIONS.some(
        (action) =>
          action.url.toLowerCase() === normalizedUrl.toLowerCase() ||
          action.title.toLowerCase() === actionTitle.trim().toLowerCase(),
      );
      if (matchesDefault) {
        Alert.alert(
          "Default Action",
          "Default quick actions can only be hidden or added back from the manager.",
        );
        return;
      }
    }

    if (editingAction) {
      const updated = quickActions.map((action) =>
        action.id === editingAction.id
          ? {
              ...action,
              title: actionTitle.trim(),
              url: normalizedUrl,
              kind,
            }
          : action,
      );
      await saveQuickActions(updated);
    } else {
      const newAction: QuickAction = {
        id: `custom-${Date.now()}`,
        title: actionTitle.trim(),
        url: normalizedUrl,
        iconKey: "custom",
        kind,
        isDefault: false,
        isHidden: false,
      };
      await saveQuickActions([newAction, ...quickActions]);
    }

    closeActionEditor();
  };

  const removeQuickAction = async (actionId: string) => {
    const action = quickActions.find((item) => item.id === actionId);
    if (!action || action.isDefault) return;
    Alert.alert(
      "Delete Action",
      `Are you sure you want to delete this quick action?`,
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            const updated = quickActions.filter((item) => item.id !== actionId);
            saveQuickActions(updated);
          },
        },
      ],
    );
  };

  const setDefaultActionHidden = async (actionId: string, hidden: boolean) => {
    const updated = quickActions.map((action) =>
      action.id === actionId ? { ...action, isHidden: hidden } : action,
    );
    await saveQuickActions(updated);
  };

  const moveQuickAction = async (actionId: string, direction: -1 | 1) => {
    const index = quickActions.findIndex((action) => action.id === actionId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= quickActions.length) return;
    const updated = [...quickActions];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    await saveQuickActions(updated);
  };

  const isBayviewSecondary = (school ?? "")
    .toLocaleLowerCase()
    .includes("bayview secondary");
  const baseQuickActions =
    quickActions.length > 0
      ? quickActions.filter((action) => !action.isHidden)
      : DEFAULT_QUICK_ACTIONS;
  const storedBayviewAction = quickActions.find(
    (action) => action.id === BAYVIEW_MAP_ACTION.id,
  );
  const shouldShowBayviewAction =
    isBayviewSecondary && !storedBayviewAction?.isHidden;
  const resolvedQuickActions =
    shouldShowBayviewAction &&
    !baseQuickActions.some((action) => action.id === BAYVIEW_MAP_ACTION.id)
      ? [...baseQuickActions, BAYVIEW_MAP_ACTION]
      : baseQuickActions;
  const hasCustomProfileImage = Boolean(image);
  const hasCustomBackgroundImage = Boolean(backgroundImage);

  const resolveQuickActionUrl = async (url: string) => {
    if (!url.includes("${username}") && !url.includes("${password}")) {
      return url;
    }
    const [savedUsername, savedPassword] = await Promise.all([
      SecureStorage.load("ta_username"),
      SecureStorage.load("ta_password"),
    ]);
    if (!savedUsername || !savedPassword) {
      Alert.alert("Please log in again.");
      return null;
    }
    return url
      .replace("${username}", encodeURIComponent(savedUsername))
      .replace("${password}", encodeURIComponent(savedPassword));
  };

  const promptLogout = async () => {
    Alert.alert(
      "Are you Sure?",
      "All saved information will be cleared after logging out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            hapticsNotification(Haptics.NotificationFeedbackType.Success);
            handleLogout();
            Alert.alert("You've been sucessfully signed out.");
          },
        },
      ],
    );
  };

  const handleLogout = async () => {
    // delete everything
    await SecureStorage.delete("ta_username");
    await SecureStorage.delete("ta_password");
    await SecureStorage.delete("ta_student_id");
    await SecureStorage.delete("ta_session_token");
    await SecureStorage.delete("ta_cookies");
    await SecureStorage.delete("ta_courses");
    await SecureStorage.delete("school_name");
    await SecureStorage.delete("grade_previous_average");
    await SecureStorage.delete("grade_last_known_average");
    await SecureStorage.delete("grade_last_updated");
    await SecureStorage.delete("marks_last_retrieved");
    await SecureStorage.delete("ta_appointments");
    await SecureStorage.delete("profile_image");
    await SecureStorage.delete("profile_background");
    await SecureStorage.delete("reason_mapping");
    await AsyncStorage.removeItem("theme");
    await AsyncStorage.removeItem("notif_guidance_enabled");
    await AsyncStorage.removeItem("notif_marks_enabled");
    await AsyncStorage.removeItem("notif_hide_marks");
    await AsyncStorage.removeItem("notif_notify_hidden_marks");
    await AsyncStorage.removeItem("notif_notify_no_changes");
    await AsyncStorage.removeItem("messages_mode");
    await AsyncStorage.removeItem("hide_unavailable_marks");
    await AsyncStorage.removeItem("tap_to_reveal_marks");
    await persistBiometricLockEnabled(false);
    await AsyncStorage.removeItem("haptics_enabled");
    await AsyncStorage.removeItem("quick_actions");
    await clearGuidanceReminders();
    await syncBackgroundTasks();
    console.log("Logged out successfully. All session data cleared.");
    router.replace("/");
  };
  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      {(now >= start && now <= new Date(year, 11, 31, 23, 59, 59, 999)) ||
      (now.getMonth() === 0 && now <= end) ? (
        <SnowEffect count={37} speed={1.1} drift={26} />
      ) : (
        <></>
      )}
      <UpdatesModal
        visible={showUpdates}
        onClose={() => setShowUpdates(false)}
        version={appVersion.replace(/^v/, "")}
        username={userName}
      />
      <Modal visible={showTestingInfo} transparent animationType="slide">
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl py-6 px-6 w-full max-w-md`}
          >
            <View className="flex items-center mb-6">
              <Image
                source={require("../../assets/images/betta-fish.png")}
                className="w-30 h-30 object-contain"
              ></Image>
            </View>
            <View className="flex-row items-center mb-4">
              <View className="mr-2 flex items-center justify-center">
                <Text className="bg-info rounded-full px-3 shadow-md font-semibold flex items-center justify-center text-appwhite">
                  Beta
                </Text>
              </View>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
              >
                Notification Information
              </Text>
            </View>
            <Text
              className={`${isDark ? "text-appgraylight" : "text-appgraydark"} mb-4`}
            >
              Notifications work by periodically contacting the TeachAssist
              servers and checking for grade updates. The interval between
              checking is about every 15-20 minutes. This feature being tested.
              {`\n\n`}
              <Text className="font-semibold text-baccent">
                Note: Notifications may fail to run with an active VPN to a
                country outside of Canada, or with battery optimizations for
                TeachAssist turned on.
              </Text>
            </Text>
            <TouchableOpacity
              className={`mt-2 ${isDark ? "bg-baccent/80" : "bg-baccent"} rounded-lg p-3`}
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                setShowTestingInfo(false);
              }}
            >
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} font-medium text-center`}
              >
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={showProfileImagesModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl py-6 px-6 w-full max-w-md`}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
              >
                Edit Profile Images
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  setShowProfileImagesModal(false);
                }}
              >
                <View
                  className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold bg-baccent/90 rounded-lg p-2`}
                >
                  <Image
                    className={`w-5 h-5`}
                    style={{
                      tintColor: isDark ? "#edebea" : "#2f3035",
                    }}
                    source={require("../../assets/images/checkmark.png")}
                  />
                </View>
              </TouchableOpacity>
            </View>

            <View className="mb-4 flex flex-row items-center justify-between py-2">
              <View>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm font-semibold`}
                >
                  Profile photo
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-xs mt-1`}
                >
                  {hasCustomProfileImage
                    ? "Custom image selected."
                    : "Using default image."}
                </Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  className="px-3 py-2 rounded-lg bg-baccent/90 mr-2"
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    pickImage();
                  }}
                >
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-xs font-semibold`}
                  >
                    Change
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-3 py-2 rounded-lg ${
                    hasCustomProfileImage
                      ? "bg-danger/80"
                      : isDark
                        ? "bg-dark4"
                        : "bg-light4"
                  } ${hasCustomProfileImage ? "" : "opacity-50"}`}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    resetImage();
                  }}
                  disabled={!hasCustomProfileImage}
                >
                  <Text
                    className={`${hasCustomProfileImage ? "text-appwhite" : isDark ? "text-appwhite" : "text-appblack"} text-xs font-semibold`}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mb-4`}
            />

            <View className="mb-4 flex flex-row justify-between items-center py-2">
              <View>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm font-semibold`}
                >
                  Header background
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-xs mt-1`}
                >
                  {hasCustomBackgroundImage
                    ? "Custom background selected."
                    : "Using default background."}
                </Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  className="px-3 py-2 rounded-lg bg-baccent/90 mr-2"
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    pickBackgroundImage();
                  }}
                >
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-xs font-semibold`}
                  >
                    Change
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-3 py-2 rounded-lg ${
                    hasCustomBackgroundImage
                      ? "bg-danger/80"
                      : isDark
                        ? "bg-dark4"
                        : "bg-light4"
                  } ${hasCustomBackgroundImage ? "" : "opacity-50"}`}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    resetBackgroundImage();
                  }}
                  disabled={!hasCustomBackgroundImage}
                >
                  <Text
                    className={`${hasCustomBackgroundImage ? "text-appwhite" : isDark ? "text-appwhite" : "text-appblack"} text-xs font-semibold`}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text
          className={`text-5xl font-semibold leading-[56px] ${isDark ? "text-appwhite" : "text-appblack"} mt-16 mx-5 mb-5`}
        >
          Settings
        </Text>
        {/* hero */}
        <ImageBackground
          source={
            backgroundImage
              ? { uri: backgroundImage }
              : isDark
                ? require("../../assets/images/mountain-background.webp")
                : require("../../assets/images/mountain-background-light.webp")
          }
          className={`w-full px-5 py-16 flex justify-center items-center overflow-hidden rounded-xl`}
        >
          <View className="absolute top-3 right-3">
            <TouchableOpacity
              className={`rounded-lg p-2 items-center bg-baccent/70 shadow-md`}
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                setShowProfileImagesModal(true);
              }}
            >
              <Image
                className={`w-5 h-5`}
                style={{ tintColor: "#edebea" }}
                source={require("../../assets/images/pencil.png")}
              />
            </TouchableOpacity>
          </View>
          <View className={` flex items-center py-9 px-15 rounded-2xl`}>
            <Image
              source={
                image
                  ? { uri: image }
                  : isDark
                    ? require("../../assets/images/catalina.png")
                    : require("../../assets/images/elcapitan.webp")
              }
              className={`w-32 h-32 rounded-2xl mb-4 border-2 border-baccent/30`}
            />
            <Text
              className={`text-3xl font-bold ${isDark ? "text-appwhite" : "text-appblack"}`}
            >
              {userName ?? "676767676"}
            </Text>
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg text-center`}
            >
              {school ?? "Unknown School"}
            </Text>
          </View>
        </ImageBackground>

        <View className={`mx-5 mt-5`}>
          <View className={`mb-6`}>
            <View className={`flex-row items-center justify-between mb-4`}>
              <Text className={`text-2xl font-bold text-baccent`}>
                Quick Actions
              </Text>
              <TouchableOpacity
                className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-lg p-2 shadow-md`}
                onPress={() => {
                  openActionManager();
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Image
                  className={`w-5 h-5`}
                  style={{ tintColor: isDark ? "#94959c" : "#6d6e77" }}
                  source={require("../../assets/images/pencil.png")}
                />
              </TouchableOpacity>
            </View>
            <View className={`flex-row flex-wrap -mx-2`}>
              {resolvedQuickActions.map((action) => (
                <View key={action.id} className={`w-1/2 px-2 mb-4`}>
                  <TouchableOpacity
                    className={`rounded-xl p-4 items-center ${isDark ? "bg-dark3" : "bg-light3"} shadow-md`}
                    onPress={async () => {
                      hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                      if (action.kind === "internal") {
                        router.push(action.url as any);
                      } else {
                        let resolvedUrl = action.url;
                        const resolved = await resolveQuickActionUrl(
                          action.url,
                        );
                        if (!resolved) return;
                        resolvedUrl = resolved;
                        if (!resolvedUrl.includes("https://")) {
                          Linking.openURL("https://" + resolvedUrl);
                        }
                        Linking.openURL(resolvedUrl);
                      }
                    }}
                  >
                    <Image
                      className={`w-9 h-9 mb-2`}
                      style={{
                        tintColor: isDark ? "#94959c" : "#6d6e77",
                      }}
                      source={
                        QUICK_ACTION_ICONS[action.iconKey] ??
                        QUICK_ACTION_ICONS.custom
                      }
                    />
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-center text-sm`}
                      numberOfLines={2}
                    >
                      {action.title}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <View className={`mb-6`}>
            <Text className={`text-2xl font-bold text-baccent mb-4`}>
              Notifications
            </Text>
            {/* 
            <TouchableOpacity
              className="bg-light1 p-2"
              onPress={() => {
                hapticsImpact(Haptics.ImpactFeedbackStyle.Soft);
              }}
            >
              <Text>haptic test</Text>
            </TouchableOpacity>
            */}
            <View
              className={`${isDark ? "bg-dark3" : "bg-light3"} shadow-md rounded-2xl overflow-hidden`}
            >
              <View
                className={`px-4 py-3 flex-row justify-between items-center`}
              >
                <View className={`flex-1 pr-3`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Guidance Appointment Reminders
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    Get a heads-up before your booked time.
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${guidanceNotificationsEnabled ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    toggleGuidanceNotifications(!guidanceNotificationsEnabled);
                  }}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${guidanceNotificationsEnabled ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
              />
              <View
                className={`px-4 py-3 flex-row justify-between items-center`}
              >
                <View className={`flex-1 pr-3`}>
                  <View className="flex-row items-center">
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                    >
                      Mark Change Alerts
                    </Text>

                    <TouchableOpacity
                      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                        setShowTestingInfo(true);
                      }}
                      className="ml-2"
                    >
                      <View className="bg-info p-1 rounded-full">
                        <Image
                          className="w-4 h-4"
                          tintColor={`#fbfbfb`}
                          source={require("../../assets/images/question-sign.png")}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    Get notified when new marks are posted.
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${markNotificationsEnabled ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    toggleMarkNotifications(!markNotificationsEnabled);
                  }}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${markNotificationsEnabled ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
              />
              <View
                className={`px-4 py-3 flex-row justify-between items-center ${
                  markNotificationsEnabled ? "" : "opacity-50"
                }`}
              >
                <View className={`flex-1 pr-3`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Hide Marks in Notifications
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    Keep your grades private on your lock screen.
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${hideMarksInNotifications ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    markNotificationsEnabled &&
                      toggleHideMarks(!hideMarksInNotifications);
                  }}
                  disabled={!markNotificationsEnabled}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${hideMarksInNotifications ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
              />
              <View
                className={`px-4 py-3 flex-row justify-between items-center ${
                  markNotificationsEnabled ? "" : "opacity-50"
                }`}
              >
                <View className={`flex-1 pr-3`}>
                  <View className="flex-row items-center">
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                    >
                      Alert When Marks Are Hidden
                    </Text>

                    <TouchableOpacity
                      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                        setShowTestingInfo(true);
                      }}
                      className="ml-2"
                    >
                      <View className="bg-info p-1 rounded-full">
                        <Image
                          className="w-4 h-4"
                          tintColor={`#fbfbfb`}
                          source={require("../../assets/images/question-sign.png")}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    Be notified when a teacher hides your marks.
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${notifyWhenMarksHidden ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    markNotificationsEnabled &&
                      toggleHiddenMarkAlerts(!notifyWhenMarksHidden);
                  }}
                  disabled={!markNotificationsEnabled}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${notifyWhenMarksHidden ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
              />
              <View
                className={`px-4 py-3 flex-row justify-between items-center ${
                  markNotificationsEnabled ? "" : "opacity-50"
                }`}
              >
                <View className={`flex-1 pr-3`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Notify When No Change In Mark
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    Alert me after a background check finds no updates. This option will be removed soon.
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${notifyWhenNoChanges ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                    markNotificationsEnabled &&
                      toggleNoChangeAlerts(!notifyWhenNoChanges);
                  }}
                  disabled={!markNotificationsEnabled}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${notifyWhenNoChanges ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
              {1 != 1 ? (
                <>
                  <View
                    className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
                  />
                  <View className={`px-4 py-3`}>
                    <View className={`flex-row items-center justify-between`}>
                      <View className={`flex-1 pr-3`}>
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                        >
                          Test Mark Alerts (Dev)
                        </Text>
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                        >
                          Sends a mark change and hidden alert.
                        </Text>
                      </View>
                      <TouchableOpacity
                        className={`px-3 py-2 rounded-lg ${isDark ? "bg-dark4" : "bg-light4"}`}
                        onPress={sendTestMarkAlerts}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                      >
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"} text-sm font-semibold`}
                        >
                          Send
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          <View className={`mb-6`}>
            <Text className={`text-2xl font-bold text-baccent mb-4`}>
              Personalization
            </Text>
            <View
              className={`${isDark ? "bg-dark3" : "bg-light3"} shadow-md rounded-2xl overflow-hidden`}
            >
              <TouchableOpacity
                className={`px-4 py-3`}
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  toggleTheme();
                }}
              >
                <View className={`flex-row justify-between items-center`}>
                  <View>
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                    >
                      Appearance
                    </Text>
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                    >
                      {isDark ? "Dark Theme" : "Light Theme"}
                    </Text>
                    <Text
                      className={`${isDark ? "text-appgraydark" : "text-appgraylight"} text-xs font-light mt-1 italic`}
                    >
                      custom themes coming soon!
                    </Text>
                  </View>
                  <View className={`bg-baccent/80 mr-1 p-2 rounded-full`}>
                    <Image
                      className={`w-6 h-6`}
                      style={{
                        tintColor: "#fafafa",
                      }}
                      source={
                        isDark
                          ? require("../../assets/images/moon-fill.webp")
                          : require("../../assets/images/sun-fill.webp")
                      }
                    />
                  </View>
                </View>
              </TouchableOpacity>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
              />
              <View className={`px-4 py-3`}>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Greeting Messages
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Choose what shows on the Courses screen.
                </Text>
                <View className={`flex-row mt-3`}>
                  {[
                    { key: "default", label: "Default" },
                    { key: "inspirational", label: "Inspire" },
                    { key: "off", label: "Off" },
                  ].map((option) => {
                    const isSelected = messageMode === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        className={`flex-1 py-2 mx-1 rounded-full border ${
                          isSelected
                            ? "bg-baccent border-baccent"
                            : isDark
                              ? "border-dark4"
                              : "border-light4"
                        }`}
                        onPress={() => {
                          hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
                          updateMessageMode(
                            option.key as "default" | "inspirational" | "off",
                          );
                        }}
                      >
                        <Text
                          className={`text-center text-sm font-semibold ${
                            isSelected
                              ? isDark
                                ? "text-appblack"
                                : "text-appwhite"
                              : isDark
                                ? "text-appwhite"
                                : "text-appblack"
                          }`}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
              />
              <View
                className={`px-4 py-3 flex-row justify-between items-center`}
              >
                <View className={`flex-1 pr-3`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Haptics
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    Turn vibration feedback on or off.
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${hapticsEnabled ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => toggleHaptics(!hapticsEnabled)}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${hapticsEnabled ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className={`mb-6`}>
            <Text className={`text-2xl font-bold text-baccent mb-4`}>
              Privacy
            </Text>
            <View
              className={`${isDark ? "bg-dark3" : "bg-light3"} shadow-md rounded-2xl overflow-hidden`}
            >
              <View
                className={`px-4 py-3 flex-row justify-between items-center`}
              >
                <View className={`flex-1 pr-3`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Lock App with Biometrics
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    Require Face ID, Touch ID, or a passcode to unlock the app.
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${biometricLockEnabled ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    toggleBiometricLock(!biometricLockEnabled);
                  }}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${biometricLockEnabled ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
              />
              <View
                className={`px-4 py-3 flex-row justify-between items-center`}
              >
                <View className={`flex-1 pr-3`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Tap to Reveal Marks
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    Hide averages and changes until you tap them.
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${tapToRevealMarks ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    toggleTapToRevealMarks(!tapToRevealMarks);
                  }}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${tapToRevealMarks ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
              />
              <View
                className={`px-4 py-3 flex-row justify-between items-center`}
              >
                <View className={`flex-1 pr-3`}>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                  >
                    Hide Unavailable Marks
                  </Text>
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                  >
                    Hide courses without a visible grade.
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-13 h-8 rounded-full ${hideUnavailableMarks ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    toggleHideUnavailableMarks(!hideUnavailableMarks);
                  }}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${hideUnavailableMarks ? "ml-6" : "ml-0.5"}`}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className={`mb-6`}>
            <Text className={`text-2xl font-bold text-baccent mb-4`}>
              Support
            </Text>
            <View
              className={`${isDark ? "bg-dark3" : "bg-light3"} shadow-md rounded-2xl overflow-hidden`}
            >
              {[
                {
                  title: "Get Support and Send Feedback",
                  subtitle: "Help improve the TeachAssist app",
                  icon: require("../../assets/images/support-icon.png"),
                  action: () =>
                    Linking.openURL("https://forms.gle/3g7D72cFJUYYH9Fh8"),
                },
                {
                  title: "Update Log",
                  subtitle: "See what's new in the app",
                  icon: require("../../assets/images/update.png"),
                  action: () => setShowUpdates(true),
                },
                {
                  title: "Leave a Review",
                  subtitle: "Leave a review for TeachAssist",
                  icon: require("../../assets/images/star.png"),
                  action: () =>
                    Linking.openURL(
                      "market://details?id=com.prmntr.teachassist",
                    ),
                },
              ].map((item, index) => (
                <View key={item.title}>
                  <TouchableOpacity
                    className={`px-5 py-3`}
                    onPress={() => {
                      hapticsNotification(
                        Haptics.NotificationFeedbackType.Success,
                      );
                      item.action();
                    }}
                  >
                    <View className={`flex-row items-center`}>
                      <View className={`bg-baccent/80 mr-3 p-2 rounded-full`}>
                        <Image
                          className={`w-6 h-6`}
                          style={{
                            tintColor: "#fafafa",
                          }}
                          source={item.icon}
                        />
                      </View>
                      <View className={`flex-1`}>
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                        >
                          {item.title}
                        </Text>
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  {index < 2 && (
                    <View
                      className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

          <View className={`mb-13`}>
            <Text className={`text-2xl font-bold text-baccent mb-4`}>
              Legal
            </Text>
            <View
              className={`${isDark ? "bg-dark3" : "bg-light3"} shadow-md rounded-2xl overflow-hidden`}
            >
              {[
                {
                  title: "Privacy Policy",
                  href: "https://prmntr.com/teachassist/privacy",
                  kind: "external",
                },
                {
                  title: "Terms of Service",
                  href: "https://prmntr.com/teachassist/tos",
                  kind: "external",
                },
                {
                  title: "Source Code",
                  href: "https://github.com/prmntr/teachassist",
                  kind: "external",
                },
                { title: "Credits", href: "/credits", kind: "internal" },
              ].map((item, index) => (
                <View key={item.title}>
                  <TouchableOpacity
                    className={`px-4 py-3`}
                    onPress={() => {
                      hapticsNotification(
                        Haptics.NotificationFeedbackType.Success,
                      );
                      if (item.kind === "internal") {
                        router.push(item.href as any);
                      } else {
                        Linking.openURL(item.href);
                      }
                    }}
                  >
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"}`}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                  {index < 3 && (
                    <View
                      className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

          <Modal visible={showActionManager} transparent animationType="fade">
            <View className="flex-1 bg-black/60 items-center justify-center px-5">
              <View
                className={`${isDark ? "bg-dark3" : "bg-light3"} w-full rounded-2xl p-5`}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
                  >
                    Manage Quick Actions
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                      setShowActionManager(false);
                    }}
                  >
                    <View
                      className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold bg-baccent/90 rounded-lg p-2`}
                    >
                      <Image
                        className={`w-6 h-6`}
                        style={{
                          tintColor: isDark ? "#edebea" : "#2f3035",
                        }}
                        source={require("../../assets/images/checkmark.png")}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  className="max-h-85"
                  showsVerticalScrollIndicator={false}
                >
                  {quickActions.map((action, index) => (
                    <View
                      key={action.id}
                      className={`flex-row items-center justify-between py-2 ${action.isHidden ? "opacity-50" : ""}`}
                    >
                      <View className="flex-row items-center">
                        <TouchableOpacity
                          className={`py-2 pr-2 pl-1`}
                          onPress={() => {
                            hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                            moveQuickAction(action.id, -1);
                          }}
                          disabled={index === 0 || action.isHidden}
                        >
                          <Image
                            source={require("../../assets/images/caret-arrow-up.png")}
                            className="w-4 h-4"
                            style={{
                              tintColor:
                                index === 0 || action.isHidden
                                  ? isDark
                                    ? "#4b4c52"
                                    : "#c8c9cf"
                                  : isDark
                                    ? "#edebea"
                                    : "#2f3035",
                            }}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          className={`p-2`}
                          onPress={() => {
                            hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                            moveQuickAction(action.id, 1);
                          }}
                          disabled={
                            index === quickActions.length - 1 || action.isHidden
                          }
                        >
                          <Image
                            source={require("../../assets/images/caret-arrow-down.png")}
                            className="w-4 h-4"
                            style={{
                              tintColor:
                                index === quickActions.length - 1 ||
                                action.isHidden
                                  ? isDark
                                    ? "#4b4c52"
                                    : "#c8c9cf"
                                  : isDark
                                    ? "#edebea"
                                    : "#2f3035",
                            }}
                          />
                        </TouchableOpacity>
                      </View>
                      <View className="flex-1 pr-3">
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold`}
                          numberOfLines={1}
                        >
                          {action.title}
                        </Text>
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-xs`}
                          numberOfLines={1}
                        >
                          {action.url}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <TouchableOpacity
                          className={`p-2`}
                          onPress={() => {
                            hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                            openActionEditor(action);
                          }}
                        >
                          <Image
                            source={require("../../assets/images/pencil.png")}
                            className="w-5 h-5"
                            style={{
                              tintColor: isDark ? "#edebea" : "#2f3035",
                            }}
                          />
                        </TouchableOpacity>
                        {action.isDefault ? (
                          <TouchableOpacity
                            onPress={() => {
                              hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                              setDefaultActionHidden(
                                action.id,
                                !action.isHidden,
                              );
                            }}
                            className="p-1"
                          >
                            <Image
                              className={`w-6 h-6`}
                              style={{
                                tintColor: isDark ? "#edebea" : "#2f3035",
                              }}
                              source={
                                action.isHidden
                                  ? require("../../assets/images/hiddeneye.png")
                                  : require("../../assets/images/eye.png")
                              }
                            />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            className={`p-1 pl-2`}
                            onPress={() => {
                              hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                              removeQuickAction(action.id);
                            }}
                          >
                            <Image
                              source={require("../../assets/images/trash-bin.png")}
                              className="w-5 h-5"
                              style={{
                                tintColor: isDark ? "#edebea" : "#2f3035",
                              }}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  className={`mt-4 rounded-lg py-2 bg-baccent/90`}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    openActionEditor();
                  }}
                >
                  <Text
                    className={`${isDark ? "text-appwhite" : "text-appblack"} text-center font-semibold`}
                  >
                    Add Action
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={showActionEditor} transparent animationType="slide">
            <View className="flex-1 bg-black/60 items-center justify-center px-5">
              <View
                className={`${isDark ? "bg-dark3" : "bg-light3"} w-full rounded-2xl p-5`}
              >
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold mb-4`}
                >
                  {editingAction ? "Edit Action" : "Add Action"}
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mb-1`}
                >
                  Title
                </Text>
                <TextInput
                  value={actionTitle}
                  onChangeText={setActionTitle}
                  placeholder="e.g. Guidance Booking"
                  placeholderTextColor={isDark ? "#6d6e77" : "#8b8c95"}
                  className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded-lg px-3 py-2 mb-3`}
                />
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mb-1`}
                >
                  URL
                </Text>
                <TextInput
                  value={actionUrl}
                  onChangeText={setActionUrl}
                  placeholder="https://example.com or /VolunteerTracking"
                  placeholderTextColor={isDark ? "#6d6e77" : "#8b8c95"}
                  autoCapitalize="none"
                  className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded-lg px-3 py-2 mb-4`}
                />
                <View className="flex-row justify-end">
                  <TouchableOpacity
                    className={`px-4 py-2 mr-2`}
                    onPress={() => {
                      hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                      closeActionEditor();
                    }}
                  >
                    <Text
                      className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold`}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`px-4 py-2 rounded-lg bg-baccent`}
                    onPress={() => {
                      hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                      saveActionEdits();
                    }}
                  >
                    <Text className={`text-appblack font-semibold`}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* logout button */}
          <TouchableOpacity
            onPress={() => {
              promptLogout();
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
            }}
            className={`bg-danger rounded-xl p-4 mb-6 shadow-md`}
          >
            <View className={`flex-row justify-center items-center`}>
              <Text className={`text-appwhite text-xl font-bold mr-2`}>
                Log Out
              </Text>
            </View>
          </TouchableOpacity>

          {/* footer */}
          <View className={`mb-8 mt-5`}>
            <View className={`items-center`}>
              <View className="shadow-md">
                <TouchableOpacity
                  className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-1 mb-3`}
                  onPress={() => {
                    hapticsNotification(
                      Haptics.NotificationFeedbackType.Success,
                    );
                    Linking.openURL("https://prmntr.com/teachassist");
                  }}
                >
                  <Image
                    source={
                      isDark
                        ? require("../../assets/images/teach-icon-transparent.png")
                        : require("../../assets/images/teach-icon-transparent-light.png")
                    }
                    className={`w-16 h-14 my-1`}
                  />
                </TouchableOpacity>
              </View>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} font-bold text-lg`}
              >
                TeachAssist
              </Text>
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mb-2`}
              >
                {appVersion}
              </Text>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => {
                    hapticsNotification(
                      Haptics.NotificationFeedbackType.Success,
                    );
                    Linking.openURL("https://prmntr.com/teachassist");
                  }}
                >
                  <Image
                    source={require("../../assets/images/link.png")}
                    className={`w-6 h-6 my-1 mr-3`}
                    style={{ tintColor: "#27b1fa" }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    hapticsNotification(
                      Haptics.NotificationFeedbackType.Success,
                    );
                    Linking.openURL("https://www.instagram.com/teach.assist/");
                  }}
                >
                  <Image
                    source={require("../../assets/images/instagram.png")}
                    className={`w-6 h-6 my-1`}
                    style={{ tintColor: "#27b1fa" }}
                  />
                </TouchableOpacity>
              </View>
              <Text
                className={`mt-3 text-center text-sm italic ${isDark ? "text-dark4" : "text-light4"}`}
              >
                “Pretend to be weak, so your enemy may grow arrogant.”
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
