import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Alert, Image,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { getTrade, addTradeResponse } from "@/lib/firestore/trades";
import { ALL_STICKERS_MAP, WORLD_CUP_2026, FIFA_TO_ISO } from "@/lib/data/world-cup-2026";
import type { Trade } from "@/types/trade";
import type { AlbumSticker } from "@/types/album";

function groupBySection(ids: string[]): { sectionId: string; stickers: AlbumSticker[] }[] {
  const bySection = new Map<string, AlbumSticker[]>();
  for (const id of ids) {
    const sticker = ALL_STICKERS_MAP.get(id);
    if (!sticker) continue;
    if (!bySection.has(sticker.sectionId)) bySection.set(sticker.sectionId, []);
    bySection.get(sticker.sectionId)!.push(sticker);
  }
  const result: { sectionId: string; stickers: AlbumSticker[] }[] = [];
  for (const section of WORLD_CUP_2026.sections) {
    const stickers = bySection.get(section.id);
    if (stickers) result.push({ sectionId: section.id, stickers });
  }
  return result;
}

function StickerRow({ sticker, selected, onToggle }: { sticker: AlbumSticker; selected: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      className={`flex-row items-center py-2.5 px-2 rounded-lg mb-1 border ${selected ? "bg-blue-50 border-blue-300" : "bg-white border-gray-100"}`}
      activeOpacity={0.7}
    >
      <View className={`w-5 h-5 rounded border-2 mr-2 items-center justify-center flex-shrink-0 ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
        {selected && <Text className="text-white font-bold" style={{ fontSize: 10 }}>✓</Text>}
      </View>
      <Text className="text-xs font-semibold text-gray-500 mr-1.5" style={{ minWidth: 36 }}>{sticker.id}</Text>
      <Text className="text-xs text-gray-700 flex-1" numberOfLines={1}>{sticker.name}</Text>
    </TouchableOpacity>
  );
}

function StickerPanel({
  title, color, ids, selected, onToggle,
}: {
  title: string; color: "blue" | "green"; ids: string[]; selected: string[]; onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();
  const groups = groupBySection(ids);
  const headerBg = color === "blue" ? "bg-blue-600" : "bg-green-600";

  return (
    <View className="flex-1 border-gray-200" style={{ borderRightWidth: color === "blue" ? 1 : 0 }}>
      <View className={`${headerBg} px-3 py-2.5`}>
        <Text className="text-white text-sm font-bold text-center">{title}</Text>
        <Text className="text-white/70 text-xs text-center">
          {t("trades.selected", { count: selected.length, total: ids.length })}
        </Text>
      </View>
      <ScrollView className="flex-1 bg-gray-50 px-2 pt-2" showsVerticalScrollIndicator={false}>
        {groups.map(({ sectionId, stickers }) => {
          const iso = FIFA_TO_ISO[sectionId];
          return (
            <View key={sectionId} className="mb-2">
              <View className="flex-row items-center mb-1">
                {iso ? (
                  <Image
                    source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
                    style={{ width: 20, height: 13, borderRadius: 2, marginRight: 5 }}
                    resizeMode="cover"
                  />
                ) : null}
                <Text className="text-xs font-semibold text-gray-500 uppercase">{sectionId}</Text>
              </View>
              {stickers.map((s) => (
                <StickerRow key={s.id} sticker={s} selected={selected.includes(s.id)} onToggle={() => onToggle(s.id)} />
              ))}
            </View>
          );
        })}
        <View className="h-4" />
      </ScrollView>
    </View>
  );
}

export default function TradeViewerScreen() {
  const { t } = useTranslation();
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [responderName, setResponderName] = useState(
    user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? ""
  );
  const [wantsToReceive, setWantsToReceive] = useState<string[]>([]);
  const [canGive, setCanGive] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tradeId) return;
    getTrade(tradeId).then(setTrade).catch(() => setTrade(null)).finally(() => setLoading(false));
  }, [tradeId]);

  function toggleReceive(id: string) {
    setWantsToReceive((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleGive(id: string) {
    setCanGive((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submitResponse() {
    if (!trade) return;
    if (!responderName.trim()) {
      Alert.alert(t("trades.missingName"), t("trades.yourNameQ"));
      return;
    }
    if (wantsToReceive.length === 0 && canGive.length === 0) {
      Alert.alert(t("trades.selectStickers"), t("trades.selectHint"));
      return;
    }
    setSubmitting(true);
    try {
      await addTradeResponse(trade.id, {
        responderId: user?.id,
        responderName: responderName.trim(),
        wantsToReceive,
        canGive,
      });
      Alert.alert(
        t("trades.proposalSent"),
        t("trades.proposalSentMsg", { name: trade.fromUserName }),
        [{ text: t("common.ok"), onPress: () => router.replace("/(tabs)/album") }]
      );
    } catch {
      Alert.alert(t("common.error"), t("trades.errorSend"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (!trade) {
    return (
      <>
        <Stack.Screen options={{ title: t("trades.tradeDetail") }} />
        <View className="flex-1 items-center justify-center bg-white px-8">
          <Text className="text-5xl mb-3">🔍</Text>
          <Text className="text-gray-500 text-base text-center">{t("trades.notFound")}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("trades.tradeFrom", { name: trade.fromUserName }) }} />
      <View className="flex-1 bg-white">
        <View className="bg-blue-600 px-4 py-3">
          <Text className="text-white font-bold text-base">{trade.fromUserName}</Text>
          <Text className="text-blue-200 text-xs">
            {t("trades.offersSummary", { offering: trade.offering.length, requesting: trade.requesting.length })}
          </Text>
        </View>

        <View className="flex-1 flex-row">
          <StickerPanel title={t("trades.whatIDeliver")} color="blue" ids={trade.requesting} selected={canGive} onToggle={toggleGive} />
          <StickerPanel title={t("trades.whatIReceive")} color="green" ids={trade.offering} selected={wantsToReceive} onToggle={toggleReceive} />
        </View>

        <View className="bg-white border-t border-gray-200 px-4 py-3">
          {!user && (
            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-2.5 mb-3 text-gray-900 text-sm"
              placeholder={t("trades.yourName")}
              value={responderName}
              onChangeText={setResponderName}
              autoCapitalize="words"
            />
          )}
          <TouchableOpacity
            onPress={submitResponse}
            disabled={submitting}
            className={`rounded-xl py-4 items-center ${submitting ? "bg-gray-200" : "bg-green-600"}`}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">{t("trades.sendProposal")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
