import { View, Text } from "react-native";
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

interface Props {
  hidden?: boolean;
}

export function BannerAd({ hidden }: Props) {
  const showAds = usePremiumStore((s) => s.showAds());

  if (hidden || !showAds) return null;

  // Expo Go → visual placeholder
  if (isExpoGo || !NativeBannerAd) {
    return (
      <View
        style={{
          height: 50,
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

  // Real build → AdMob
  const unitId = __DEV__
    ? TestIds.BANNER
    : require("./config").AD_UNITS.BANNER;

  return (
    <NativeBannerAd
      unitId={unitId}
      size={BannerAdSize.BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      onAdFailedToLoad={(err: any) =>
        console.warn("[BannerAd] failed:", err.message)
      }
    />
  );
}
