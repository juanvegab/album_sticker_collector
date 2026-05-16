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
  arrayUnion,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StickerRequest } from "@/types/request";

const ALBUM_ID = "world-cup-2026";

function userCollectionRef(userId: string) {
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
    givenStickers: [],
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

/**
 * toUser responds with a partial subset (givenStickers) of what was requested.
 * Immediately decrements toUser's duplicate counts for confirmed stickers.
 */
export async function acceptStickerRequest(
  requestId: string,
  toUserId: string,
  givenStickers: string[]
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, "requests", requestId), {
    status: "accepted",
    givenStickers,
    updatedAt: Date.now(),
  });

  const colRef = userCollectionRef(toUserId);
  for (const stickerId of givenStickers) {
    batch.set(colRef, { [`duplicates.${stickerId}`]: increment(-1), albumId: ALBUM_ID }, { merge: true });
  }

  await batch.commit();
}

export async function rejectStickerRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, "requests", requestId), {
    status: "rejected",
    updatedAt: Date.now(),
  });
}

/** Cancel a pending outgoing request (before the other side has responded) */
export async function cancelOutgoingRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, "requests", requestId), {
    status: "cancelled",
    updatedAt: Date.now(),
  });
}

/**
 * Cancel an already-accepted request.
 * Restores the duplicate counts that were decremented when the request was accepted.
 */
export async function cancelAcceptedRequest(
  requestId: string,
  toUserId: string,
  givenStickers: string[]
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, "requests", requestId), {
    status: "cancelled",
    updatedAt: Date.now(),
  });

  if (givenStickers.length > 0) {
    const colRef = userCollectionRef(toUserId);
    for (const stickerId of givenStickers) {
      batch.set(colRef, { [`duplicates.${stickerId}`]: increment(1), albumId: ALBUM_ID }, { merge: true });
    }
  }

  await batch.commit();
}

/**
 * fromUser confirms physical receipt. Adds givenStickers to their owned array.
 */
export async function markRequestReceived(
  requestId: string,
  fromUserId: string,
  givenStickers: string[]
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, "requests", requestId), {
    status: "received",
    updatedAt: Date.now(),
  });

  if (givenStickers.length > 0) {
    // Use set+merge so it works even if the collection doc doesn't exist yet
    batch.set(
      userCollectionRef(fromUserId),
      { owned: arrayUnion(...givenStickers), albumId: ALBUM_ID },
      { merge: true }
    );
  }

  await batch.commit();
}

/** Pending incoming requests to respond to (toUser) */
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

/** Requests I sent that were accepted but not yet physically delivered (fromUser perspective) */
export function subscribeToMyPendingDeliveries(
  userId: string,
  onData: (requests: StickerRequest[]) => void
): () => void {
  const q = query(
    collection(db, "requests"),
    where("fromUserId", "==", userId),
    where("status", "==", "accepted")
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StickerRequest)));
  });
}

/** Requests I accepted and need to physically deliver (toUser perspective) */
export function subscribeToMyToDeliver(
  userId: string,
  onData: (requests: StickerRequest[]) => void
): () => void {
  const q = query(
    collection(db, "requests"),
    where("toUserId", "==", userId),
    where("status", "==", "accepted")
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StickerRequest)));
  });
}

/** All outgoing requests (for history/tracking) */
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
