import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import { usePremiumStore } from "@/store/premiumStore";
import { initPurchases, checkPremiumStatus } from "@/lib/purchases";

export function usePremium() {
  const { user } = useUser();
  const fbUser = useFirebaseUser();
  const { setFirstOpenDate, setIsPremium, isPremium, isTrialActive, trialDaysLeft, showAds } =
    usePremiumStore();

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      const ref = doc(db, "users", user.id, "profile", "premium");

      // Load Firestore premium state only if Firebase Auth is ready
      if (fbUser) {
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
          setFirstOpenDate(Date.now());
        }
      } else {
        setFirstOpenDate(Date.now());
      }

      // RevenueCat is always initialized regardless of Firestore state
      try {
        await initPurchases(user.id);
        const premiumFromRC = await checkPremiumStatus();
        if (premiumFromRC) {
          setIsPremium(true);
          if (fbUser) {
            try {
              await setDoc(ref, { isPremium: true }, { merge: true });
            } catch {
              // Firestore sync failed — RC state is still applied in-memory
            }
          }
        }
      } catch {
        // RevenueCat unavailable (e.g. Expo Go, no network)
      }
    };

    init().catch(console.error);
  }, [user?.id, fbUser?.uid]);

  return { isPremium, isTrialActive, trialDaysLeft, showAds };
}
