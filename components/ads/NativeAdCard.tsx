/**
 * NativeAdCard — inline ad shown at the start of each album section.
 * Height matches AD_HEIGHT constant (60px) used in album/index.tsx.
 *
 * API used (react-native-google-mobile-ads v8+):
 *  - NativeAd.createForAdRequest(unitId)  → async, returns a data object
 *  - <NativeAdView nativeAd={...}>        → the React component for rendering
 *
 * Guards:
 *  - isPremium  → null (no space consumed)
 *  - Expo Go    → placeholder (keeps layout stable, no crash)
 *  - Real build → loads ad async then renders via NativeAdView
 *  - ErrorBoundary → catches any remaining render crashes silently
 */
import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { usePremiumStore } from "@/store/premiumStore";

export const AD_HEIGHT = 60;

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy-load AdMob only in real builds — avoids Expo Go crash
let NativeAdClass: any = null;   // data class  → use .createForAdRequest()
let NativeAdView: any = null;    // React component → <NativeAdView nativeAd={...}>
let TestIds: any = null;

if (!isExpoGo) {
  try {
    const admob = require("react-native-google-mobile-ads");
    NativeAdClass = admob.NativeAd;      // NOT a component — factory class
    NativeAdView  = admob.NativeAdView;  // actual React component
    TestIds       = admob.TestIds;
  } catch {
    // silently fall back to placeholder
  }
}

// ── ErrorBoundary — last-resort catch for native render errors ─────────
class AdErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { crashed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(error: Error) {
    console.warn("[NativeAdCard] render error caught:", error?.message);
  }
  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}

// ── Inner loader + renderer ────────────────────────────────────────────
function NativeAdInner({ adIndex }: { adIndex: number }) {
  const [nativeAd, setNativeAd] = useState<any>(null);

  const unitId: string = __DEV__
    ? TestIds?.NATIVE ?? ""
    : require("@/lib/ads/config").AD_UNITS.NATIVE;

  useEffect(() => {
    if (!NativeAdClass || !unitId) return;
    let destroyed = false;
    let loadedAd: any = null;

    NativeAdClass.createForAdRequest(unitId)
      .then((ad: any) => {
        if (destroyed) { ad.destroy(); return; }
        loadedAd = ad;
        setNativeAd(ad);
      })
      .catch((err: any) =>
        console.warn("[NativeAdCard] load failed:", err?.message)
      );

    return () => {
      destroyed = true;
      loadedAd?.destroy();
    };
  }, [unitId]);

  // While loading, hold space so the list doesn't jump
  if (!nativeAd || !NativeAdView) {
    return <View style={{ height: AD_HEIGHT }} />;
  }

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={{
        height: AD_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        backgroundColor: "#fff8e7",
        borderBottomWidth: 1,
        borderBottomColor: "#fde68a",
      }}
    >
      <Text style={{ fontSize: 10, color: "#92400e", marginRight: 6 }}>AD</Text>
      <Text style={{ fontSize: 11, color: "#78350f", flex: 1 }} numberOfLines={1}>
        {nativeAd.headline ?? ""}
      </Text>
    </NativeAdView>
  );
}

// ── Public component ──────────────────────────────────────────────────
interface Props {
  /** Unique index so each ad slot loads independently */
  adIndex: number;
}

export const NativeAdCard = React.memo(({ adIndex }: Props) => {
  const showAds = usePremiumStore((s) => s.showAds());

  // Premium users → nothing rendered, no space consumed
  if (!showAds) return null;

  // Expo Go or module failed to load → stable placeholder
  if (isExpoGo || !NativeAdClass) {
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

  return (
    <AdErrorBoundary>
      <NativeAdInner adIndex={adIndex} />
    </AdErrorBoundary>
  );
});
