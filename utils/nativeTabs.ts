import { useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  getLiquidGlassEnabled,
  subscribeLiquidGlass,
} from "./liquidGlass";

export const nativeTabsSupported = Platform.OS !== "android";

export const getNativeTabsEnabled = async () => {
  if (!nativeTabsSupported) {
    return false;
  }

  return getLiquidGlassEnabled();
};

export const useNativeTabsEnabled = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getNativeTabsEnabled()
      .then((nextEnabled) => {
        if (isMounted) {
          setEnabled(nextEnabled);
        }
      })
      .catch((error) => {
        console.warn("nativeTabs: failed to load setting", error);
      });

    const unsubscribe = subscribeLiquidGlass((nextEnabled) => {
      setEnabled(nextEnabled && nativeTabsSupported);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return enabled;
};
