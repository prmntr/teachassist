import { Skia } from "@shopify/react-native-skia";

export type ThemeMode = "light" | "dark";
export type ThemePresetId =
  | "default"
  | "ocean"
  | "sunset"
  | "forest"
  | "lavender"
  | "rose"
  | "slate"
  | "amber"
  | "midnight"
  | "amoled"
  | "custom";
export type BuiltInThemePresetId = Exclude<ThemePresetId, "custom">;
export type FontPresetId = "system" | "domine" | "GoogleSans" | "JetBrainsMono";

export type ThemeTone = {
  bg1: string;
  bg2: string;
  bg3: string;
  bg4: string;
  fg: string;
  muted: string;
  accent: string;
  border: string;
};

export type ThemePresetDefinition = {
  id: ThemePresetId;
  name: string;
  description: string;
  light: ThemeTone;
  dark: ThemeTone;
};

export type FontPresetDefinition = {
  id: FontPresetId;
  name: string;
  description: string;
  regularFamily?: string;
  mediumFamily?: string;
  semiboldFamily?: string;
  boldFamily?: string;
  inputFamily?: string;
};

export type StoredThemeSettings = {
  mode: ThemeMode;
  presetId: ThemePresetId;
  fontPresetId: FontPresetId;
  customPreset: ThemePresetDefinition | null;
};

export const THEME_SETTINGS_STORAGE_KEY = "theme_settings_v2";
export const PAGE_BACKGROUND_ENABLED_STORAGE_KEY = "page_background_enabled";
export const CUSTOM_THEME_IMAGE_STORAGE_KEY = "custom_theme_image";

export const DEFAULT_STATUS_COLORS = {
  success: "#2faf7f",
  caution: "#fcc245",
  warning: "#f67c15",
  danger: "#d6363f",
  info: "#0272de",
};

export const FONT_PRESETS: FontPresetDefinition[] = [
  {
    id: "system",
    name: "Default",
    description: "Your device's default font.",
  },
  {
    id: "domine",
    name: "Derive",
    description: "Elegant and tasteful.",
    regularFamily: "Domine-Regular",
    mediumFamily: "Domine-Medium",
    semiboldFamily: "Domine-SemiBold",
    boldFamily: "Domine-Bold",
    inputFamily: "Domine-Regular",
  },
  {
    id: "GoogleSans",
    name: "Sosumi",
    description: "My personal favourite :3",
    regularFamily: "GoogleSans-Regular",
    mediumFamily: "GoogleSans-Medium",
    semiboldFamily: "GoogleSans-SemiBold",
    boldFamily: "GoogleSans-Bold",
    inputFamily: "GoogleSans-Regular",
  },
  {
    id: "JetBrainsMono",
    name: "Dyke",
    description: "Serious and stoic.",
    regularFamily: "JetBrainsMono-Regular",
    mediumFamily: "JetBrainsMono-Medium",
    semiboldFamily: "JetBrainsMono-SemiBold",
    boldFamily: "JetBrainsMono-Bold",
    inputFamily: "JetBrainsMono-Regular",
  },
];

// Shared by both "modes" of the amoled preset below — true black (not just a
// very dark grey) so OLED panels can actually turn those pixels off.
const AMOLED_TONE: ThemeTone = {
  bg1: "#000000",
  bg2: "#0a0a0a",
  bg3: "#0d0d0d",
  bg4: "#161616",
  fg: "#f5f5f5",
  muted: "#8a8a8a",
  accent: "#27b1fa",
  border: "#1f1f1f",
};

export const BUILT_IN_THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: "default",
    name: "TeachAssist",
    description: "Clean greys and crisp blue.",
    light: {
      bg1: "#fbfbfb",
      bg2: "#e7e7e9",
      bg3: "#eeeeef",
      bg4: "#dddde0",
      fg: "#2f3035",
      muted: "#82838b",
      accent: "#27b1fa",
      border: "#d5d7db",
    },
    dark: {
      bg1: "#111113",
      bg2: "#191919",
      bg3: "#191a1d",
      bg4: "#232427",
      fg: "#fafafa",
      muted: "#aaaab1",
      accent: "#48c1ff",
      border: "#2e3136",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cold sea glass, cyan, and slate.",
    light: {
      bg1: "#f4f8fc",
      bg2: "#e0e9f2",
      bg3: "#e8f0f7",
      bg4: "#d3e0ea",
      fg: "#18222d",
      muted: "#66798b",
      accent: "#1c93cc",
      border: "#c4d4e0",
    },
    dark: {
      bg1: "#091116",
      bg2: "#10181f",
      bg3: "#13212c",
      bg4: "#1a3040",
      fg: "#eef8ff",
      muted: "#97b1c6",
      accent: "#58c8ff",
      border: "#274556",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm peach and ember hues.",
    light: {
      bg1: "#fff7f2",
      bg2: "#f8e7df",
      bg3: "#fdeee6",
      bg4: "#f0d9cb",
      fg: "#34241f",
      muted: "#8b6f66",
      accent: "#e77949",
      border: "#e6cdbf",
    },
    dark: {
      bg1: "#16100e",
      bg2: "#201613",
      bg3: "#2a1c18",
      bg4: "#382621",
      fg: "#fff3ed",
      muted: "#cfab9d",
      accent: "#ff9867",
      border: "#563b32",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Sage surfaces with moss accents.",
    light: {
      bg1: "#f5f9f4",
      bg2: "#e1e9de",
      bg3: "#ebf2e8",
      bg4: "#d4e0d0",
      fg: "#1f2a22",
      muted: "#64786a",
      accent: "#3f9a62",
      border: "#c5d4c7",
    },
    dark: {
      bg1: "#0d1410",
      bg2: "#131d17",
      bg3: "#19271f",
      bg4: "#233428",
      fg: "#f2faf3",
      muted: "#9db4a2",
      accent: "#66c388",
      border: "#35503d",
    },
  },
  {
    id: "lavender",
    name: "Lavender",
    description: "Soft violet mist and candied purple.",
    light: {
      bg1: "#f9f7fd",
      bg2: "#ece7f7",
      bg3: "#f1edf9",
      bg4: "#e0d8f2",
      fg: "#241e35",
      muted: "#7a6e91",
      accent: "#7c4dcc",
      border: "#d3cae8",
    },
    dark: {
      bg1: "#100d18",
      bg2: "#181422",
      bg3: "#1e1a2c",
      bg4: "#2a2440",
      fg: "#f5f0ff",
      muted: "#b0a6c8",
      accent: "#a97ef5",
      border: "#3d3460",
    },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Blush pinks and dusty mauve.",
    light: {
      bg1: "#fdf6f8",
      bg2: "#f5e4ea",
      bg3: "#faedf1",
      bg4: "#ecd4dc",
      fg: "#33202a",
      muted: "#8e6878",
      accent: "#d44f7a",
      border: "#e5c8d3",
    },
    dark: {
      bg1: "#160d12",
      bg2: "#201319",
      bg3: "#2a1a22",
      bg4: "#3a2430",
      fg: "#fff0f5",
      muted: "#c9a0b0",
      accent: "#f07ca0",
      border: "#573040",
    },
  },
  {
    id: "slate",
    name: "Slate",
    description: "Cool grey with steel blue undertones.",
    light: {
      bg1: "#f6f7f9",
      bg2: "#e5e7ed",
      bg3: "#eceef2",
      bg4: "#d8dbe4",
      fg: "#1e2130",
      muted: "#6e7589",
      accent: "#4a6fa5",
      border: "#cdd1db",
    },
    dark: {
      bg1: "#0d0f14",
      bg2: "#13161e",
      bg3: "#191d28",
      bg4: "#222736",
      fg: "#f0f2f8",
      muted: "#9aa2b8",
      accent: "#7aa0d4",
      border: "#303852",
    },
  },
  {
    id: "amber",
    name: "Amber",
    description: "Golden warmth and honey tones.",
    light: {
      bg1: "#fdfaf2",
      bg2: "#f5e9cc",
      bg3: "#faf0d8",
      bg4: "#ecddb8",
      fg: "#2e2410",
      muted: "#8a7240",
      accent: "#c98a00",
      border: "#e5d5a8",
    },
    dark: {
      bg1: "#141008",
      bg2: "#1e1810",
      bg3: "#272016",
      bg4: "#362e1e",
      fg: "#fff9ec",
      muted: "#c4ad78",
      accent: "#f0b030",
      border: "#524430",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep indigo ink and starlight.",
    light: {
      bg1: "#f5f5ff",
      bg2: "#e5e4f8",
      bg3: "#ebebfb",
      bg4: "#d8d7f4",
      fg: "#1c1b38",
      muted: "#706fa0",
      accent: "#4b48d4",
      border: "#cccbea",
    },
    dark: {
      bg1: "#080812",
      bg2: "#0f0f1e",
      bg3: "#14142a",
      bg4: "#1e1e3c",
      fg: "#f2f2ff",
      muted: "#a0a0cc",
      accent: "#8280f0",
      border: "#2e2e58",
    },
  },
];

const BUILT_IN_PRESET_MAP = BUILT_IN_THEME_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id as BuiltInThemePresetId] = preset;
    return acc;
  },
  {} as Record<BuiltInThemePresetId, ThemePresetDefinition>,
);

export const DEFAULT_THEME_SETTINGS: StoredThemeSettings = {
  mode: "dark",
  presetId: "default",
  fontPresetId: "system",
  customPreset: null,
};

export const getThemePresetById = (
  presetId: BuiltInThemePresetId,
): ThemePresetDefinition => {
  return BUILT_IN_PRESET_MAP[presetId];
};

export const getThemePresetDefinition = (
  presetId: ThemePresetId,
  customPreset: ThemePresetDefinition | null,
): ThemePresetDefinition => {
  if (presetId === "custom") {
    return customPreset ?? getThemePresetById("default");
  }

  return getThemePresetById(presetId);
};

export const getFontPresetById = (
  fontPresetId: FontPresetId,
): FontPresetDefinition => {
  return (
    FONT_PRESETS.find((preset) => preset.id === fontPresetId) ?? FONT_PRESETS[0]
  );
};

export const resolveActiveTone = (
  preset: ThemePresetDefinition,
  mode: ThemeMode,
): ThemeTone => {
  return mode === "dark" ? preset.dark : preset.light;
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return `#${[r, g, b]
    .map((value) =>
      clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0"),
    )
    .join("")}`;
};

const rgbToChannels = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const mix = (foreground: string, background: string, amount: number) => {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  const weight = clamp(amount, 0, 1);

  return rgbToHex(
    fg.r * (1 - weight) + bg.r * weight,
    fg.g * (1 - weight) + bg.g * weight,
    fg.b * (1 - weight) + bg.b * weight,
  );
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case red:
        h = ((green - blue) / delta) % 6;
        break;
      case green:
        h = (blue - red) / delta + 2;
        break;
      default:
        h = (red - green) / delta + 4;
        break;
    }

    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  return { h, s, l };
};

const hslToRgb = (h: number, s: number, l: number) => {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const lightness = clamp(l, 0, 1);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    r: Math.round((red + m) * 255),
    g: Math.round((green + m) * 255),
    b: Math.round((blue + m) * 255),
  };
};

const shiftLightness = (hex: string, amount: number, saturationBoost = 0) => {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  const next = hslToRgb(
    hsl.h,
    clamp(hsl.s + saturationBoost, 0, 1),
    clamp(hsl.l + amount, 0, 1),
  );

  return rgbToHex(next.r, next.g, next.b);
};

const fallbackAverageColor = (pixels: Uint8Array, sampleStep: number) => {
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  for (let index = 0; index < pixels.length; index += sampleStep * 4) {
    const alpha = pixels[index + 3];
    if (alpha < 170) {
      continue;
    }

    totalR += pixels[index];
    totalG += pixels[index + 1];
    totalB += pixels[index + 2];
    count += 1;
  }

  if (count === 0) {
    return "#27b1fa";
  }

  return rgbToHex(totalR / count, totalG / count, totalB / count);
};

export const extractDominantColorFromImage = async (imageUri: string) => {
  const data = await Skia.Data.fromURI(imageUri);
  const image = Skia.Image.MakeImageFromEncoded(data);

  if (!image) {
    throw new Error("Unable to decode image for theme generation.");
  }

  const rasterImage = image.makeNonTextureImage();
  const pixels = rasterImage.readPixels();

  if (!(pixels instanceof Uint8Array) || pixels.length === 0) {
    throw new Error("Image pixel data is unavailable.");
  }

  const totalPixels = pixels.length / 4;
  const sampleStep = Math.max(1, Math.floor(totalPixels / 4000));
  const buckets = new Map<
    string,
    { count: number; r: number; g: number; b: number; score: number }
  >();

  for (let index = 0; index < pixels.length; index += sampleStep * 4) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const alpha = pixels[index + 3];

    if (alpha < 190) {
      continue;
    }

    const hsl = rgbToHsl(r, g, b);
    if (hsl.l < 0.1 || hsl.l > 0.92 || hsl.s < 0.12) {
      continue;
    }

    const quantized = `${Math.round(r / 32) * 32}-${Math.round(g / 32) * 32}-${Math.round(b / 32) * 32}`;
    const bucket = buckets.get(quantized) ?? {
      count: 0,
      r: 0,
      g: 0,
      b: 0,
      score: 0,
    };

    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.score += hsl.s * 1.4 + (1 - Math.abs(hsl.l - 0.52));
    buckets.set(quantized, bucket);
  }

  if (buckets.size === 0) {
    return fallbackAverageColor(pixels, sampleStep);
  }

  const dominant = [...buckets.values()].sort((left, right) => {
    const leftScore = left.score * left.count;
    const rightScore = right.score * right.count;
    return rightScore - leftScore;
  })[0];

  return rgbToHex(
    dominant.r / dominant.count,
    dominant.g / dominant.count,
    dominant.b / dominant.count,
  );
};

export const createCustomThemePreset = (
  accentHex: string,
  name = "Custom",
): ThemePresetDefinition => {
  const normalizedAccent = shiftLightness(accentHex, 0, 0.08);
  const lightAccent = shiftLightness(normalizedAccent, -0.08, 0.04);
  const darkAccent = shiftLightness(normalizedAccent, 0.12, 0.02);

  return {
    id: "custom",
    name,
    description: "Generated from an image in your library.",
    light: {
      bg1: mix(lightAccent, "#ffffff", 0.95),
      bg2: mix(lightAccent, "#f7f8fb", 0.89),
      bg3: mix(lightAccent, "#eef2f7", 0.8),
      bg4: mix(lightAccent, "#dce4ee", 0.68),
      fg: "#202630",
      muted: mix(lightAccent, "#5c687a", 0.72),
      accent: lightAccent,
      border: mix(lightAccent, "#c7d2dd", 0.7),
    },
    dark: {
      bg1: mix(darkAccent, "#090d12", 0.88),
      bg2: mix(darkAccent, "#10161d", 0.84),
      bg3: mix(darkAccent, "#16202a", 0.76),
      bg4: mix(darkAccent, "#1d2935", 0.66),
      fg: "#f7f9fc",
      muted: mix(darkAccent, "#a5b2c3", 0.72),
      accent: darkAccent,
      border: mix(darkAccent, "#344454", 0.62),
    },
  };
};

export const createThemeVars = (
  mode: ThemeMode,
  preset: ThemePresetDefinition,
): Record<string, string> => {
  const activeTone = resolveActiveTone(preset, mode);

  return {
    "--color-dark1": rgbToChannels(preset.dark.bg1),
    "--color-dark2": rgbToChannels(preset.dark.bg2),
    "--color-dark3": rgbToChannels(preset.dark.bg3),
    "--color-dark4": rgbToChannels(preset.dark.bg4),
    "--color-light1": rgbToChannels(preset.light.bg1),
    "--color-light2": rgbToChannels(preset.light.bg2),
    "--color-light3": rgbToChannels(preset.light.bg3),
    "--color-light4": rgbToChannels(preset.light.bg4),
    "--color-appwhite": rgbToChannels(preset.dark.fg),
    "--color-appgraylight": rgbToChannels(preset.dark.muted),
    "--color-appgraydark": rgbToChannels(preset.light.muted),
    "--color-appblack": rgbToChannels(preset.light.fg),
    "--color-baccent": rgbToChannels(activeTone.accent),
    "--color-success": rgbToChannels(DEFAULT_STATUS_COLORS.success),
    "--color-caution": rgbToChannels(DEFAULT_STATUS_COLORS.caution),
    "--color-warning": rgbToChannels(DEFAULT_STATUS_COLORS.warning),
    "--color-danger": rgbToChannels(DEFAULT_STATUS_COLORS.danger),
    "--color-info": rgbToChannels(DEFAULT_STATUS_COLORS.info),
    "--color-bg": rgbToChannels(activeTone.bg1),
    "--color-surface": rgbToChannels(activeTone.bg3),
    "--color-surface2": rgbToChannels(activeTone.bg4),
    "--color-fg": rgbToChannels(activeTone.fg),
    "--color-muted": rgbToChannels(activeTone.muted),
    "--color-accent": rgbToChannels(activeTone.accent),
    "--color-border": rgbToChannels(activeTone.border),
  };
};

export const getGradeBucketColor = (
  percentage: number,
  accentColor: string,
) => {
  if (percentage >= 90) return accentColor;
  if (percentage >= 80) return DEFAULT_STATUS_COLORS.success;
  if (percentage >= 70) return DEFAULT_STATUS_COLORS.caution;
  if (percentage >= 60) return DEFAULT_STATUS_COLORS.warning;
  return DEFAULT_STATUS_COLORS.danger;
};
