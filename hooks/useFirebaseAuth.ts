import { useAuth } from "@clerk/clerk-expo";
import { useEffect, useRef } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const FIREBASE_TOKEN_URL =
  "https://us-central1-control-de-postales.cloudfunctions.net/createFirebaseToken";
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export function useFirebaseAuth() {
  const { getToken, isSignedIn } = useAuth();
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      signOut(auth).catch(() => {});
      return;
    }

    let cancelled = false;
    attemptRef.current = 0;

    const attempt = async () => {
      if (cancelled) return;
      attemptRef.current += 1;
      const n = attemptRef.current;
      try {
        // Get regular Clerk session token (no template needed)
        const clerkToken = await getToken();
        if (!clerkToken) {
          console.warn(`[Firebase] Clerk session token null (attempt ${n})`);
          if (n < MAX_RETRIES) timerRef.current = setTimeout(attempt, RETRY_DELAY_MS);
          return;
        }

        // Exchange for Firebase custom token via Cloud Function
        const response = await fetch(FIREBASE_TOKEN_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${clerkToken}` },
        });

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`HTTP ${response.status}: ${err}`);
        }

        const { token: firebaseToken } = await response.json();
        if (cancelled) return;

        await signInWithCustomToken(auth, firebaseToken);
        console.log(`[Firebase] Signed in via Cloud Function (attempt ${n})`);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[Firebase] auth error (attempt ${n}):`, msg);
        if (n < MAX_RETRIES) timerRef.current = setTimeout(attempt, RETRY_DELAY_MS);
      }
    };

    attempt();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isSignedIn]);
}
