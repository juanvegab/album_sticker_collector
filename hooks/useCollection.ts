import { useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useCollectionStore } from "@/store/collectionStore";
import {
  subscribeToCollection,
  saveCollection,
} from "@/lib/firestore/collections";

const ALBUM_ID = "world-cup-2026";
const DEBOUNCE_MS = 800;

export function useCollection() {
  const { user } = useUser();
  const { collection, setCollection, toggleOwned, setDuplicates } =
    useCollectionStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingFromServer = useRef(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToCollection(user.id, ALBUM_ID, (data) => {
      isSyncingFromServer.current = true;
      setCollection(
        data ?? { albumId: ALBUM_ID, owned: [], duplicates: {}, updatedAt: 0 }
      );
      setTimeout(() => {
        isSyncingFromServer.current = false;
      }, 0);
    });
    return unsub;
  }, [user?.id]);

  const scheduleSave = useCallback(() => {
    if (!user || isSyncingFromServer.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const current = useCollectionStore.getState().collection;
      if (current && user) {
        saveCollection(user.id, current).catch(console.error);
      }
    }, DEBOUNCE_MS);
  }, [user?.id]);

  const toggle = useCallback(
    (stickerId: string) => {
      toggleOwned(stickerId);
      scheduleSave();
    },
    [toggleOwned, scheduleSave]
  );

  const setDups = useCallback(
    (stickerId: string, count: number) => {
      setDuplicates(stickerId, count);
      scheduleSave();
    },
    [setDuplicates, scheduleSave]
  );

  const ownedSet = new Set(collection?.owned ?? []);

  return {
    collection,
    ownedSet,
    duplicates: collection?.duplicates ?? {},
    isOwned: (id: string) => ownedSet.has(id),
    hasDuplicate: (id: string) => (collection?.duplicates[id] ?? 0) > 0,
    toggle,
    setDuplicates: setDups,
  };
}
