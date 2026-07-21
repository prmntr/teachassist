import Text from "@/components/ui/AppText";
import AppTextInput from "@/components/ui/AppTextInput";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { SnowEffect } from "@/components/ui/SnowEffect";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact} from "@/utils/haptics";
import { useNativeTabsEnabled } from "@/utils/nativeTabs";
import { getTeachAssistServerOrigin } from "@/utils/serverConfig";
import {
  getActiveStudentGradeCycleYear,
  STUDENT_GRADE_NOTIFICATION_OPENED_CYCLE_STORAGE_KEY,
  STUDENT_GRADE_STARTUP_SHOWN_CYCLE_STORAGE_KEY,
  STUDENT_GRADE_STORAGE_KEY,
  type StudentGrade,
} from "@/utils/studentGrade";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
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
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SecureStorage } from "../(auth)/taauth";

const HEADER_ACTION_BUTTON_SIZE = 48;
const HEADER_ACTION_ICON_SIZE = 25;

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
  brightspace: require("../../assets/images/brightspace.png"),
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
  const headerTopMargin = Platform.OS === "ios" ? 56 : 59;
  const nativeTabBottomPadding = nativeTabsEnabled
    ? isLandscape
      ? 0
      : insets.bottom + 44
    : 16;

  const { isDark, activeTone, themePresetId } = useTheme();

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
      AppAlert.alert(
        "Missing info",
        "Add a title and a URL to save this action.",
        { icon: AlertIcon.error },
      );
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
        AppAlert.alert(
          "Default Action",
          "Default quick actions can only be hidden or added back from the manager.",
          { icon: AlertIcon.error },
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
    AppAlert.alert(
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
      { icon: AlertIcon.delete },
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
      AppAlert.alert("Please log in again.", undefined, {
        icon: AlertIcon.error,
      });
      return null;
    }
    return normalizedUrl
      .replace("${username}", encodeURIComponent(savedUsername))
      .replace("${password}", encodeURIComponent(savedPassword));
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
      className={`${isLandscape ? "" : "w-full "}px-5 flex justify-center items-center overflow-hidden`}
      style={isLandscape ? { flex: 1 } : { paddingVertical: 45 }}
      imageStyle={isLandscape ? { borderRadius: 12 } : undefined}
    >
      <View className="absolute top-3 right-3">
        <LiquidGlassButton
          contentStyle={{
            ...iconActionButtonStyle,
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
    <View className={isLandscape ? "" : `mx-5 mt-5`}>
      <View className={`mb-6`}>
        <View className={`flex-row items-center justify-between mb-4`}>
          <Text className={`text-2xl font-bold text-baccent`}>
            Quick Actions
          </Text>
          <LiquidGlassButton
            contentStyle={{
              ...iconActionButtonStyle,
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
            <View key={action.id} className={isLandscape ? `w-1/3 px-2 mb-6` : `w-1/2 px-2 mb-4`}>
              <LiquidGlassButton
                className={isLandscape ? "rounded-xl overflow-hidden" : "rounded-xl p-4 items-center"}
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
                {isLandscape ? (
                  <View style={{ minHeight: 144, width: "100%", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 20, overflow: "hidden" }}>
                    <Text
                      className={`${isDark ? "text-appwhite/90" : "text-appblack/90"} font-semibold text-3xl mr-10`}
                      numberOfLines={2}
                      style={{ flex: 1, zIndex: 1 }}
                    >
                      {action.title}
                    </Text>
                    <Image
                      style={{
                        width: 90,
                        height: 90,
                        opacity: 0.16,
                        position: "absolute",
                        right: -6,
                        bottom: -6,
                        tintColor:
                          themePresetId === "default"
                            ? isDark
                              ? "#94959c"
                              : "#6d6e77"
                            : activeTone.accent,
                      }}
                      source={QUICK_ACTION_ICONS[action.iconKey] ?? QUICK_ACTION_ICONS.custom}
                    />
                  </View>
                ) : (
                  <>
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
                  </>
                )}
              </LiquidGlassButton>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
  const profileHeader = (
    <View
      className={`flex-row items-center justify-between px-5 mb-4`}
      style={{ marginTop: headerTopMargin }}
    >
      <Text
        className={`text-5xl font-semibold leading-[55px] ${isDark ? "text-appwhite" : "text-appblack"}`}
      >
        My Profile
      </Text>
      <View className="">
        <LiquidGlassButton
          onPress={() => {
            router.push("/ProfileSettings");
            hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
          }}
          contentStyle={{
            borderRadius: 12,
            width: HEADER_ACTION_BUTTON_SIZE,
            height: HEADER_ACTION_BUTTON_SIZE - 5,
            alignItems: "center",
            justifyContent: "center",
          }}
          glassTintColor={activeTone.accent}
          fallbackBackgroundColor={activeTone.accent}
        >
          <Image
            source={require("../../assets/images/settings-cog.png")}
            style={{
              width: HEADER_ACTION_ICON_SIZE,
              height: HEADER_ACTION_ICON_SIZE,
              resizeMode: "contain",
              tintColor: isDark ? "#111113" : "#fbfbfb",
            }}
          />
        </LiquidGlassButton>
      </View>
    </View>
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
                    tintColor: isDark ? "#2f3035" : "#edebea",
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
      {isLandscape ? (
        <View className="flex-1" style={{ paddingBottom: nativeTabBottomPadding }}>
          {profileHeader}
          <View className="flex-1 flex-row gap-4 mx-5 mb-5">
            <View style={{ flex: 1 }} className="self-stretch">{profileBanner}</View>
            <View style={{ flex: 2 }}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {settingsContent}
            </ScrollView>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: nativeTabBottomPadding }}
        >
          {profileHeader}
          {profileBanner}
          {settingsContent}
        </ScrollView>
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
    </View>
  );
};

export default ProfileScreen;
