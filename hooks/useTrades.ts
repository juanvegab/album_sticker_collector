import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import { subscribeToOpenTrades, subscribeToMyTrades } from "@/lib/firestore/trades";
import type { Trade } from "@/types/trade";

const ALBUM_ID = "world-cup-2026";

export function useOpenTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToOpenTrades(ALBUM_ID, (data) => {
      setTrades(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { trades, loading };
}

export function useMyTrades() {
  const { user } = useUser();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMyTrades(user.id, ALBUM_ID, (data) => {
      setTrades(data);
      setLoading(false);
    });
    return unsub;
  }, [user?.id]);

  return { trades, loading };
}
