import { Platform } from "react-native";

// ── Real AdMob IDs ────────────────────────────────────────────────────
// Android App ID : ca-app-pub-1141376334966091~2434404871
// iOS App ID     : ca-app-pub-1141376334966091~8594737124
// ─────────────────────────────────────────────────────────────────────
export const AD_UNITS = {
  BANNER: Platform.select({
    ios: "ca-app-pub-1141376334966091/3284452114",
    android: "ca-app-pub-1141376334966091/5110943215",
    default: "ca-app-pub-1141376334966091/5110943215",
  })!,
  INTERSTITIAL: Platform.select({
    ios: "ca-app-pub-1141376334966091/4408080101",
    android: "ca-app-pub-1141376334966091/9985591836",
    default: "ca-app-pub-1141376334966091/9985591836",
  })!,
  NATIVE: Platform.select({
    ios: "ca-app-pub-1141376334966091/2484779872",
    android: "ca-app-pub-1141376334966091/7034243442",
    default: "ca-app-pub-1141376334966091/7034243442",
  })!,
};

export const APP_IDS = {
  ios: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS ?? "ca-app-pub-1141376334966091~8594737124",
  android: process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID ?? "ca-app-pub-1141376334966091~2434404871",
};
