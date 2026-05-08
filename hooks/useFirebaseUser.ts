import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

/** Returns the currently authenticated Firebase user (null if not signed in). */
export function useFirebaseUser(): User | null {
  const [fbUser, setFbUser] = useState<User | null>(auth.currentUser);
  useEffect(() => {
    return onAuthStateChanged(auth, setFbUser);
  }, []);
  return fbUser;
}
