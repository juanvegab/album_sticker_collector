import { create } from "zustand";
import type { UserCollection } from "@/types/collection";

interface CollectionState {
  collection: UserCollection | null;
  setCollection: (c: UserCollection | null) => void;
  toggleOwned: (stickerId: string) => void;
  setDuplicates: (stickerId: string, count: number) => void;
  bulkOwn: (ids: string[]) => void;
}

const DEFAULT_ALBUM = "world-cup-2026";

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collection: null,

  setCollection: (c) => set({ collection: c }),

  toggleOwned: (stickerId) => {
    const current = get().collection ?? {
      albumId: DEFAULT_ALBUM,
      owned: [],
      duplicates: {},
      updatedAt: Date.now(),
    };
    const owned = current.owned.includes(stickerId)
      ? current.owned.filter((id) => id !== stickerId)
      : [...current.owned, stickerId];
    set({ collection: { ...current, owned, updatedAt: Date.now() } });
  },

  bulkOwn: (ids) => {
    const current = get().collection ?? {
      albumId: DEFAULT_ALBUM,
      owned: [],
      duplicates: {},
      updatedAt: Date.now(),
    };
    const ownedSet = new Set(current.owned);
    for (const id of ids) ownedSet.add(id);
    set({ collection: { ...current, owned: Array.from(ownedSet), updatedAt: Date.now() } });
  },

  setDuplicates: (stickerId, count) => {
    const current = get().collection ?? {
      albumId: DEFAULT_ALBUM,
      owned: [],
      duplicates: {},
      updatedAt: Date.now(),
    };
    const duplicates = { ...current.duplicates };
    if (count <= 0) {
      delete duplicates[stickerId];
    } else {
      duplicates[stickerId] = count;
    }
    set({ collection: { ...current, duplicates, updatedAt: Date.now() } });
  },
}));
