import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SecureStorage } from "../(auth)/taauth";
import Text from "@/components/ui/AppText";
import AppTextInput from "@/components/ui/AppTextInput";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { SnowEffect } from "@/components/ui/SnowEffect";
import { appVersionLabel } from "@/utils/appVersion";
import { setBiometricLockEnabled as persistBiometricLockEnabled } from "@/utils/biometricLock";
import { clearGradeHistory } from "@/utils/gradeHistory";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import { useNativeTabsEnabled } from "@/utils/nativeTabs";
import {
  getActiveStudentGradeCycleYear,
  STUDENT_GRADE_NOTIFICATION_OPENED_CYCLE_STORAGE_KEY,
  STUDENT_GRADE_STARTUP_SHOWN_CYCLE_STORAGE_KEY,
  STUDENT_GRADE_STORAGE_KEY,
  type StudentGrade,
} from "@/utils/studentGrade";
import {
  clearGuidanceReminders,
  syncBackgroundTasks,
} from "@/utils/notifications";
import { getTeachAssistServerOrigin } from "@/utils/serverConfig";
import {
  CUSTOM_THEME_IMAGE_STORAGE_KEY,
  THEME_SETTINGS_STORAGE_KEY,
} from "@/utils/themeSystem";
import { useAFoolVisualGrades } from "@/contexts/AFoolVisualGradesContext";
import { useTheme } from "@/contexts/ThemeContext";

type QuickAction = {
  id: string;
  title: string;
  url: string;
  iconKey: keyof typeof QUICK_ACTION_ICONS;
  kind: "external" | "internal";
  isInternal?: boolean;
  isDefault?: boolean;
  isHidden?: boolean;
};

const QUICK_ACTION_ICONS = {
  teachassist: require("../../assets/images/apple.png"),
  blueprint: require("../../assets/images/blueprint.png"),
  brightspace: require("../../assets/images/brightspace.webp"),
  classroom: require("../../assets/images/g-class.png"),
  volunteer: require("../../assets/images/volunteer.png"),
  examcalc: require("../../assets/images/calculator.png"),
  schoolcashonline: require("../../assets/images/schoolcashonline.png"),
  idcard: require("../../assets/images/id-card.png"),
  map: require("../../assets/images/map.png"),
  teachers: require("../../assets/images/search_icon.png"),
  custom: require("../../assets/images/link.png"),
};

const BAYVIEW_MAP_ACTION: QuickAction = {
  id: "bayview-map",
  title: "Bayview School Map",
  url: "https://www.bayviewstuco.ca/map",
  iconKey: "map",
  isInternal: false,
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
    isInternal: false,
    kind: "external",
    isDefault: true,
    isHidden: false,
  },
  {
    id: "teacher-search",
    title: "Teacher Search",
    url: "/TeacherSearch",
    iconKey: "teachers",
    isInternal: true,
    kind: "internal",
    isDefault: true,
    isHidden: false,
  },
  {
    id: "volunteer-hours",
    title: "My Volunteer Hours",
    url: "/VolunteerTracking",
    iconKey: "volunteer",
    isInternal: true,
    kind: "internal",
    isDefault: true,
    isHidden: false,
  },
  {
    id: "exam-calc",
    title: "Exam Calculator",
    url: "/ExamCalc",
    iconKey: "examcalc",
    isInternal: true,
    kind: "internal",
    isDefault: true,
    isHidden: false,
  },
  {
    id: "student-id",
    title: "Student ID",
    url: "/StudentID",
    iconKey: "idcard",
    isInternal: true,
    kind: "internal",
    isDefault: true,
    isHidden: false,
  },
  {
    id: "blueprint",
    title: "myBlueprint",
    url: "https://app.myblueprint.ca/",
    iconKey: "blueprint",
    isInternal: false,
    kind: "external",
    isDefault: true,
    isHidden: true,
  },
  {
    id: "classroom",
    title: "Google Classroom",
    url: "https://classroom.google.com",
    iconKey: "classroom",
    isInternal: true,
    kind: "external",
    isDefault: true,
    isHidden: true,
  },
  {
    id: "brightspace",
    title: "Brightspace / D2L",
    url: "https://yrdsb.elearningontario.ca/d2l/login",
    iconKey: "brightspace",
    isInternal: false,
    kind: "external",
    isDefault: true,
    isHidden: true,
  },
  {
    id: "schoolcashonline",
    title: "SchoolCashOnline",
    url: "https://identity.schoolcashonline.com/Account/Login",
    iconKey: "schoolcashonline",
    isInternal: false,
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
const KNOWN_ACTIONS_BY_ID = {
  ...DEFAULT_ACTIONS_BY_ID,
  [BAYVIEW_MAP_ACTION.id]: BAYVIEW_MAP_ACTION,
};

const isQuickActionInternal = (
  action: Pick<QuickAction, "kind" | "isInternal">,
) => action.isInternal ?? action.kind === "internal";

const shouldIncludeBayviewMap = (schoolName: string | null) =>
  (schoolName ?? "").toLocaleLowerCase().includes("bayview secondary");

const reconcileSchoolQuickActions = (
  actions: QuickAction[],
  schoolName: string | null,
) => {
  const withoutBayview = actions.filter(
    (action) => action.id !== BAYVIEW_MAP_ACTION.id,
  );

  if (!shouldIncludeBayviewMap(schoolName)) {
    return withoutBayview;
  }

  const existingBayviewAction = actions.find(
    (action) => action.id === BAYVIEW_MAP_ACTION.id,
  );

  return existingBayviewAction
    ? [...withoutBayview, existingBayviewAction]
    : [...withoutBayview, BAYVIEW_MAP_ACTION];
};

const normalizeQuickActions = (actions: QuickAction[]): QuickAction[] => {
  const uniqueActions = actions.filter(
    (action, index, list) =>
      list.findIndex((item) => item.id === action.id) === index,
  );
  const normalized: QuickAction[] = uniqueActions.map((action) => {
    const defaultAction = KNOWN_ACTIONS_BY_ID[action.id];
    const resolvedAction = defaultAction
      ? { ...defaultAction, ...action }
      : action;
    const isInternal = isQuickActionInternal(resolvedAction);
    if (defaultAction) {
      return {
        ...resolvedAction,
        isInternal,
        isDefault: true,
        isHidden: action.isHidden ?? false,
      };
    }
    return {
      ...resolvedAction,
      isInternal,
      isDefault: false,
      isHidden: action.isHidden ?? false,
    };
  });

  DEFAULT_QUICK_ACTIONS.forEach((action) => {
    if (!normalized.some((item) => item.id === action.id)) {
      normalized.push({
        ...action,
        isInternal: isQuickActionInternal(action),
        isHidden: action.id === "teacher-search" ? false : true,
        isDefault: true,
      });
    }
  });

  return normalized;
};

const ProfileScreen = () => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const nativeTabsEnabled = useNativeTabsEnabled();
  const isLandscape = width > height;
  const headerTopMargin = Platform.OS === "ios" ? 72 : 64;
  const nativeTabBottomPadding = nativeTabsEnabled
    ? isLandscape
      ? 0
      : insets.bottom + 52
    : 24;

  const { isDark, activeTone, themePresetId } = useTheme();
  const { isAFool, visualHundredsEnabled, setVisualHundredsEnabled } =
    useAFoolVisualGrades();

  const [userName, setUserName] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [annualGrade, setAnnualGrade] = useState<StudentGrade | null>(null);
  const [annualGradeDismissed, setAnnualGradeDismissed] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [showActionManager, setShowActionManager] = useState(false);
  const [showActionEditor, setShowActionEditor] = useState(false);
  const [editingAction, setEditingAction] = useState<QuickAction | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [actionUrl, setActionUrl] = useState("");
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
      quality: 0.9,
    });
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
      aspect: [1, 1],
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

  const loadAnnualGradeState = useCallback(async () => {
    const activeCycleYear = getActiveStudentGradeCycleYear();
    if (activeCycleYear === null) {
      setAnnualGrade(null);
      setAnnualGradeDismissed(false);
      return;
    }

    const gradeStr = await SecureStorage.load(STUDENT_GRADE_STORAGE_KEY);
    const grade =
      gradeStr === "9"
        ? 9
        : gradeStr === "10"
          ? 10
          : gradeStr === "11"
            ? 11
            : gradeStr === "12"
              ? 12
              : null;
    setAnnualGrade(grade as StudentGrade | null);

    if (grade === null) {
      setAnnualGradeDismissed(false);
      return;
    }

    const [openedValue, shownValue] = await Promise.all([
      SecureStorage.load(STUDENT_GRADE_NOTIFICATION_OPENED_CYCLE_STORAGE_KEY),
      SecureStorage.load(STUDENT_GRADE_STARTUP_SHOWN_CYCLE_STORAGE_KEY),
    ]);

    const openedYear = openedValue ? parseInt(openedValue, 10) : null;
    const shownYear = shownValue ? parseInt(shownValue, 10) : null;
    setAnnualGradeDismissed(
      openedYear === activeCycleYear || shownYear === activeCycleYear,
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnnualGradeState();
    }, [loadAnnualGradeState]),
  );

  useEffect(() => {
    const loadQuickActions = async (schoolName: string | null) => {
      const storedActions = await AsyncStorage.getItem("quick_actions");
      if (storedActions) {
        try {
          const parsed: QuickAction[] = JSON.parse(storedActions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = normalizeQuickActions(
              reconcileSchoolQuickActions(parsed, schoolName),
            );
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
      const defaultActions = normalizeQuickActions(
        reconcileSchoolQuickActions(DEFAULT_QUICK_ACTIONS, schoolName),
      );
      setQuickActions(defaultActions);
      await AsyncStorage.setItem(
        "quick_actions",
        JSON.stringify(defaultActions),
      );
    };

    const loadProfileState = async () => {
      getUser();
      getImage();
      getBackgroundImage();
      const schoolName = await getSchool();
      await loadQuickActions(schoolName);
    };

    loadProfileState();
  }, []);

  const toggleAFoolVisualHundreds = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await setVisualHundredsEnabled(value);
  };

  const saveQuickActions = async (actions: QuickAction[]) => {
    const normalized = normalizeQuickActions(
      reconcileSchoolQuickActions(actions, school),
    );
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
    const isInternal = normalizedUrl.startsWith("/");
    const kind: NonNullable<QuickAction["kind"]> = isInternal
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
              isInternal,
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
        isInternal,
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
          text: "Yes, Delete",
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

  const visibleQuickActions =
    quickActions.length > 0
      ? quickActions.filter((action) => !action.isHidden)
      : normalizeQuickActions(
          reconcileSchoolQuickActions(DEFAULT_QUICK_ACTIONS, school),
        ).filter((action) => !action.isHidden);
  const hasCustomProfileImage = Boolean(image);
  const hasCustomBackgroundImage = Boolean(backgroundImage);
  const profileBannerWidth = Math.min(Math.max(width * 0.34, 300), 380);
  const compactActionButtonStyle = {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  } as const;
  const iconActionButtonStyle = {
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  } as const;
  const primaryActionButtonStyle = {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  } as const;
  const destructiveGlassTint = "rgba(214, 54, 63, 0.24)";
  const destructiveFallbackBackground = "rgba(214, 54, 63, 0.72)";

  const resolveQuickActionUrl = async (url: string) => {
    const teachAssistServer = await getTeachAssistServerOrigin();
    const normalizedUrl = url.replace("https://ta.yrdsb.ca", teachAssistServer);

    if (
      !normalizedUrl.includes("${username}") &&
      !normalizedUrl.includes("${password}")
    ) {
      return normalizedUrl;
    }
    const [savedUsername, savedPassword] = await Promise.all([
      SecureStorage.load("ta_username"),
      SecureStorage.load("ta_password"),
    ]);
    if (!savedUsername || !savedPassword) {
      Alert.alert("Please log in again.");
      return null;
    }
    return normalizedUrl
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
    await SecureStorage.delete(CUSTOM_THEME_IMAGE_STORAGE_KEY);
    await SecureStorage.delete("student_id_virtual_image");
    await SecureStorage.delete("reason_mapping");
    await clearGradeHistory();
    await AsyncStorage.removeItem("theme");
    await AsyncStorage.removeItem(THEME_SETTINGS_STORAGE_KEY);
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
    router.replace("/");
  };
  const profileBanner = (
    <ImageBackground
      source={
        backgroundImage
          ? { uri: backgroundImage }
          : isDark
            ? require("../../assets/images/mountain-background.webp")
            : require("../../assets/images/mountain-background-light.webp")
      }
      className={`w-full px-5 py-16 flex justify-center items-center overflow-hidden `}
      imageStyle={isLandscape ? { borderRadius: 12 } : undefined}
    >
      <View className="absolute top-3 right-3">
        <LiquidGlassButton
          contentStyle={{
            ...iconActionButtonStyle,
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
            setShowProfileImagesModal(true);
          }}
        >
          <Image
            className={`w-5 h-5`}
            style={{ tintColor: isDark ? "#edebea" : activeTone.accent }}
            source={require("../../assets/images/pencil.png")}
          />
        </LiquidGlassButton>
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
        {annualGradeDismissed && annualGrade !== null && (
          <LiquidGlassButton
            contentStyle={{
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
              marginTop: 8,
            }}
            glassTintColor={activeTone.accent}
            fallbackBackgroundColor={activeTone.accent}
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
              router.push("/DetermineGrade");
            }}
          >
            <Text
              className={`font-semibold text-sm ${isDark ? "text-appblack" : "text-appwhite"}`}
            >
              Grade {annualGrade}
            </Text>
          </LiquidGlassButton>
        )}
      </View>
    </ImageBackground>
  );
  const settingsContent = (
    <View className={isLandscape ? "mt-3" : `mx-5 mt-5`}>
      <View className={`mb-6`}>
        <View className={`flex-row items-center justify-between mb-4`}>
          <Text className={`text-2xl font-bold text-baccent`}>
            Quick Actions
          </Text>
          <LiquidGlassButton
            contentStyle={{
              ...iconActionButtonStyle,
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
              openActionManager();
              hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Image
              className={`w-5 h-5`}
              style={{ tintColor: isDark ? "#edebea" : activeTone.accent }}
              source={require("../../assets/images/pencil.png")}
            />
          </LiquidGlassButton>
        </View>
        <View className={`flex-row flex-wrap -mx-2`}>
          {visibleQuickActions.map((action) => (
            <View key={action.id} className={`w-1/2 px-2 mb-4`}>
              <LiquidGlassButton
                className="rounded-xl p-4 items-center "
                fallbackBackgroundColor={activeTone.bg3}
                glassTintColor={activeTone.bg2}
                glassEffectStyle="clear"
                onPress={async () => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  if (action.kind === "internal") {
                    router.push(action.url as any);
                  } else {
                    let resolvedUrl = action.url;
                    const resolved = await resolveQuickActionUrl(action.url);
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
                    tintColor:
                      themePresetId === "default"
                        ? isDark
                          ? "#94959c"
                          : "#6d6e77"
                        : activeTone.accent,
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
              </LiquidGlassButton>
            </View>
          ))}
        </View>
      </View>
      {isAFool && (
        <View className={`mb-6`}>
          <Text className={`text-2xl font-bold text-baccent mb-4`}>
            Important Settings
          </Text>
          <LiquidGlassView
            className=" rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className={`px-4 py-3 flex-row justify-between items-center`}>
              <View className={`flex-1 pr-3`}>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Perfect Marks
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  A bold new direction.{" "}
                  {visualHundredsEnabled ? (
                    <Text
                      className={`${isDark ? "text-appgraydark/60" : "text-appgraylight/60"} text-sm mt-1`}
                    >{`\ndon't worry, this is only visual... !!`}</Text>
                  ) : (
                    ""
                  )}
                </Text>
              </View>
              <TouchableOpacity
                className={`w-13 h-8 rounded-full ${visualHundredsEnabled ? "bg-baccent" : isDark ? "bg-dark4" : "bg-light4"} flex-row items-center`}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                onPress={() => {
                  toggleAFoolVisualHundreds(!visualHundredsEnabled);
                }}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white  transition-all duration-200 ${visualHundredsEnabled ? "ml-6" : "ml-0.5"}`}
                />
              </TouchableOpacity>
            </View>
          </LiquidGlassView>
        </View>
      )}
      <Text className={`text-2xl font-bold text-baccent mb-4`}>Settings</Text>
      <View className="mb-10">
        <LiquidGlassView
          className=" rounded-2xl overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          {[
            {
              title: "Notifications",
              subtitle: "Get notified on your academics.",
              icon: require("../../assets/images/bell.png"),
              action: () => router.push("/Notifications"),
            },
            {
              title: "Personalization",
              subtitle: "Customize teachassist with themes.",
              icon: require("../../assets/images/paintbrush.png"),
              action: () => router.push("/Personalization"),
            },
            {
              title: "Privacy",
              subtitle: "Control grade privacy and visibility.",
              icon: require("../../assets/images/lock.png"),
              action: () => router.push("/Privacy"),
            },
            {
              title: "Support",
              subtitle: "Get help with using teachassist.",
              icon: require("../../assets/images/support-icon.png"),
              action: () => router.push("/Support"),
            },
            {
              title: "Legal",
              subtitle: "Regulatory information and credits.",
              icon: require("../../assets/images/paper.png"),
              action: () => router.push("/Legal"),
            },
            {
              title: "Advanced",
              subtitle: "Modify power user settings.",
              icon: require("../../assets/images/wrench.png"),
              action: () => router.push("/AdvancedView"),
            },
          ].map((item, index) => (
            <View key={item.title}>
              <TouchableOpacity
                className="px-5 py-4"
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  item.action();
                }}
              >
                <View className="flex-row items-center">
                  <View className="bg-baccent/80 mr-4 p-2 rounded-full">
                    <Image
                      className="w-6 h-6"
                      style={{ tintColor: "#fafafa" }}
                      source={item.icon}
                    />
                  </View>
                  <View className="flex-1">
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
              {index < 5 ? (
                <View
                  className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
                />
              ) : null}
            </View>
          ))}
        </LiquidGlassView>
      </View>
    </View>
  );
  const footerContent = (
    <View className={`mb-8 mt-5`}>
      <View className={`items-center`}>
        <View className="">
          <LiquidGlassButton
            className="rounded-sm p-1 mb-3"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
            contentStyle={{
              borderRadius: 12,
              paddingHorizontal: 5,
              paddingVertical: 5,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => {
              hapticsNotification(Haptics.NotificationFeedbackType.Success);
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
          </LiquidGlassButton>
        </View>
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"} font-bold text-lg`}
        >
          TeachAssist
        </Text>
        <Text
          className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mb-2`}
        >
          Version {appVersionLabel.substring(1)} (67)
        </Text>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => {
              hapticsNotification(Haptics.NotificationFeedbackType.Success);
              Linking.openURL("https://prmntr.com/teachassist");
            }}
          >
            <Image
              source={require("../../assets/images/link.png")}
              className={`w-6 h-6 my-1 mr-3`}
              style={{ tintColor: activeTone.accent }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              hapticsNotification(Haptics.NotificationFeedbackType.Success);
              Linking.openURL("https://www.instagram.com/teach.assist/");
            }}
          >
            <Image
              source={require("../../assets/images/instagram.png")}
              className={`w-6 h-6 my-1`}
              style={{ tintColor: activeTone.accent }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  const logoutButton = (
    <LiquidGlassButton
      contentStyle={{
        ...primaryActionButtonStyle,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOpacity: isDark ? 0.2 : 0.12,
        shadowRadius: 10,
        shadowOffset: {
          width: 0,
          height: 4,
        },
        elevation: 4,
      }}
      glassTintColor={activeTone.accent}
      fallbackBackgroundColor={activeTone.accent}
      onPress={() => {
        promptLogout();
        hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
      }}
    >
      <View className={`flex-row justify-center items-center`}>
        <Text
          className={`${isDark ? "text-appblack" : "text-appwhite"} text-xl font-bold`}
        >
          Log Out
        </Text>
      </View>
    </LiquidGlassButton>
  );
  const quoteContent = (
    <Text
      className={`mt-0 mb-7 text-center text-sm italic ${isDark ? "text-dark4" : "text-light4"}`}
    >
      {`"Pretend to be weak, so your enemy may grow arrogant."`}
    </Text>
  );
  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      {(now >= start && now <= new Date(year, 11, 31, 23, 59, 59, 999)) ||
      (now.getMonth() === 0 && now <= end) ? (
        <SnowEffect count={37} speed={1.1} drift={26} />
      ) : (
        <></>
      )}
      <Modal visible={showProfileImagesModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <LiquidGlassView
            containerClassName="w-full max-w-md"
            className="rounded-xl py-6 px-6"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="regular"
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
              >
                Edit Profile Images
              </Text>
              <LiquidGlassButton
                contentStyle={iconActionButtonStyle}
                glassTintColor={activeTone.accent}
                fallbackBackgroundColor={activeTone.accent}
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  setShowProfileImagesModal(false);
                }}
              >
                <Image
                  className={`w-5 h-5`}
                  style={{
                    tintColor: isDark ? "#edebea" : "#2f3035",
                  }}
                  source={require("../../assets/images/checkmark.png")}
                />
              </LiquidGlassButton>
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
                    ? "Using custom image."
                    : "Using default image."}
                </Text>
              </View>
              <View className="flex-row">
                <LiquidGlassButton
                  containerStyle={{ marginRight: 8 }}
                  contentStyle={compactActionButtonStyle}
                  glassTintColor={activeTone.accent}
                  fallbackBackgroundColor={activeTone.accent}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    pickImage();
                  }}
                >
                  <Text
                    className={`${isDark ? "text-appblack" : "text-appwhite"} text-sm font-semibold`}
                  >
                    Change
                  </Text>
                </LiquidGlassButton>
                <LiquidGlassButton
                  contentStyle={compactActionButtonStyle}
                  glassTintColor={
                    hasCustomProfileImage
                      ? destructiveGlassTint
                      : activeTone.bg4
                  }
                  fallbackBackgroundColor={
                    hasCustomProfileImage
                      ? destructiveFallbackBackground
                      : activeTone.bg4
                  }
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    resetImage();
                  }}
                  disabled={!hasCustomProfileImage}
                >
                  <Text
                    className={`${hasCustomProfileImage ? "text-appwhite" : isDark ? "text-appwhite" : "text-appblack"} text-sm font-semibold`}
                  >
                    Reset
                  </Text>
                </LiquidGlassButton>
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
                    ? "Using custom background."
                    : "Using default background."}
                </Text>
              </View>
              <View className="flex-row">
                <LiquidGlassButton
                  containerStyle={{ marginRight: 8 }}
                  contentStyle={compactActionButtonStyle}
                  glassTintColor={activeTone.accent}
                  fallbackBackgroundColor={activeTone.accent}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    pickBackgroundImage();
                  }}
                >
                  <Text
                    className={`${isDark ? "text-appblack" : "text-appwhite"} text-sm font-semibold`}
                  >
                    Change
                  </Text>
                </LiquidGlassButton>
                <LiquidGlassButton
                  contentStyle={compactActionButtonStyle}
                  glassTintColor={
                    hasCustomBackgroundImage
                      ? destructiveGlassTint
                      : activeTone.bg4
                  }
                  fallbackBackgroundColor={
                    hasCustomBackgroundImage
                      ? destructiveFallbackBackground
                      : activeTone.bg4
                  }
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    resetBackgroundImage();
                  }}
                  disabled={!hasCustomBackgroundImage}
                >
                  <Text
                    className={`${hasCustomBackgroundImage ? "text-appwhite" : isDark ? "text-appwhite" : "text-appblack"} text-sm font-semibold`}
                  >
                    Reset
                  </Text>
                </LiquidGlassButton>
              </View>
            </View>
          </LiquidGlassView>
        </View>
      </Modal>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: nativeTabBottomPadding,
          paddingTop: 0,
        }}
      >
        <Text
          className={`text-5xl font-semibold leading-[40px] ${isDark ? "text-appwhite" : "text-appblack"} mx-5 pb-5`}
          style={{ marginTop: headerTopMargin }}
        >
          Settings
        </Text>
        {isLandscape ? (
          <View className="flex-row items-start gap-5 mx-5 mb-10">
            <View style={{ width: profileBannerWidth }}>
              {profileBanner}
              <View className="mt-5">
                {footerContent}
                {logoutButton}
                {quoteContent}
              </View>
            </View>
            <View className="flex-1">{settingsContent}</View>
          </View>
        ) : (
          <>
            {profileBanner}
            {settingsContent}
            <View className="mx-5">{logoutButton}</View>
            {footerContent}
            {quoteContent}
          </>
        )}

        <Modal visible={showActionManager} transparent animationType="fade">
          <View className="flex-1 bg-black/60 items-center justify-center px-5">
            <LiquidGlassView
              containerClassName="w-full max-w-md"
              className="rounded-2xl p-5"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="regular"
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-bold`}
                >
                  Manage Quick Actions
                </Text>
                <LiquidGlassButton
                  contentStyle={iconActionButtonStyle}
                  glassTintColor={activeTone.accent}
                  fallbackBackgroundColor={activeTone.accent}
                  onPress={() => {
                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    setShowActionManager(false);
                  }}
                >
                  <Image
                    className={`w-6 h-6`}
                    style={{
                      tintColor: isDark ? "#2f3035" : "#edebea",
                    }}
                    source={require("../../assets/images/checkmark.png")}
                  />
                </LiquidGlassButton>
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
                    <View className="flex-row items-center shrink-0">
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
                    <View className="flex-1 min-w-0 pr-3 pl-1">
                      <Text
                        className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold`}
                        numberOfLines={1}
                      >
                        {action.title}
                      </Text>
                      {!isQuickActionInternal(action) ? (
                        <Text
                          className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-xs`}
                          numberOfLines={1}
                        >
                          {action.url}
                        </Text>
                      ) : null}
                    </View>
                    <View className="flex-row items-center shrink-0">
                      {!isQuickActionInternal(action) ? (
                        <TouchableOpacity
                          onPress={() => {
                            hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                            openActionEditor(action);
                          }}
                          className="p-1 mr-1"
                        >
                          <Image
                            source={require("../../assets/images/pencil.png")}
                            className="w-5 h-5"
                            style={{
                              tintColor: isDark ? "#edebea" : "#2f3035",
                            }}
                          />
                        </TouchableOpacity>
                      ) : null}
                      {action.isDefault ? (
                        <TouchableOpacity
                          onPress={() => {
                            hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                            setDefaultActionHidden(action.id, !action.isHidden);
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

              <LiquidGlassButton
                contentStyle={{
                  ...primaryActionButtonStyle,
                  marginTop: 12,
                }}
                glassTintColor={activeTone.accent}
                fallbackBackgroundColor={activeTone.accent}
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  openActionEditor();
                }}
              >
                <Text
                  className={`${isDark ? "text-appblack" : "text-appwhite"} text-md font-semibold`}
                >
                  Add Action
                </Text>
              </LiquidGlassButton>
            </LiquidGlassView>
          </View>
        </Modal>
        <Modal visible={showActionEditor} transparent animationType="fade">
          <KeyboardAvoidingView className="flex-1" keyboardVerticalOffset={24}>
            <View className="flex-1 bg-black/60 items-center justify-center px-5">
              <LiquidGlassView
                containerClassName="w-full max-w-md"
                className="rounded-2xl p-5"
                fallbackBackgroundColor={activeTone.bg3}
                glassTintColor={activeTone.bg2}
                glassEffectStyle="regular"
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
                <AppTextInput
                  value={actionTitle}
                  onChangeText={setActionTitle}
                  placeholder="School Website"
                  placeholderTextColor={isDark ? "#6d6e77" : "#8b8c95"}
                  className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded-xl px-3 py-2 mb-3`}
                />
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mb-1`}
                >
                  URL
                </Text>
                <AppTextInput
                  value={actionUrl}
                  onChangeText={setActionUrl}
                  placeholder="https://yeezy.com"
                  placeholderTextColor={isDark ? "#6d6e77" : "#8b8c95"}
                  autoCapitalize="none"
                  className={`${isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"} rounded-xl px-3 py-2 mb-4`}
                />
                <View className="flex-row justify-end">
                  <LiquidGlassButton
                    containerStyle={{ marginRight: 8 }}
                    contentStyle={compactActionButtonStyle}
                    glassTintColor={activeTone.bg4}
                    fallbackBackgroundColor={activeTone.bg4}
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
                  </LiquidGlassButton>
                  <LiquidGlassButton
                    contentStyle={compactActionButtonStyle}
                    glassTintColor={activeTone.accent}
                    fallbackBackgroundColor={activeTone.accent}
                    onPress={() => {
                      hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                      saveActionEdits();
                    }}
                  >
                    <Text className={`text-appblack font-semibold`}>Save</Text>
                  </LiquidGlassButton>
                </View>
              </LiquidGlassView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
