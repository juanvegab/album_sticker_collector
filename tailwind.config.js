/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        owned: "#16a34a",
        missing: "#9ca3af",
        duplicate: "#f97316",
        brand: "#1d4ed8",
      },
      fontSize: {
        xs:   ["13px", { lineHeight: "18px" }],
        sm:   ["15px", { lineHeight: "22px" }],
        base: ["17px", { lineHeight: "26px" }],
        lg:   ["19px", { lineHeight: "28px" }],
        xl:   ["22px", { lineHeight: "30px" }],
        "2xl": ["26px", { lineHeight: "34px" }],
        "3xl": ["32px", { lineHeight: "40px" }],
        "4xl": ["38px", { lineHeight: "46px" }],
      },
    },
  },
  plugins: [],
};
