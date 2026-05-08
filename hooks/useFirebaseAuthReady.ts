import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useFirebaseAuthReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    return onAuthStateChanged(auth, (fbUser) => setReady(!!fbUser));
  }, []);
  return ready;
}
