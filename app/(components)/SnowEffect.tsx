import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

type SnowEffectProps = {
  /** Number of flakes on screen at once */
  count?: number;
  /** Controls overall speed. Higher = faster */
  speed?: number;
  /** If true, stops animations */
  paused?: boolean;
  /** Optional style for the absolute overlay container */
  style?: ViewStyle;
  /** Flake color (defaults to white*/
  color?: string;
  /** Min/max flake size in px */
  sizeRange?: [number, number];
  /** Min/max opacity */
  opacityRange?: [number, number];
  /** Horizontal drift amplitude in px */
  drift?: number;
};

type FlakeConfig = {
  size: number;
  opacity: number;
  x0: number; // initial x within container
  driftPhase: number; // random phase for sway
  durationMs: number;
  delayMs: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const SnowEffect: React.FC<SnowEffectProps> = ({
  count = 70,
  speed = 1,
  paused = false,
  style,
  color = "#FFFFFF",
  sizeRange = [2, 7],
  opacityRange = [0.35, 0.95],
  drift = 22,
}) => {
  const [bounds, setBounds] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  // One progress Animated.Value per flake (0 -> 1 loops)
  const progresses = useRef<Animated.Value[]>([]).current;
  const animations = useRef<Animated.CompositeAnimation[]>([]).current;

  const flakes: FlakeConfig[] = useMemo(() => {
    // Rebuild configs when bounds/count/speed change
    const w = Math.max(bounds.w, 1);
    const h = Math.max(bounds.h, 1);

    return Array.from({ length: count }).map(() => {
      const size = rand(sizeRange[0], sizeRange[1]);
      const opacity = rand(opacityRange[0], opacityRange[1]);
      const x0 = rand(0, w);
      const driftPhase = rand(0, Math.PI * 2);

      // Duration scales with container height + some randomness
      const base = 3200 + h * 5; // height-sensitive
      const jitter = rand(-900, 1400);
      const durationMs = clamp(
        (base + jitter) / clamp(speed, 0.1, 10),
        900,
        20000
      );

      const delayMs = rand(0, 2000);

      return { size, opacity, x0, driftPhase, durationMs, delayMs };
    });
  }, [bounds.w, bounds.h, count, speed, sizeRange, opacityRange]);

  // Ensure progresses array matches count
  useEffect(() => {
    while (progresses.length < count)
      progresses.push(new Animated.Value(Math.random()));
    while (progresses.length > count) progresses.pop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // Start / stop looped animations
  useEffect(() => {
    // Stop any existing animations
    animations.splice(0, animations.length).forEach((a) => a.stop());

    if (paused || bounds.w <= 0 || bounds.h <= 0) return;

    for (let i = 0; i < count; i++) {
      const v = progresses[i];
      v.stopAnimation();
      v.setValue(Math.random());

      const cfg = flakes[i];

      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(cfg.delayMs),
          Animated.timing(v, {
            toValue: 1,
            duration: cfg.durationMs,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // reset to 0 instantly then repeat
          Animated.timing(v, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      animations[i] = anim;
      anim.start();
    }

    return () => {
      animations.forEach((a) => a?.stop());
    };
  }, [paused, bounds.w, bounds.h, count, flakes, progresses, animations]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBounds({ w: width, h: height });
  };

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, style]}
    >
      {bounds.w > 0 &&
        bounds.h > 0 &&
        flakes.map((cfg, i) => {
          const p = progresses[i] ?? new Animated.Value(0);

          // y: from slightly above to below bottom
          const translateY = p.interpolate({
            inputRange: [0, 1],
            outputRange: [-20 - cfg.size, bounds.h + 20 + cfg.size],
          });

          // x: base x + gentle sine-like sway
          // We approximate sine sway with a triangle wave: 0->1->0->-1->0 style
          const sway = p.interpolate({
            inputRange: [0, 0.25, 0.5, 0.75, 1],
            outputRange: [0, drift, 0, -drift, 0].map(
              (v) => v + Math.sin(cfg.driftPhase) * 2
            ), // tiny per-flake bias
          });

          const translateX = Animated.add(new Animated.Value(cfg.x0), sway);

          return (
            <Animated.View
              key={i}
              style={[
                styles.flake,
                {
                  width: cfg.size,
                  height: cfg.size,
                  borderRadius: cfg.size / 2,
                  opacity: cfg.opacity,
                  backgroundColor: color,
                  transform: [{ translateX }, { translateY }],
                },
              ]}
            />
          );
        })}
    </View>
  );
};

const styles = StyleSheet.create({
  flake: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
