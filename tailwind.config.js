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
    },
  },
  plugins: [],
};
