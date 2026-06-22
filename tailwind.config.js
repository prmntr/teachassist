/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // backgrounds
        dark1: "rgb(var(--color-dark1) / <alpha-value>)",
        dark2: "rgb(var(--color-dark2) / <alpha-value>)",
        dark3: "rgb(var(--color-dark3) / <alpha-value>)",
        dark4: "rgb(var(--color-dark4) / <alpha-value>)",

        light1: "rgb(var(--color-light1) / <alpha-value>)",
        light2: "rgb(var(--color-light2) / <alpha-value>)",
        light3: "rgb(var(--color-light3) / <alpha-value>)",
        light4: "rgb(var(--color-light4) / <alpha-value>)",

        // text and stuff
        appwhite: "rgb(var(--color-appwhite) / <alpha-value>)",
        appgraylight: "rgb(var(--color-appgraylight) / <alpha-value>)",
        appgraydark: "rgb(var(--color-appgraydark) / <alpha-value>)",
        appblack: "rgb(var(--color-appblack) / <alpha-value>)",
        baccent: "rgb(var(--color-baccent) / <alpha-value>)", // accent blue

        // semantic aliases for new UI work
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        surface2: "rgb(var(--color-surface2) / <alpha-value>)",
        fg: "rgb(var(--color-fg) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",

        // state colours
        success: "rgb(var(--color-success) / <alpha-value>)",
        caution: "rgb(var(--color-caution) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
      },

      // screw you nativewind
      spacing: {
        13: "3.25rem", // 52px
        15: "3.75rem", // 60px
        17: "4.25rem", // 68px
        18: "4.5rem", // 72px
        19: "4.75rem", // 76px
        21: "5.25rem", // 84px
        22: "5.5rem", // 88px
        23: "5.75rem", // 92px
        25: "6.25rem", // 100px
        26: "6.5rem", // 104px
        27: "6.75rem", // 108px
        29: "7.25rem", // 116px
        30: "7.5rem", // 120px
        31: "7.75rem", // 124px
        33: "8.25rem", // 132px
        34: "8.5rem", // 136px
        35: "8.75rem", // 140px
      },
    },
  },
  plugins: [],
};
