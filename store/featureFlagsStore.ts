/**
 * featureFlagsStore
 *
 * Reads the `feature-flags` Firestore collection once at startup.
 * Each document has the shape: { "feature-flag-name": string, value: boolean }
 *
 * Access flags with:
 *   const offlineMode = useFeatureFlagsStore.getState().flags["OFFLINE_MODE"] ?? false;
 */
import { create } from "zustand";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface FeatureFlagsState {
  flags: Record<string, boolean>;
  loaded: boolean;
  loadFlags: () => Promise<void>;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set) => ({
  flags: {},
  loaded: false,
  loadFlags: async () => {
    try {
      const snap = await getDocs(collection(db, "feature-flags"));
      const flags: Record<string, boolean> = {};
      snap.forEach((doc) => {
        const data = doc.data();
        const name = data["feature-flag-name"];
        if (typeof name === "string" && typeof data.value === "boolean") {
          flags[name] = data.value;
        }
      });
      set({ flags, loaded: true });
    } catch {
      // Fail open — all flags default to false (existing behaviour)
      set({ loaded: true });
    }
  },
}));
