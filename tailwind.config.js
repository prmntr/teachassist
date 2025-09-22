/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // backgrounds
        dark1: "#111113",
        dark2: "#191919",
        dark3: "#191a1d",
        dark4: "#232427",

        light1: "#fbfbfb",
        light2: "#e7e7e9",
        light3: "#eeeeef",
        light4: "#dddde0",

        // text and stuff
        appwhite: "#fafafa",
        appgraylight: "#aaaab1",
        appgraydark: "#82838b",
        appblack: "#2f3035",
        baccent: "#27b1fa", // accent blue

        // state colours
        success: "#43a25a",
        caution: "#fcc245",
        warning: "#f67c15",
        danger: "#d6363f",
        info: "#0272de",
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
