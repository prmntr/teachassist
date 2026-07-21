import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import {
  Alert as RNAlert,
  Image,
  type ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { hapticsImpact } from "@/utils/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";

export type AppAlertButtonStyle = "default" | "cancel" | "destructive";

export interface AppAlertButton {
  text?: string;
  onPress?: () => void;
  style?: AppAlertButtonStyle;
}

export interface AppAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
  /** Optional icon shown, tinted, in an accent circle at the top of the alert. */
  icon?: ImageSourcePropType;
}

/**
 * Shared, semantically-named icons for alerts. Each is tinted white and shown in
 * an accent circle at the top of the modal. Swap an asset here to change it
 * everywhere, or point a call site at a different key.
 */
export const AlertIcon = {
  error: require("../../assets/images/caution.png"),
  success: require("../../assets/images/checkmark.png"),
  question: require("../../assets/images/question.png"),
  delete: require("../../assets/images/trash-bin.png"),
  notification: require("../../assets/images/bell.png"),
  lock: require("../../assets/images/lock.png"),
  calendar: require("../../assets/images/appointment_book.png"),
  link: require("../../assets/images/link-chain.png"),
} as const;

interface AppAlertConfig {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options?: AppAlertOptions;
}

type AlertFn = (
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: AppAlertOptions,
) => void;

// Module-level handle to the mounted host so the imperative API can be called
// from anywhere, including non-component code (e.g. utils/vpn.ts). Falls back to
// the native alert if the host has not mounted yet.
let hostShow: AlertFn | null = null;


export const AppAlert = {
  /**
   * Drop-in for RN's Alert.alert. The 3rd arg may be either a buttons array or,
   * when there are no custom buttons, an options object (so you can write
   * `AppAlert.alert(title, message, { icon: AlertIcon.error })`).
   */
  alert: (
    title: string,
    message?: string,
    buttonsOrOptions?: AppAlertButton[] | AppAlertOptions,
    maybeOptions?: AppAlertOptions,
  ) => {
    const buttons = Array.isArray(buttonsOrOptions)
      ? buttonsOrOptions
      : undefined;
    const options = Array.isArray(buttonsOrOptions)
      ? maybeOptions
      : buttonsOrOptions;
    if (hostShow) {
      hostShow(title, message, buttons, options);
    } else {
      RNAlert.alert(title, message, buttons, options);
    }
  },
};

const normalizeButtons = (buttons?: AppAlertButton[]): AppAlertButton[] => {
  if (buttons && buttons.length > 0) return buttons;
  return [{ text: "Got it!", style: "default" }];
};

/**
 * Mount once near the root (inside ThemeProvider). Renders the custom alert
 * modal and wires up the imperative AppAlert.alert(...) API.
 */
export const AppAlertHost = () => {
  const { activeTone, isDark } = useTheme();
  const [config, setConfig] = useState<AppAlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback<AlertFn>((title, message, buttons, options) => {
    setConfig({
      title,
      message,
      buttons: normalizeButtons(buttons),
      options,
    });
    setVisible(true);
    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  useEffect(() => {
    hostShow = show;
    return () => {
      if (hostShow === show) hostShow = null;
    };
  }, [show]);

  const close = () => setVisible(false);

  const handlePress = (button: AppAlertButton) => {
    hapticsImpact(
      button.style === "destructive"
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
    setVisible(false);
    button.onPress?.();
  };

  const handleDismiss = () => {
    if (config?.options?.cancelable === false) return;
    close();
    config?.options?.onDismiss?.();
  };

  if (!config) return null;

  // Filled action buttons come first for prominence; cancel buttons sit below
  // as subdued text, mirroring the existing modals' primary/secondary layout.
  const actionButtons = config.buttons.filter((b) => b.style !== "cancel");
  const cancelButtons = config.buttons.filter((b) => b.style === "cancel");
  const orderedButtons = [...actionButtons, ...cancelButtons];

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleDismiss}
    >
      <View className="flex-1 bg-black/60 justify-center items-center px-5">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-2xl w-full max-w-md overflow-hidden`}
        >
          <View className="px-6 pt-7 pb-1">
            {config.options?.icon ? (
              <View className="items-center mb-5">
                <Image
                  source={config.options.icon}
                  style={{
                    tintColor: activeTone.accent,
                    width: 85,
                    height: 85,
                  }}
                />
              </View>
            ) : null}
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-2xl font-semibold`}
            >
              {config.title}
            </Text>
            {config.message ? (
              <Text
                className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-base mt-2`}
              >
                {config.message}
              </Text>
            ) : null}
          </View>

          <View className="px-6 pb-6 pt-4">
            {orderedButtons.map((button, index) => {
              const isCancel = button.style === "cancel";
              const isDestructive = button.style === "destructive";
              const label = button.text ?? (isCancel ? "Cancel" : "Got it!");

              const containerClass = isDestructive
                ? "bg-danger"
                : isCancel
                  ? isDark
                    ? "bg-dark4"
                    : "bg-light4"
                  : isDark
                    ? "bg-baccent/80"
                    : "bg-baccent";

              const textClass = isDestructive
                ? "text-appwhite"
                : isCancel
                  ? isDark
                    ? "text-appwhite"
                    : "text-appblack"
                  : isDark
                    ? "text-appblack text-xl"
                    : "text-appwhite";

              return (
                <TouchableOpacity
                  key={`${label}-${index}`}
                  className={`${containerClass} rounded-xl ${isDestructive || isCancel ? "p-3" : "p-2"} ${index > 0 ? "mt-2" : ""}`}
                  onPress={() => handlePress(button)}
                >
                  <Text className={`${textClass} text-center font-medium`}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AppAlertHost;
