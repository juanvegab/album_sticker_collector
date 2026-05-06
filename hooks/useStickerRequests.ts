import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import {
  subscribeToIncomingRequests,
  subscribeToOutgoingRequests,
} from "@/lib/firestore/requests";
import type { StickerRequest } from "@/types/request";

export function useStickerRequests() {
  const { user } = useUser();
  const [incoming, setIncoming] = useState<StickerRequest[]>([]);
  const [outgoing, setOutgoing] = useState<StickerRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubIn = subscribeToIncomingRequests(user.id, setIncoming);
    const unsubOut = subscribeToOutgoingRequests(user.id, setOutgoing);
    return () => { unsubIn(); unsubOut(); };
  }, [user]);

  return { incoming, outgoing };
}
