import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { usePremium } from "@/hooks/usePremium";

export function TrialBanner() {
  const { t } = useTranslation();
  const { isPremium, isTrialActive, trialDaysLeft } = usePremium();

  if (isPremium) return null;

  const days = trialDaysLeft();
  const trialActive = isTrialActive();

  if (trialActive) {
    return (
      <View className="bg-amber-500 px-4 py-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-white font-bold text-sm">
            {days === 1 ? t("premium.lastDay") : t("premium.daysLeft", { days })}
          </Text>
          <Text className="text-amber-100 text-xs mt-0.5">{t("premium.afterTrial")}</Text>
        </View>
        <TouchableOpacity className="bg-white rounded-xl px-4 py-2 ml-3" activeOpacity={0.8}>
          <Text className="text-amber-600 font-bold text-sm">{t("premium.removeAds")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-red-600 px-4 py-4">
      <Text className="text-white font-bold text-base mb-1">{t("premium.trialEnded")}</Text>
      <Text className="text-red-100 text-sm mb-3">{t("premium.trialEndedMsg")}</Text>
      <TouchableOpacity className="bg-white rounded-xl py-3 items-center" activeOpacity={0.8}>
        <Text className="text-red-600 font-bold text-base">{t("premium.removeAdsCta")}</Text>
      </TouchableOpacity>
    </View>
  );
}
