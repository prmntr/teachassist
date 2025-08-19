/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // backgrounds
        1: "#161616",
        2: "#191919",
        3: "#1e1e1e",
        4: "#292929",

        // text and stuff
        appwhite: "#edebea", //ebitda
        appgray: "#5d5d5d",
        baccent: "#27b1fa", // beautiful blue

        // state colours
        success: "#28A745",
        danger: "#ff465f",
        warning: "#842626",
        info: "#0087b6",
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
