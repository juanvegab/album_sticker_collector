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
        // Sticker states
        owned:     "#22C55E",
        missing:   "#9CA3AF",
        duplicate: "#F2853A",
        // Brand (golden accent)
        brand:     "#F4C430",
        // Dark backgrounds
        bg:        "#0B0B0E",
        surface:   "#15161B",
        elevated:  "#1C1D24",
        // Text
        ink:       "#F5F4EE",
        dim:       "rgba(245,244,238,0.62)",
        dim2:      "rgba(245,244,238,0.38)",
        dim3:      "rgba(245,244,238,0.22)",
        // Section accent colors (by group)
        section: {
          fwc: "#F4C430",
          A:   "#1FA7A0",
          B:   "#E2453C",
          C:   "#7FB832",
          D:   "#2B6FE3",
          E:   "#5847C4",
          F:   "#F2853A",
          G:   "#D9457A",
          H:   "#5BB3D6",
          I:   "#3B8C5B",
          J:   "#E55D4C",
          K:   "#9333EA",
          L:   "#0EA5E9",
        },
      },
      borderRadius: {
        card: "12px",
        chip: "10px",
        pill: "999px",
        hero: "22px",
      },
      fontSize: {
        xs:    ["13px", { lineHeight: "18px" }],
        sm:    ["15px", { lineHeight: "22px" }],
        base:  ["17px", { lineHeight: "26px" }],
        lg:    ["19px", { lineHeight: "28px" }],
        xl:    ["22px", { lineHeight: "30px" }],
        "2xl": ["26px", { lineHeight: "34px" }],
        "3xl": ["32px", { lineHeight: "40px" }],
        "4xl": ["38px", { lineHeight: "46px" }],
      },
    },
  },
  plugins: [],
};
