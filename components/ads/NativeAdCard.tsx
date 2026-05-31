/**
 * NativeAdCard — inline native ad shown between album sections.
 *
 * AdMob validator rule: NativeAdView must contain ALL NativeAsset views
 * within its native bounds. This means:
 *  - NO overflow:hidden anywhere in the component tree (native views ignore RN clipping)
 *  - NO height constraint smaller than the content's natural size
 *  - NativeAdView must have paddingVertical so assets never touch the edges
 *
 * AD_HEIGHT is used by album/index.tsx to pre-compute FlashList offsets.
 * It must be ≥ the natural content height (label + headline + CTA + vertical padding).
 */
import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { usePremiumStore } from "@/store/premiumStore";

export const AD_HEIGHT = 80;

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy-load AdMob only in real builds — avoids Expo Go crash
let NativeAdClass: any = null;
let NativeAdViewComp: any = null;
let NativeAssetComp: any = null;
let NativeAssetType: any = null;
let TestIds: any = null;

if (!isExpoGo) {
  try {
    const admob = require("react-native-google-mobile-ads");
    NativeAdClass    = admob.NativeAd;
    NativeAdViewComp = admob.NativeAdView;
    NativeAssetComp  = admob.NativeAsset;
    NativeAssetType  = admob.NativeAssetType;
    TestIds          = admob.TestIds;
  } catch {
    // silently fall back to placeholder
  }
}

// ── ErrorBoundary ──────────────────────────────────────────────────────
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

  // While loading, hold the exact same space so the list doesn't jump
  if (!nativeAd || !NativeAdViewComp) {
    return <View style={{ height: AD_HEIGHT }} />;
  }

  // ── Key rules to avoid "assets outside NativeAdView" validator error ──
  // 1. NativeAdView gets a fixed height (AD_HEIGHT) with paddingVertical so
  //    assets never touch or exceed its native bounds.
  // 2. NO overflow:hidden anywhere — AdMob measures native UIView/View bounds
  //    directly, React Native's clip mask is invisible to the SDK validator.
  // 3. NativeAsset is the direct parent of the clickable element — no extra
  //    wrapping Views between NativeAsset and its child.
  return (
    <NativeAdViewComp
      nativeAd={nativeAd}
      style={{
        height: AD_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 14,
        gap: 8,
        backgroundColor: "#fff8e7",
        borderBottomWidth: 1,
        borderBottomColor: "#fde68a",
      }}
    >
      {/* "AD" attribution label */}
      <Text style={{
        fontSize: 9, color: "#92400e", fontWeight: "700",
        borderWidth: 1, borderColor: "#92400e",
        borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1,
      }}>
        AD
      </Text>

      {/* Headline */}
      {NativeAssetComp && NativeAssetType ? (
        <NativeAssetComp assetType={NativeAssetType.HEADLINE} style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: "#78350f" }} numberOfLines={2}>
            {nativeAd.headline ?? ""}
          </Text>
        </NativeAssetComp>
      ) : (
        <Text style={{ fontSize: 11, color: "#78350f", flex: 1 }} numberOfLines={2}>
          {nativeAd.headline ?? ""}
        </Text>
      )}

      {/* Call to action */}
      {NativeAssetComp && NativeAssetType && nativeAd.callToAction ? (
        <NativeAssetComp assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={{
            fontSize: 10, color: "#fff", fontWeight: "700",
            backgroundColor: "#f59e0b", borderRadius: 6,
            paddingHorizontal: 8, paddingVertical: 4,
          }}>
            {nativeAd.callToAction}
          </Text>
        </NativeAssetComp>
      ) : null}
    </NativeAdViewComp>
  );
}

// ── Public component ───────────────────────────────────────────────────
interface Props {
  adIndex: number;
}

export const NativeAdCard = React.memo(({ adIndex }: Props) => {
  const showAds = usePremiumStore((s) => s.showAds());

  if (!showAds) return null;

  if (isExpoGo || !NativeAdClass) {
    return (
      <View style={{
        height: AD_HEIGHT,
        backgroundColor: "#f9fafb",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Text style={{ color: "#9ca3af", fontSize: 11 }}>
          📢 Ad — visible in Dev/Prod build
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
