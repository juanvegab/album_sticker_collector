import {
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserCollection } from "@/types/collection";

function collectionRef(userId: string, albumId: string) {
  return doc(db, "users", userId, "collections", albumId);
}

export function subscribeToCollection(
  userId: string,
  albumId: string,
  onUpdate: (data: UserCollection | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collectionRef(userId, albumId),
    (snap) => onUpdate(snap.exists() ? (snap.data() as UserCollection) : null),
    (err) => {
      console.error("[Firestore] subscribeToCollection error:", err.message);
      onError?.(err);
    }
  );
}

export async function saveCollection(
  userId: string,
  collection: UserCollection
): Promise<void> {
  await setDoc(collectionRef(userId, collection.albumId), {
    ...collection,
    updatedAt: Date.now(),
  });
}
