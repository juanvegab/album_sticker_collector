import { useEffect, useRef, useCallback, useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCollectionStore } from "@/store/collectionStore";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import { useFeatureFlagsStore } from "@/store/featureFlagsStore";
import {
  subscribeToCollection,
  saveCollection,
} from "@/lib/firestore/collections";
import type { UserCollection } from "@/types/collection";

const ALBUM_ID = "world-cup-2026";
const DEBOUNCE_MS = 800;

/** AsyncStorage key for the local collection cache (OFFLINE_MODE only). */
const cacheKey = (userId: string) => `@col_cache:${userId}`;

export function useCollection() {
  const { user } = useUser();
  const fbUser = useFirebaseUser();
  const { collection, setCollection, toggleOwned, setDuplicates, bulkOwn } =
    useCollectionStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingFromServer = useRef(false);
  const [collectionLoaded, setCollectionLoaded] = useState(false);

  /**
   * Timestamp of the latest local write.
   * Used to detect when the Firestore listener tries to overwrite
   * a newer local change (e.g. after a failed save due to no internet).
   */
  const localTs = useRef<number>(0);

  useEffect(() => {
    if (!user || !fbUser) return;

    let cancelled = false;
    let unsub: (() => void) | undefined;

    (async () => {
      // ── Step 1: Restore from AsyncStorage (OFFLINE_MODE only) ──────────
      // Shows cached data instantly and protects it from being overwritten
      // by an older Firestore snapshot before the save is confirmed.
      const offlineMode =
        useFeatureFlagsStore.getState().flags["OFFLINE_MODE"] ?? false;

      if (offlineMode) {
        try {
          const raw = await AsyncStorage.getItem(cacheKey(user.id));
          if (raw && !cancelled) {
            const cached = JSON.parse(raw) as UserCollection;
            localTs.current = cached.updatedAt ?? 0;
            isSyncingFromServer.current = true;
            setCollection(cached);
            setCollectionLoaded(true);
            setTimeout(() => {
              isSyncingFromServer.current = false;
            }, 0);
          }
        } catch {
          // Ignore cache read errors — Firestore will provide the data
        }
      }

      if (cancelled) return;

      // ── Step 2: Subscribe to Firestore ─────────────────────────────────
      unsub = subscribeToCollection(
        user.id,
        ALBUM_ID,
        (data) => {
          const om =
            useFeatureFlagsStore.getState().flags["OFFLINE_MODE"] ?? false;
          const serverData: UserCollection = data ?? {
            albumId: ALBUM_ID,
            owned: [],
            duplicates: {},
            updatedAt: 0,
          };
          const serverTs = serverData.updatedAt ?? 0;

          if (om && localTs.current > serverTs) {
            // ── Local is newer than server ──────────────────────────────
            // This happens when:
            //   a) The previous saveCollection() failed (no internet), OR
            //   b) The app was just opened and has a newer local cache.
            // → Keep local state, re-try the Firestore write.
            const local = useCollectionStore.getState().collection;
            if (local) {
              saveCollection(user.id, local).catch(console.error);
            }
            setCollectionLoaded(true);
            return;
          }

          // ── Normal path: server data is authoritative ─────────────────
          isSyncingFromServer.current = true;
          setCollection(serverData);
          localTs.current = serverTs;
          setCollectionLoaded(true);

          // Keep AsyncStorage in sync so restarts use fresh server data
          if (om) {
            AsyncStorage.setItem(
              cacheKey(user.id),
              JSON.stringify(serverData)
            ).catch(() => {});
          }

          setTimeout(() => {
            isSyncingFromServer.current = false;
          }, 0);
        },
        (err) => console.error("[useCollection] Firestore error:", err.message)
      );
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [user?.id, fbUser?.uid]);

  const scheduleSave = useCallback(() => {
    if (!user || isSyncingFromServer.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const current = useCollectionStore.getState().collection;
      if (!current || !user) return;

      const om =
        useFeatureFlagsStore.getState().flags["OFFLINE_MODE"] ?? false;
      const now = Date.now();

      if (om) {
        // ── OFFLINE_MODE: write to AsyncStorage first ────────────────────
        // Even if Firestore is unreachable, the data is safe locally.
        // localTs is advanced BEFORE the Firestore call so the snapshot
        // listener won't overwrite these changes if the write fails.
        localTs.current = now;
        const toCache = { ...current, updatedAt: now };
        try {
          await AsyncStorage.setItem(
            cacheKey(user.id),
            JSON.stringify(toCache)
          );
        } catch {
          // AsyncStorage write failed — still try Firestore
        }
      }

      saveCollection(user.id, current).catch(console.error);
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

  const bulkOwnAndSave = useCallback(
    (ids: string[]) => {
      bulkOwn(ids);
      scheduleSave();
    },
    [bulkOwn, scheduleSave]
  );

  const ownedSet = new Set(collection?.owned ?? []);

  return {
    collection,
    ownedSet,
    duplicates: collection?.duplicates ?? {},
    collectionLoaded,
    isOwned: (id: string) => ownedSet.has(id),
    hasDuplicate: (id: string) => (collection?.duplicates[id] ?? 0) > 0,
    toggle,
    setDuplicates: setDups,
    bulkOwn: bulkOwnAndSave,
    scheduleSave,
  };
}
