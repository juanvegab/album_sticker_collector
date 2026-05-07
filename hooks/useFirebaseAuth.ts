import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useFirebaseAuth() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      signOut(auth).catch(() => {});
      return;
    }
    (async () => {
      try {
        const token = await getToken({ template: "firebase" });
        if (token) await signInWithCustomToken(auth, token);
      } catch (e) {
        console.error("Firebase auth error:", e);
      }
    })();
  }, [isSignedIn]);
}
