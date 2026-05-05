import { useState } from "react";
import { View, Text, SectionList, TouchableOpacity, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useCollection } from "@/hooks/useCollection";
import { WORLD_CUP_2026, FIFA_TO_ISO } from "@/lib/data/world-cup-2026";
import type { AlbumSticker } from "@/types/album";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { TrialBanner } from "@/components/premium/TrialBanner";

type Tab = "owned" | "missing" | "duplicates";

function toRows<T>(items: T[], cols = 4): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return rows;
}

type StickerWithCount = AlbumSticker & { count?: number };
type SectionData = { sectionId: string; sectionName: string; emoji?: string; rows: StickerWithCount[][] };

export default function CollectionScreen() {
  const { t } = useTranslation();
  const { ownedSet, duplicates } = useCollection();
  const [activeTab, setActiveTab] = useState<Tab>("owned");

  const TABS: { key: Tab; label: string }[] = [
    { key: "owned", label: t("collection.haveTab") },
    { key: "missing", label: t("collection.missingTab") },
    { key: "duplicates", label: t("collection.duplicatesTab") },
  ];

  const sections: SectionData[] = WORLD_CUP_2026.sections
    .map((section) => {
      let stickers: StickerWithCount[];
      if (activeTab === "owned") {
        stickers = section.stickers.filter((s) => ownedSet.has(s.id));
      } else if (activeTab === "missing") {
        stickers = section.stickers.filter((s) => !ownedSet.has(s.id));
      } else {
        stickers = section.stickers
          .filter((s) => (duplicates[s.id] ?? 0) > 0)
          .map((s) => ({ ...s, count: duplicates[s.id] }));
      }
      return { sectionId: section.id, sectionName: section.name, emoji: section.emoji, rows: toRows(stickers) };
    })
    .filter((s) => s.rows.length > 0);

  const totalItems = sections.reduce((acc, s) => acc + s.rows.flat().length, 0);

  return (
    <View className="flex-1 bg-gray-50">
      <TrialBanner />
      <BannerAd />
      <View className="flex-row bg-white border-b border-gray-100 px-2 pt-2">
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 items-center rounded-t-lg ${
              activeTab === tab.key ? "border-b-2 border-blue-600" : ""
            }`}
          >
            <Text className={`text-sm font-medium ${activeTab === tab.key ? "text-blue-600" : "text-gray-400"}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="px-4 py-2 bg-white border-b border-gray-100">
        <Text className="text-gray-500 text-sm">{t("collection.stickersCount", { count: totalItems })}</Text>
      </View>

      {sections.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-5xl mb-3">
            {activeTab === "owned" ? "📬" : activeTab === "missing" ? "🎉" : "✨"}
          </Text>
          <Text className="text-gray-400 text-base text-center px-8">
            {activeTab === "owned"
              ? t("collection.emptyOwned")
              : activeTab === "missing"
              ? t("collection.allComplete")
              : t("collection.emptyDuplicates")}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections.map((s) => ({ ...s, data: s.rows }))}
          keyExtractor={(row, i) => `${row[0]?.id ?? i}-row`}
          contentContainerStyle={{ paddingBottom: 24 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            const iso = FIFA_TO_ISO[section.sectionId];
            return (
              <View className="flex-row items-center bg-gray-100 px-3 py-2 border-b border-gray-200 mt-2">
                {iso ? (
                  <Image
                    source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
                    style={{ width: 24, height: 16, borderRadius: 2, marginRight: 7 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="mr-1.5">{section.emoji}</Text>
                )}
                <Text className="text-sm font-semibold text-gray-700 flex-1" numberOfLines={1}>
                  {section.sectionName}
                </Text>
                <Text className="text-xs text-gray-400">{section.rows.flat().length}</Text>
              </View>
            );
          }}
          renderItem={({ item: row }) => (
            <View className="flex-row px-2 pt-2">
              {row.map((sticker) => {
                const dupCount = sticker.count ?? (duplicates[sticker.id] ?? 0);
                const bgColor =
                  activeTab === "owned" ? "bg-green-100" : activeTab === "missing" ? "bg-gray-100" : "bg-orange-100";
                return (
                  <View key={sticker.id} className={`flex-1 mx-1 rounded-lg ${bgColor} items-center justify-center py-2`} style={{ minHeight: 52 }}>
                    <Text className="text-xs font-bold text-gray-700" numberOfLines={1}>{sticker.id}</Text>
                    {activeTab === "duplicates" && dupCount > 0 && (
                      <View className="bg-orange-500 rounded-full w-5 h-5 items-center justify-center mt-0.5">
                        <Text className="text-white text-xs font-bold">{dupCount}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              {Array.from({ length: 4 - row.length }).map((_, i) => (
                <View key={`empty-${i}`} className="flex-1 mx-1" />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}
