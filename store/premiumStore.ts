import { create } from "zustand";

const TRIAL_DAYS = 3;

// ── DEV: force expired trial state for simulator testing ──────────────
// Set to true to simulate a non-premium user with expired trial.
// Remember to set back to false before building.
export const __FORCE_TRIAL_EXPIRED__ = __DEV__ && false;

interface PremiumState {
  isPremium: boolean;
  isPurchasing: boolean;
  isLoadingPremium: boolean;
  firstOpenDate: number | null;
  setIsPremium: (value: boolean) => void;
  setFirstOpenDate: (date: number) => void;
  setIsPurchasing: (value: boolean) => void;
  setIsLoadingPremium: (value: boolean) => void;
  trialDaysLeft: () => number;
  isTrialActive: () => boolean;
  showAds: () => boolean;
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  isPremium: false,
  isPurchasing: false,
  isLoadingPremium: true,
  firstOpenDate: null,

  setIsPremium: (value) => set({ isPremium: value }),
  setFirstOpenDate: (date) => set({ firstOpenDate: date }),
  setIsPurchasing: (value) => set({ isPurchasing: value }),
  setIsLoadingPremium: (value) => set({ isLoadingPremium: value }),

  trialDaysLeft: () => {
    if (__FORCE_TRIAL_EXPIRED__) return 0;
    const { firstOpenDate } = get();
    if (!firstOpenDate) return 0; // unknown state → no trial access
    const elapsed = Date.now() - firstOpenDate;
    const daysElapsed = elapsed / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed));
  },

  isTrialActive: () => get().trialDaysLeft() > 0,

  // Ads show only when trial expired AND not premium
  showAds: () => __FORCE_TRIAL_EXPIRED__ || (!get().isPremium && !get().isTrialActive()),
}));
