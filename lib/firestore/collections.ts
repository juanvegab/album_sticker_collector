import {
  doc,
  getDoc,
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
  onUpdate: (data: UserCollection | null) => void
): Unsubscribe {
  return onSnapshot(collectionRef(userId, albumId), (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as UserCollection);
    } else {
      onUpdate(null);
    }
  });
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
