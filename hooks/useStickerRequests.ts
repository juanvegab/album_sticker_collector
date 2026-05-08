import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useFirebaseAuthReady } from "@/hooks/useFirebaseAuthReady";
import {
  subscribeToIncomingRequests,
  subscribeToOutgoingRequests,
  subscribeToMyPendingDeliveries,
} from "@/lib/firestore/requests";
import type { StickerRequest } from "@/types/request";

export function useStickerRequests() {
  const { user } = useUser();
  const firebaseReady = useFirebaseAuthReady();
  const [incoming, setIncoming] = useState<StickerRequest[]>([]);
  const [outgoing, setOutgoing] = useState<StickerRequest[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<StickerRequest[]>([]);

  useEffect(() => {
    if (!user || !firebaseReady) return;
    const unsubIn = subscribeToIncomingRequests(user.id, setIncoming);
    const unsubOut = subscribeToOutgoingRequests(user.id, setOutgoing);
    const unsubDel = subscribeToMyPendingDeliveries(user.id, setPendingDeliveries);
    return () => { unsubIn(); unsubOut(); unsubDel(); };
  }, [user?.id, firebaseReady]);

  return { incoming, outgoing, pendingDeliveries };
}
