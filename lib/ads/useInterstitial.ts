import { useEffect, useRef } from "react";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { usePremiumStore } from "@/store/premiumStore";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const MIN_INTERVAL_MS = 3 * 60 * 1000;

export function useInterstitial() {
  const showAds = usePremiumStore((s) => s.showAds());
  const lastShownAt = useRef(0);
  const adRef = useRef<any>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (isExpoGo || !showAds) return;

    let InterstitialAd: any;
    let AdEventType: any;
    let TestIds: any;

    try {
      const admob = require("react-native-google-mobile-ads");
      InterstitialAd = admob.InterstitialAd;
      AdEventType = admob.AdEventType;
      TestIds = admob.TestIds;
    } catch {
      return;
    }

    const unitId = __DEV__
      ? TestIds.INTERSTITIAL
      : require("./config").AD_UNITS.INTERSTITIAL;

    const ad = InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: false,
    });
    adRef.current = ad;

    const unsubLoad = ad.addAdEventListener(AdEventType.LOADED, () => {
      loaded.current = true;
    });
    const unsubClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
      loaded.current = false;
      ad.load();
    });

    ad.load();

    return () => {
      unsubLoad();
      unsubClose();
    };
  }, [showAds]);

  function showIfReady() {
    if (isExpoGo || !showAds || !loaded.current || !adRef.current) return;
    const now = Date.now();
    if (now - lastShownAt.current < MIN_INTERVAL_MS) return;
    lastShownAt.current = now;
    adRef.current.show();
  }

  return { showIfReady };
}
