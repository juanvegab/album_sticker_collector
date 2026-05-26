import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-expo";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import { usePremiumStore, __FORCE_TRIAL_EXPIRED__ } from "@/store/premiumStore";
import { initPurchases, checkPremiumStatus } from "@/lib/purchases";

// Max ms to wait for Firebase Auth before proceeding with RC-only
const FIREBASE_AUTH_TIMEOUT_MS = 5000;

export function usePremium() {
  const { user } = useUser();
  const fbUser = useFirebaseUser();
  const hasInitialized = useRef(false);

  const {
    setFirstOpenDate, setIsPremium, isPremium, isTrialActive,
    trialDaysLeft, showAds, isLoadingPremium, setIsLoadingPremium,
  } = usePremiumStore();

  // Reset when user changes (e.g. sign out / sign in as different user)
  useEffect(() => {
    hasInitialized.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    if (__FORCE_TRIAL_EXPIRED__) { setIsLoadingPremium(false); return; }

    // If fbUser is still null (Firebase Auth not ready), wait up to 5s.
    // When fbUser arrives the effect re-runs with a real value — cancel the timeout.
    // If timeout fires first, proceed without Firestore (RC-only mode).
    if (fbUser === null) {
      const timeout = setTimeout(() => {
        if (!hasInitialized.current) runInit(null);
      }, FIREBASE_AUTH_TIMEOUT_MS);
      return () => clearTimeout(timeout);
    }

    // fbUser is ready — run immediately (cancel any pending timeout implicitly
    // because this branch doesn't set one, and the previous cleanup cleared it)
    if (!hasInitialized.current) runInit(fbUser);

    async function runInit(firebaseUser: typeof fbUser) {
      hasInitialized.current = true;
      const ref = doc(db, "users", user!.id, "profile", "premium");

      // ── Step 1: Firestore — read firstOpenDate + manual premium flag ──
      let manualPremium = false;

      if (firebaseUser) {
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();

            // firstOpenDate — only trust if it's a real number
            if (typeof data.firstOpenDate === "number") {
              setFirstOpenDate(data.firstOpenDate);
            } else {
              const fod = Date.now();
              await setDoc(ref, { firstOpenDate: fod }, { merge: true });
              setFirstOpenDate(fod);
            }

            // Manual premium (grandfathered users set directly in Firestore)
            manualPremium = data.isPremium === true;

          } else {
            // New user — create doc with trial start
            const fod = Date.now();
            await setDoc(ref, { firstOpenDate: fod, isPremium: false });
            setFirstOpenDate(fod);
          }
        } catch {
          // Firestore unavailable — proceed with defaults (no trial, no manual premium)
        }
      }

      // ── Step 2: RevenueCat — authoritative for paid purchases ──
      // RC result always wins over Firestore isPremium.
      // manualPremium (grandfathered) is additive — stays true even if RC says false.
      let rcPremium = false;
      try {
        await initPurchases(user!.id);
        rcPremium = await checkPremiumStatus();

        // Sync RC result back to Firestore (only when it's true — don't overwrite manual)
        if (rcPremium && firebaseUser) {
          try {
            await setDoc(ref, { isPremium: true }, { merge: true });
          } catch { /* Firestore sync failed — in-memory state still correct */ }
        }
      } catch {
        // RC unavailable (no network, Expo Go) — fall back to manualPremium only
      }

      // ── Step 3: Resolve final state ──
      setIsPremium(rcPremium || manualPremium);
      setIsLoadingPremium(false);
    }
  }, [user?.id, fbUser?.uid]);

  return { isPremium, isTrialActive, trialDaysLeft, showAds, isLoadingPremium };
}
