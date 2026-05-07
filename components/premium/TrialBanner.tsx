import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useUser } from "@clerk/clerk-expo";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePremium } from "@/hooks/usePremium";
import { usePremiumStore } from "@/store/premiumStore";
import { purchaseNoAds, restorePurchases } from "@/lib/purchases";

export function TrialBanner() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { isPremium, isTrialActive, trialDaysLeft } = usePremium();
  const { isPurchasing, setIsPurchasing, setIsPremium } = usePremiumStore();

  if (isPremium) return null;

  const days = trialDaysLeft();
  const trialActive = isTrialActive();

  async function handlePurchase() {
    setIsPurchasing(true);
    try {
      const success = await purchaseNoAds();
      if (success) {
        setIsPremium(true);
        if (user) {
          const ref = doc(db, "users", user.id, "profile", "premium");
          await setDoc(ref, { isPremium: true }, { merge: true });
        }
        Alert.alert(t("premium.successTitle"), t("premium.successMsg"));
      }
    } catch (err: any) {
      console.error("Purchase error:", JSON.stringify({ code: err?.code, message: err?.message, underlyingErrorMessage: err?.underlyingErrorMessage }));
      // PurchasesErrorCode.purchaseCancelledError = 1 (number)
      if (err?.code !== 1 && err?.message !== "no_package") {
        Alert.alert(t("common.error"), t("premium.purchaseError"));
      }
    } finally {
      setIsPurchasing(false);
    }
  }

  async function handleRestore() {
    setIsPurchasing(true);
    try {
      const hasPremium = await restorePurchases();
      if (hasPremium) {
        setIsPremium(true);
        if (user) {
          const ref = doc(db, "users", user.id, "profile", "premium");
          await setDoc(ref, { isPremium: true }, { merge: true });
        }
        Alert.alert(t("premium.successTitle"), t("premium.restoreSuccess"));
      } else {
        Alert.alert(t("premium.restoreTitle"), t("premium.restoreNotFound"));
      }
    } catch {
      Alert.alert(t("common.error"), t("premium.purchaseError"));
    } finally {
      setIsPurchasing(false);
    }
  }

  if (trialActive) {
    return (
      <View className="bg-amber-500 px-4 py-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-white font-bold text-sm">
            {days === 1 ? t("premium.lastDay") : t("premium.daysLeft", { days })}
          </Text>
          <Text className="text-amber-100 text-xs mt-0.5">{t("premium.afterTrial")}</Text>
        </View>
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={isPurchasing}
          className="bg-white rounded-xl px-4 py-2 ml-3"
          activeOpacity={0.8}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#d97706" />
          ) : (
            <Text className="text-amber-600 font-bold text-sm">{t("premium.removeAds")}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-red-600 px-4 py-4">
      <Text className="text-white font-bold text-base mb-1">{t("premium.trialEnded")}</Text>
      <Text className="text-red-100 text-sm mb-3">{t("premium.trialEndedMsg")}</Text>
      <TouchableOpacity
        onPress={handlePurchase}
        disabled={isPurchasing}
        className="bg-white rounded-xl py-3 items-center mb-2"
        activeOpacity={0.8}
      >
        {isPurchasing ? (
          <ActivityIndicator size="small" color="#dc2626" />
        ) : (
          <Text className="text-red-600 font-bold text-base">{t("premium.removeAdsCta")}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={handleRestore} disabled={isPurchasing} activeOpacity={0.7}>
        <Text className="text-red-200 text-xs text-center">{t("premium.restorePurchases")}</Text>
      </TouchableOpacity>
    </View>
  );
}
