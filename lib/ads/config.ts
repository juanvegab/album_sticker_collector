import { Platform } from "react-native";

// Replace these with real AdMob IDs from your AdMob account
// Test IDs are safe to use during development (they show test ads, no policy violations)
export const AD_UNITS = {
  BANNER: Platform.select({
    ios: "ca-app-pub-3940256099942544/2934735716",   // Google test banner iOS
    android: "ca-app-pub-3940256099942544/6300978111", // Google test banner Android
    default: "ca-app-pub-3940256099942544/6300978111",
  })!,
  INTERSTITIAL: Platform.select({
    ios: "ca-app-pub-3940256099942544/4411468910",
    android: "ca-app-pub-3940256099942544/1033173712",
    default: "ca-app-pub-3940256099942544/1033173712",
  })!,
};

export const APP_IDS = {
  ios: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS ?? "ca-app-pub-3940256099942544~1458002511",
  android: process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID ?? "ca-app-pub-3940256099942544~3347511713",
};
