import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useUser } from "@clerk/clerk-expo";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePremium } from "@/hooks/usePremium";
import { usePremiumStore } from "@/store/premiumStore";
import { purchaseNoAds, restorePurchases } from "@/lib/purchases";

// Compact dark chip shown at the top of screens (friends, etc.)
// Account screen handles premium state inline inside the gradient card.
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
          await setDoc(doc(db, "users", user.id, "profile", "premium"), { isPremium: true }, { merge: true });
        }
        Alert.alert(t("premium.successTitle"), t("premium.successMsg"));
      }
    } catch (err: any) {
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
          await setDoc(doc(db, "users", user.id, "profile", "premium"), { isPremium: true }, { merge: true });
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

  // Trial active → compact chip
  if (trialActive) {
    return (
      <TouchableOpacity
        onPress={handlePurchase}
        disabled={isPurchasing}
        activeOpacity={0.85}
        style={{
          marginHorizontal: 16, marginBottom: 10,
          backgroundColor: "rgba(244,196,48,0.10)",
          borderRadius: 99, borderWidth: 1,
          borderColor: "rgba(244,196,48,0.30)",
          paddingHorizontal: 14, paddingVertical: 9,
          flexDirection: "row", alignItems: "center",
        }}
      >
        <View style={{
          width: 6, height: 6, borderRadius: 99,
          backgroundColor: "#F4C430", marginRight: 8,
        }} />
        <Text style={{ color: "#F4C430", fontSize: 12, fontWeight: "700", flex: 1 }}>
          {days === 1 ? t("premium.lastDay") : t("premium.daysLeft", { days })}
        </Text>
        {isPurchasing ? (
          <ActivityIndicator color="#F4C430" size="small" />
        ) : (
          <Text style={{ color: "#F4C430", fontSize: 12, fontWeight: "800" }}>
            {t("premium.removeAds")} →
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // Trial ended → slightly more prominent dark bar
  return (
    <View style={{
      marginHorizontal: 16, marginBottom: 10,
      backgroundColor: "rgba(239,68,68,0.10)",
      borderRadius: 12, borderWidth: 1,
      borderColor: "rgba(239,68,68,0.25)",
      paddingHorizontal: 14, paddingVertical: 10,
    }}>
      <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
        {t("premium.trialEnded")}
      </Text>
      <TouchableOpacity
        onPress={handlePurchase}
        disabled={isPurchasing}
        style={{
          backgroundColor: "#EF4444", borderRadius: 10,
          paddingVertical: 10, alignItems: "center", marginBottom: 6,
        }}
        activeOpacity={0.8}
      >
        {isPurchasing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>
            {t("premium.removeAdsCta")}
          </Text>
        )}
      </TouchableOpacity>
      <Text style={{ color: "rgba(239,68,68,0.5)", fontSize: 11, textAlign: "center" }}>
        {t("premium.oneTimePurchase")}
      </Text>
    </View>
  );
}
