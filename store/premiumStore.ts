import { create } from "zustand";

const TRIAL_DAYS = 3;

interface PremiumState {
  isPremium: boolean;
  isPurchasing: boolean;
  firstOpenDate: number | null;
  setIsPremium: (value: boolean) => void;
  setFirstOpenDate: (date: number) => void;
  setIsPurchasing: (value: boolean) => void;
  trialDaysLeft: () => number;
  isTrialActive: () => boolean;
  showAds: () => boolean;
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  isPremium: false,
  isPurchasing: false,
  firstOpenDate: null,

  setIsPremium: (value) => set({ isPremium: value }),
  setFirstOpenDate: (date) => set({ firstOpenDate: date }),
  setIsPurchasing: (value) => set({ isPurchasing: value }),

  trialDaysLeft: () => {
    const { firstOpenDate } = get();
    if (!firstOpenDate) return TRIAL_DAYS;
    const elapsed = Date.now() - firstOpenDate;
    const daysElapsed = elapsed / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed));
  },

  isTrialActive: () => get().trialDaysLeft() > 0,

  // Ads show only when trial expired AND not premium
  showAds: () => !get().isPremium && !get().isTrialActive(),
}));
