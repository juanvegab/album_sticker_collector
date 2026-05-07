import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "",
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "",
  default: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "",
})!;

const ENTITLEMENT = "no_ads";

// Test keys only work in Expo Go / debug — skip in release builds to avoid RC blocking the app
const isTestKey = API_KEY.startsWith("test_");

export async function initPurchases(userId: string): Promise<void> {
  if (isTestKey) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: API_KEY, appUserID: userId });
}

export async function checkPremiumStatus(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return info.entitlements.active[ENTITLEMENT] !== undefined;
}

export async function purchaseNoAds(): Promise<boolean> {
  const offerings = await Purchases.getOfferings();
  console.log("RC offerings:", JSON.stringify({ current: offerings.current?.identifier, packages: offerings.current?.availablePackages.map(p => p.identifier) }));
  const pkg = offerings.current?.availablePackages[0];
  if (!pkg) throw new Error("no_package");
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[ENTITLEMENT] !== undefined;
}

export async function restorePurchases(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return info.entitlements.active[ENTITLEMENT] !== undefined;
}
