import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePremiumStore } from "@/store/premiumStore";
import { initPurchases, checkPremiumStatus } from "@/lib/purchases";

export function usePremium() {
  const { user } = useUser();
  const { setFirstOpenDate, setIsPremium, isPremium, isTrialActive, trialDaysLeft, showAds } =
    usePremiumStore();

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      // Load Firestore premium state
      const ref = doc(db, "users", user.id, "profile", "premium");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setFirstOpenDate(data.firstOpenDate);
        setIsPremium(data.isPremium ?? false);
      } else {
        const firstOpenDate = Date.now();
        await setDoc(ref, { firstOpenDate, isPremium: false });
        setFirstOpenDate(firstOpenDate);
      }

      // Cross-check with RevenueCat (authoritative source for IAP state)
      try {
        await initPurchases(user.id);
        const premiumFromRC = await checkPremiumStatus();
        if (premiumFromRC) {
          setIsPremium(true);
          // Sync back to Firestore if RevenueCat says premium but Firestore doesn't
          await setDoc(ref, { isPremium: true }, { merge: true });
        }
      } catch {
        // RevenueCat unavailable (e.g. Expo Go, no network) — fall back to Firestore state
      }
    };

    init().catch(console.error);
  }, [user?.id]);

  return { isPremium, isTrialActive, trialDaysLeft, showAds };
}
