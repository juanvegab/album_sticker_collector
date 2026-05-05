import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePremiumStore } from "@/store/premiumStore";

export function usePremium() {
  const { user } = useUser();
  const { setFirstOpenDate, setIsPremium, isPremium, isTrialActive, trialDaysLeft, showAds } =
    usePremiumStore();

  useEffect(() => {
    if (!user) return;

    const init = async () => {
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
    };

    init().catch(console.error);
  }, [user?.id]);

  return { isPremium, isTrialActive, trialDaysLeft, showAds };
}
