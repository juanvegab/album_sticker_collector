/**
 * NativeAdCard — inline ad shown at the start of each album section.
 * Height must match AD_HEIGHT constant in album/index.tsx (60px).
 *
 * Guards:
 *  - isPremium → renders nothing (null, no space taken)
 *  - Expo Go → renders a small placeholder (same height, no crash)
 *  - Dev build / Prod build → renders real NativeAd from AdMob
 */
import React from "react";
import { View, Text } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { usePremiumStore } from "@/store/premiumStore";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy-load the native AdMob module only in real builds
let NativeAdViewComponent: any = null;
let NativeAdManager: any = null;
let TestIds: any = null;

if (!isExpoGo) {
  try {
    const admob = require("react-native-google-mobile-ads");
    NativeAdViewComponent = admob.NativeAd;
    NativeAdManager = admob.NativeAdManager;
    TestIds = admob.TestIds;
  } catch {
    // silently fall back to placeholder
  }
}

export const AD_HEIGHT = 60;

interface Props {
  /** Unique index used as adKey so each slot loads independently */
  adIndex: number;
}

export const NativeAdCard = React.memo(({ adIndex }: Props) => {
  const showAds = usePremiumStore((s) => s.showAds());

  // Premium users see nothing — no space consumed
  if (!showAds) return null;

  // Expo Go or module unavailable → placeholder (keeps layout stable)
  if (isExpoGo || !NativeAdViewComponent) {
    return (
      <View
        style={{
          height: AD_HEIGHT,
          backgroundColor: "#f9fafb",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
        }}
      >
        <Text style={{ color: "#9ca3af", fontSize: 11 }}>
          📢 Anuncio — visible en Dev/Prod build
        </Text>
      </View>
    );
  }

  // Real build → AdMob NativeAd
  const unitId = __DEV__
    ? TestIds.NATIVE
    : require("@/lib/ads/config").AD_UNITS.NATIVE;

  return (
    <View style={{ height: AD_HEIGHT }}>
      <NativeAdViewComponent
        adKey={`native-${adIndex}`}
        unitId={unitId}
        onAdLoaded={() => {}}
        onAdFailedToLoad={(err: any) =>
          console.warn("[NativeAdCard] failed:", err?.message)
        }
      >
        {/* Minimal native ad layout */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            backgroundColor: "#fff8e7",
            borderBottomWidth: 1,
            borderBottomColor: "#fde68a",
          }}
        >
          <Text style={{ fontSize: 10, color: "#92400e", marginRight: 6 }}>AD</Text>
          <Text style={{ fontSize: 11, color: "#78350f", flex: 1 }} numberOfLines={2}>
            {/* headline rendered by NativeAd */}
          </Text>
        </View>
      </NativeAdViewComponent>
    </View>
  );
});
