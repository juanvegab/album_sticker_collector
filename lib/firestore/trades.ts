import {
  collection,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Trade, TradeStatus, TradeResponse } from "@/types/trade";

const tradesCol = collection(db, "trades");

export function subscribeToOpenTrades(
  albumId: string,
  onUpdate: (trades: Trade[]) => void
): Unsubscribe {
  const q = query(
    tradesCol,
    where("albumId", "==", albumId),
    where("status", "==", "open")
  );
  return onSnapshot(q, (snap) => {
    const trades = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Trade))
      .sort((a, b) => b.createdAt - a.createdAt);
    onUpdate(trades);
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
    where("fromUserId", "==", userId)
  );
  return onSnapshot(q, (snap) => {
    const trades = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Trade))
      .sort((a, b) => b.createdAt - a.createdAt);
    onUpdate(trades);
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

export async function getTrade(tradeId: string): Promise<Trade | null> {
  const snap = await getDoc(doc(db, "trades", tradeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Trade;
}

export async function addTradeResponse(
  tradeId: string,
  response: Omit<TradeResponse, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "trades", tradeId, "responses"),
    { ...response, createdAt: Date.now() }
  );
  return ref.id;
}
