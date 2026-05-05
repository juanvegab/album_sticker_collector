import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import type { Trade } from "@/types/trade";
import { ALL_STICKERS_MAP } from "@/lib/data/world-cup-2026";

interface Props {
  trade: Trade;
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-500",
};

export function TradeCard({ trade, onPress }: Props) {
  const { t } = useTranslation();

  const offerLabel = trade.offering
    .slice(0, 3)
    .map((id) => ALL_STICKERS_MAP.get(id)?.name ?? id)
    .join(", ");

  const wantLabel = trade.requesting
    .slice(0, 3)
    .map((id) => ALL_STICKERS_MAP.get(id)?.name ?? id)
    .join(", ");

  const statusClass = STATUS_COLORS[trade.status] ?? "bg-gray-100 text-gray-500";

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white mx-4 mb-3 rounded-xl p-4 shadow-sm border border-gray-100"
      activeOpacity={0.75}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-semibold text-gray-800">{trade.fromUserName}</Text>
        <View className={`px-2 py-1 rounded-full ${statusClass.split(" ")[0]}`}>
          <Text className={`text-xs font-medium ${statusClass.split(" ")[1]}`}>
            {trade.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-4">
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">{t("trades.offers")}</Text>
          <Text className="text-sm text-gray-700" numberOfLines={2}>
            {offerLabel}
            {trade.offering.length > 3 && t("trades.more", { count: trade.offering.length - 3 })}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">{t("trades.requests")}</Text>
          <Text className="text-sm text-gray-700" numberOfLines={2}>
            {wantLabel}
            {trade.requesting.length > 3 && t("trades.more", { count: trade.requesting.length - 3 })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
