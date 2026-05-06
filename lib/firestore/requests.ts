import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StickerRequest } from "@/types/request";

const ALBUM_ID = "world-cup-2026";

function collectionRef(userId: string) {
  return doc(db, "users", userId, "collections", ALBUM_ID);
}

export async function sendStickerRequest(
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  stickers: string[]
): Promise<string> {
  const ref = await addDoc(collection(db, "requests"), {
    fromUserId,
    fromUserName,
    toUserId,
    stickers,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

/**
 * Accept a sticker request: mark as accepted and decrement each
 * duplicate count in the accepter's (toUser's) collection.
 */
export async function acceptStickerRequest(
  requestId: string,
  toUserId: string,
  stickers: string[]
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, "requests", requestId), {
    status: "accepted",
    updatedAt: Date.now(),
  });

  const colRef = collectionRef(toUserId);
  for (const stickerId of stickers) {
    batch.update(colRef, { [`duplicates.${stickerId}`]: increment(-1) });
  }

  await batch.commit();
}

export async function rejectStickerRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, "requests", requestId), {
    status: "rejected",
    updatedAt: Date.now(),
  });
}

export function subscribeToIncomingRequests(
  userId: string,
  onData: (requests: StickerRequest[]) => void
): () => void {
  const q = query(
    collection(db, "requests"),
    where("toUserId", "==", userId),
    where("status", "==", "pending")
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StickerRequest)));
  });
}

export function subscribeToOutgoingRequests(
  userId: string,
  onData: (requests: StickerRequest[]) => void
): () => void {
  const q = query(
    collection(db, "requests"),
    where("fromUserId", "==", userId),
    where("status", "==", "pending")
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StickerRequest)));
  });
}
