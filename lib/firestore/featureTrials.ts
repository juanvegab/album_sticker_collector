import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Number of free uses before premium is required */
export const EXTERNAL_LIST_FREE_USES = 3;

/** Get how many times this user has used the External List feature */
export async function getExternalListUses(userId: string): Promise<number> {
  try {
    const ref = doc(db, "users", userId, "profile", "featureTrials");
    const snap = await getDoc(ref);
    return snap.data()?.externalList ?? 0;
  } catch {
    return 0;
  }
}

/** Increment the External List use counter by 1 */
export async function incrementExternalListUses(userId: string): Promise<void> {
  try {
    const ref = doc(db, "users", userId, "profile", "featureTrials");
    await setDoc(ref, { externalList: increment(1) }, { merge: true });
  } catch {
    // Non-critical — silently fail
  }
}
