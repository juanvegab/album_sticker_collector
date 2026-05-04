import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
  Unsubscribe,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Trade, TradeStatus } from "@/types/trade";

const tradesCol = collection(db, "trades");

export function subscribeToOpenTrades(
  albumId: string,
  onUpdate: (trades: Trade[]) => void
): Unsubscribe {
  const q = query(
    tradesCol,
    where("albumId", "==", albumId),
    where("status", "==", "open"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trade)));
  });
}

export function subscribeToMyTrades(
  userId: string,
  albumId: string,
  onUpdate: (trades: Trade[]) => void
): Unsubscribe {
  const q = query(
    tradesCol,
    where("albumId", "==", albumId),
    where("fromUserId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trade)));
  });
}

export async function createTrade(
  trade: Omit<Trade, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(tradesCol, {
    ...trade,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateTradeStatus(
  tradeId: string,
  status: TradeStatus
): Promise<void> {
  await updateDoc(doc(db, "trades", tradeId), {
    status,
    updatedAt: Date.now(),
  });
}
