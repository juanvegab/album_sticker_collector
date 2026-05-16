import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import {
  subscribeToIncomingRequests,
  subscribeToOutgoingRequests,
  subscribeToMyPendingDeliveries,
  subscribeToMyToDeliver,
} from "@/lib/firestore/requests";
import type { StickerRequest } from "@/types/request";

export function useStickerRequests() {
  const { user } = useUser();
  const fbUser = useFirebaseUser();
  const [incoming, setIncoming] = useState<StickerRequest[]>([]);
  const [outgoing, setOutgoing] = useState<StickerRequest[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<StickerRequest[]>([]);
  const [toDeliver, setToDeliver] = useState<StickerRequest[]>([]);

  useEffect(() => {
    if (!user || !fbUser) return;
    const unsubIn  = subscribeToIncomingRequests(user.id, setIncoming);
    const unsubOut = subscribeToOutgoingRequests(user.id, setOutgoing);
    const unsubDel = subscribeToMyPendingDeliveries(user.id, setPendingDeliveries);
    const unsubToDel = subscribeToMyToDeliver(user.id, setToDeliver);
    return () => { unsubIn(); unsubOut(); unsubDel(); unsubToDel(); };
  }, [user?.id, fbUser?.uid]);

  return { incoming, outgoing, pendingDeliveries, toDeliver };
}
