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
      const ref = doc(db, "users", user.id, "profile", "premium");

      // Load Firestore premium state — may fail if Firebase Auth not ready yet
      try {
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
      } catch {
        // Firebase Auth not ready — use default state and let RevenueCat be authoritative
        setFirstOpenDate(Date.now());
      }

      // RevenueCat is always initialized regardless of Firestore state
      try {
        await initPurchases(user.id);
        const premiumFromRC = await checkPremiumStatus();
        if (premiumFromRC) {
          setIsPremium(true);
          try {
            await setDoc(ref, { isPremium: true }, { merge: true });
          } catch {
            // Firestore sync failed — RC state is still applied in-memory
          }
        }
      } catch {
        // RevenueCat unavailable (e.g. Expo Go, no network)
      }
    };

    init().catch(console.error);
  }, [user?.id]);

  return { isPremium, isTrialActive, trialDaysLeft, showAds };
}
