import { View, Text, TouchableOpacity } from "react-native";
import { usePremium } from "@/hooks/usePremium";

export function TrialBanner() {
  const { isPremium, isTrialActive, trialDaysLeft } = usePremium();

  if (isPremium) return null;

  const days = trialDaysLeft();
  const trialActive = isTrialActive();

  if (trialActive) {
    // During trial: subtle reminder
    return (
      <View className="bg-amber-500 px-4 py-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-white font-bold text-sm">
            {days === 1 ? "⏳ Último día sin anuncios" : `⏳ ${days} días gratis sin anuncios`}
          </Text>
          <Text className="text-amber-100 text-xs mt-0.5">
            Después verás anuncios en toda la app
          </Text>
        </View>
        <TouchableOpacity
          className="bg-white rounded-xl px-4 py-2 ml-3"
          activeOpacity={0.8}
        >
          <Text className="text-amber-600 font-bold text-sm">Quitar ads</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // After trial: urgent persistent banner
  return (
    <View className="bg-red-600 px-4 py-4">
      <Text className="text-white font-bold text-base mb-1">
        🚨 Tu período gratis terminó
      </Text>
      <Text className="text-red-100 text-sm mb-3">
        Ahora verás anuncios mientras usas la app. Elimínalos de por vida con un solo pago.
      </Text>
      <TouchableOpacity
        className="bg-white rounded-xl py-3 items-center"
        activeOpacity={0.8}
      >
        <Text className="text-red-600 font-bold text-base">
          🎯 Quitar anuncios — $1.99
        </Text>
      </TouchableOpacity>
    </View>
  );
}
