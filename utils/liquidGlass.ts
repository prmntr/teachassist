import { isLiquidGlassAvailable } from "expo-glass-effect";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export const LIQUID_GLASS_ENABLED_KEY = "liquid_glass_enabled";

type LiquidGlassListener = (enabled: boolean) => void;

const listeners = new Set<LiquidGlassListener>();

export const getLiquidGlassEnabled = async () => {
  const stored = await AsyncStorage.getItem(LIQUID_GLASS_ENABLED_KEY);
  return stored === "true";
};

export const setLiquidGlassEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(LIQUID_GLASS_ENABLED_KEY, enabled ? "true" : "false");
  listeners.forEach((listener) => listener(enabled));
};

export const subscribeLiquidGlass = (listener: LiquidGlassListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useLiquidGlassEnabled = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getLiquidGlassEnabled()
      .then((nextEnabled) => {
        if (isMounted) {
          setEnabled(nextEnabled);
        }
      })
      .catch((error) => {
        console.warn("liquidGlass: failed to load setting", error);
      });

    const unsubscribe = subscribeLiquidGlass((nextEnabled) => {
      setEnabled(nextEnabled);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return enabled;
};

export const useLiquidGlassActive = () => {
  const enabled = useLiquidGlassEnabled();
  return enabled && isLiquidGlassAvailable();
};
