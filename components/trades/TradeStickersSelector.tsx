import { useState, useRef } from "react";
import { View, Text, ScrollView, SectionList, TouchableOpacity, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { WORLD_CUP_2026, TEAM_GROUP, FIFA_TO_ISO } from "@/lib/data/world-cup-2026";
import type { AlbumSticker } from "@/types/album";

interface PoolSection {
  sectionId: string;
  name: string;
  data: AlbumSticker[];
}

type LeftItem =
  | { type: "header"; label: string }
  | { type: "section"; sectionId: string; name: string; total: number; selectedCount: number };

interface Props {
  pool: AlbumSticker[];
  selected: string[];
  onToggle: (id: string) => void;
}

export function TradeStickersSelector({ pool, selected, onToggle }: Props) {
  const { t } = useTranslation();
  // Index eligible stickers by section, preserving album order
  const poolBySection = new Map<string, AlbumSticker[]>();
  for (const sticker of pool) {
    if (!poolBySection.has(sticker.sectionId)) poolBySection.set(sticker.sectionId, []);
    poolBySection.get(sticker.sectionId)!.push(sticker);
  }

  // Build sections in album order
  const sections: PoolSection[] = [];
  for (const section of WORLD_CUP_2026.sections) {
    const stickers = poolBySection.get(section.id);
    if (stickers && stickers.length > 0) {
      sections.push({ sectionId: section.id, name: section.name, data: stickers });
    }
  }

  const sectionIndexById = new Map(sections.map((s, i) => [s.sectionId, i]));

  // Build left panel items (only sections with eligible stickers)
  const leftItems: LeftItem[] = [];
  let lastGroup = "";
  for (const s of sections) {
    const group = TEAM_GROUP[s.sectionId];
    if (group && group !== lastGroup) {
      lastGroup = group;
      leftItems.push({ type: "header", label: t("trades.group", { letter: group }) });
    }
    leftItems.push({
      type: "section",
      sectionId: s.sectionId,
      name: s.name,
      total: s.data.length,
      selectedCount: s.data.filter((st) => selected.includes(st.id)).length,
    });
  }

  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.sectionId ?? "");
  const listRef = useRef<SectionList<AlbumSticker, PoolSection>>(null);

  function handleSelectSection(sectionId: string) {
    setActiveSectionId(sectionId);
    const idx = sectionIndexById.get(sectionId) ?? 0;
    listRef.current?.scrollToLocation({
      sectionIndex: idx,
      itemIndex: 0,
      animated: true,
      viewOffset: 0,
    });
  }

  if (pool.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-4xl mb-3">📭</Text>
        <Text className="text-gray-400 text-base text-center">
          {t("trades.noStickersStep")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 flex-row">
      {/* ── Left panel: scroll-to index ── */}
      <View style={{ width: 120 }} className="border-r border-gray-200 bg-white">
        <ScrollView showsVerticalScrollIndicator={false}>
          {leftItems.map((item, i) => {
            if (item.type === "header") {
              return (
                <View key={`hdr-${i}`} className="px-2 pt-3 pb-1">
                  <Text className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    {item.label}
                  </Text>
                </View>
              );
            }

            const iso = FIFA_TO_ISO[item.sectionId];
            const isActive = item.sectionId === activeSectionId;

            return (
              <TouchableOpacity
                key={item.sectionId}
                onPress={() => handleSelectSection(item.sectionId)}
                className={`px-3 py-3 ${isActive ? "bg-blue-50" : ""}`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  {iso ? (
                    <Image
                      source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
                      style={{ width: 24, height: 16, borderRadius: 2, marginRight: 6 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-base mr-1.5">⭐</Text>
                  )}
                  <Text
                    className={`text-xs font-medium flex-1 ${
                      isActive ? "text-blue-700" : "text-gray-700"
                    }`}
                    numberOfLines={1}
                  >
                    {item.sectionId}
                  </Text>
                  {item.selectedCount > 0 && (
                    <View className="bg-blue-600 rounded-full w-4 h-4 items-center justify-center">
                      <Text className="text-white" style={{ fontSize: 9 }}>
                        {item.selectedCount}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                  <View
                    className="h-full bg-blue-400 rounded-full"
                    style={{
                      width: `${Math.round((item.selectedCount / item.total) * 100)}%`,
                    }}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
          <View className="h-20" />
        </ScrollView>
      </View>

      {/* ── Right panel: continuous SectionList ── */}
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(sticker) => sticker.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 6 }}
        stickySectionHeadersEnabled
        onScrollToIndexFailed={() => {}}
        renderSectionHeader={({ section }) => {
          const iso = FIFA_TO_ISO[section.sectionId];
          const selCount = section.data.filter((s) => selected.includes(s.id)).length;
          return (
            <View className="flex-row items-center bg-gray-100 py-2 px-1 border-b border-gray-200">
              {iso ? (
                <Image
                  source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
                  style={{ width: 22, height: 15, borderRadius: 2, marginRight: 6 }}
                  resizeMode="cover"
                />
              ) : null}
              <Text className="text-xs font-bold text-gray-700 flex-1">{section.name}</Text>
              {selCount > 0 && (
                <Text className="text-xs text-blue-600 font-semibold">{t("trades.selCount", { count: selCount })}</Text>
              )}
            </View>
          );
        }}
        renderItem={({ item: sticker }) => {
          const isSelected = selected.includes(sticker.id);
          return (
            <TouchableOpacity
              onPress={() => onToggle(sticker.id)}
              className={`flex-row items-center rounded-xl mb-2 px-3 py-3.5 border ${
                isSelected ? "bg-blue-50 border-blue-400" : "bg-white border-gray-100"
              }`}
              activeOpacity={0.7}
            >
              <View
                className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center flex-shrink-0 ${
                  isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                }`}
              >
                {isSelected && (
                  <Text className="text-white font-bold" style={{ fontSize: 10 }}>
                    ✓
                  </Text>
                )}
              </View>
              <Text className="text-xs text-gray-400 w-14" numberOfLines={1}>
                {sticker.id}
              </Text>
              <Text className="flex-1 text-gray-800 text-sm" numberOfLines={1}>
                {sticker.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
