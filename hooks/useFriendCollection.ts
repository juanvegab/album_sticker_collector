import { useState, useEffect } from "react";
import { subscribeToCollection } from "@/lib/firestore/collections";
import { WORLD_CUP_2026 } from "@/lib/data/world-cup-2026";
import type { AlbumSticker } from "@/types/album";

const ALBUM_ID = "world-cup-2026";

/** Returns only the stickers a friend has as duplicates (count > 0). */
export function useFriendCollection(friendId: string | null) {
  const [duplicateStickers, setDuplicateStickers] = useState<AlbumSticker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!friendId) {
      setDuplicateStickers([]);
      setLoading(false);
      return;
    }

    const unsub = subscribeToCollection(friendId, ALBUM_ID, (col) => {
      if (!col) {
        setDuplicateStickers([]);
        setLoading(false);
        return;
      }
      const dupsSet = new Set(
        Object.entries(col.duplicates)
          .filter(([, count]) => count > 0)
          .map(([id]) => id)
      );
      const stickers = WORLD_CUP_2026.sections
        .flatMap((s) => s.stickers)
        .filter((s) => dupsSet.has(s.id));
      setDuplicateStickers(stickers);
      setLoading(false);
    });

    return unsub;
  }, [friendId]);

  return { duplicateStickers, loading };
}
