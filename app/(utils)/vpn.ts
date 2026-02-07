import NetInfo from "@react-native-community/netinfo";
import { Alert } from "react-native";

const isVpnState = (type?: string | null, details?: unknown): boolean => {
  if (type === "vpn") return true;
  const typedDetails = details as { isVPN?: boolean } | null | undefined;
  return Boolean(typedDetails?.isVPN);
};

export const ensureVpnDisabled = async (): Promise<boolean> => {
  try {
    const networkState = await NetInfo.fetch();
    if (isVpnState(networkState.type, networkState.details)) {
      Alert.alert(
        "VPN detected",
        "Please turn off your VPN before logging in to TeachAssist."
      );
      return false;
    }
  } catch {
    // If VPN detection fails, allow login to proceed.
  }
  return true;
};
