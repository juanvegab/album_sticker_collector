import { View, Text, useWindowDimensions } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { usePremiumStore } from "@/store/premiumStore";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy-load the native AdMob module only in real builds
let NativeBannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (!isExpoGo) {
  try {
    const admob = require("react-native-google-mobile-ads");
    NativeBannerAd = admob.BannerAd;
    BannerAdSize = admob.BannerAdSize;
    TestIds = admob.TestIds;
  } catch {
    // silently fall back to placeholder
  }
}

/**
 * Calculates the expected height for an ANCHORED_ADAPTIVE_BANNER.
 * Formula per Google AdMob spec:
 *   height = clamp(floor(containerWidth / 6.4), 50, 90)  [in dp/pt]
 *
 * Reference sizes:
 *   375pt (iPhone SE)       → 58pt
 *   390pt (iPhone 15)       → 60pt
 *   393pt (iPhone 15 Pro)   → 61pt
 *   430pt (iPhone 15 Pro Max) → 67pt
 *   360pt (common Android)  → 56pt
 */
export function adaptiveBannerHeight(containerWidth: number): number {
  return Math.max(50, Math.min(90, Math.floor(containerWidth / 6.4)));
}

interface Props {
  hidden?: boolean;
}

export function BannerAd({ hidden }: Props) {
  const showAds = usePremiumStore((s) => s.showAds());
  const { width } = useWindowDimensions();
  const adHeight = adaptiveBannerHeight(width);

  if (hidden || !showAds) return null;

  // Expo Go or module failed to load → visual placeholder
  if (isExpoGo || !NativeBannerAd) {
    return (
      <View
        style={{
          height: adHeight,
          backgroundColor: "#f3f4f6",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#9ca3af", fontSize: 11 }}>
          📢 Banner Ad — solo visible en Dev/Prod build
        </Text>
      </View>
    );
  }

  // Real build → AdMob anchored adaptive banner (modern standard)
  // ANCHORED_ADAPTIVE_BANNER fills container width and auto-sizes height
  const unitId = __DEV__
    ? TestIds.BANNER
    : require("./config").AD_UNITS.BANNER;

  return (
    <NativeBannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      onAdFailedToLoad={(err: any) =>
        console.warn("[BannerAd] failed:", err.message)
      }
    />
  );
}
