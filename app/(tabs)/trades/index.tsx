import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useOpenTrades, useMyTrades } from "@/hooks/useTrades";
import { TradeCard } from "@/components/trades/TradeCard";
import { updateTradeStatus } from "@/lib/firestore/trades";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { TrialBanner } from "@/components/premium/TrialBanner";

type Tab = "open" | "mine";

export default function TradesScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("open");
  const router = useRouter();
  const { user } = useUser();
  const { trades: openTrades, loading: loadingOpen } = useOpenTrades();
  const { trades: myTrades, loading: loadingMine } = useMyTrades();

  const loading = tab === "open" ? loadingOpen : loadingMine;
  const trades = tab === "open" ? openTrades.filter((tr) => tr.fromUserId !== user?.id) : myTrades;

  async function cancelTrade(tradeId: string) {
    Alert.alert(t("trades.cancelTitle"), t("trades.cancelConfirm"), [
      { text: t("trades.no") },
      {
        text: t("trades.yesCancel"),
        style: "destructive",
        onPress: () => updateTradeStatus(tradeId, "rejected").catch(console.error),
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: t("trades.title") }} />
      <View className="flex-1 bg-gray-50">
        <TrialBanner />
        <BannerAd />
        <View className="flex-row bg-white border-b border-gray-100 px-2 pt-2">
          {(["open", "mine"] as Tab[]).map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              onPress={() => setTab(tabKey)}
              className={`flex-1 py-2.5 items-center ${tab === tabKey ? "border-b-2 border-blue-600" : ""}`}
            >
              <Text className={`text-sm font-medium ${tab === tabKey ? "text-blue-600" : "text-gray-400"}`}>
                {tabKey === "open" ? t("trades.available") : t("trades.myTrades")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(tabs)/trades/create")}
          className="absolute bottom-6 right-6 bg-blue-600 rounded-full w-14 h-14 items-center justify-center shadow-lg z-10"
          activeOpacity={0.8}
        >
          <Text className="text-white text-2xl font-bold">+</Text>
        </TouchableOpacity>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : trades.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-5xl mb-3">{tab === "open" ? "🔍" : "📭"}</Text>
            <Text className="text-gray-400 text-base text-center">
              {tab === "open" ? t("trades.emptyAvailable") : t("trades.emptyMine")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={trades}
            keyExtractor={(tr) => tr.id}
            contentContainerStyle={{ paddingVertical: 12, paddingBottom: 80 }}
            renderItem={({ item }) => (
              <TradeCard
                trade={item}
                onPress={() =>
                  tab === "mine" && item.status === "open" ? cancelTrade(item.id) : undefined
                }
              />
            )}
          />
        )}
      </View>
    </>
  );
}
