import { useState, useRef } from "react";
import { View, Text, ScrollView, SectionList, TouchableOpacity, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { WORLD_CUP_2026, TEAM_GROUP, FIFA_TO_ISO } from "@/lib/data/world-cup-2026";
import type { AlbumSticker } from "@/types/album";

// ── Design tokens ──────────────────────────────────────────────────────
const BG       = "#0B0B0E";
const SURFACE  = "#15161B";
const ELEVATED = "#1C1D24";
const INK      = "#F5F4EE";
const DIM      = "rgba(245,244,238,0.38)";
const DIM3     = "rgba(245,244,238,0.08)";
const BRAND    = "#F4C430";

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
  emptyIcon?: string;
  emptyText?: string;
}

export function StickerPickerPanel({ pool, selected, onToggle, emptyIcon = "📭", emptyText }: Props) {
  const { t } = useTranslation();

  const poolBySection = new Map<string, AlbumSticker[]>();
  for (const sticker of pool) {
    if (!poolBySection.has(sticker.sectionId)) poolBySection.set(sticker.sectionId, []);
    poolBySection.get(sticker.sectionId)!.push(sticker);
  }

  const sections: PoolSection[] = [];
  for (const section of WORLD_CUP_2026.sections) {
    const stickers = poolBySection.get(section.id);
    if (stickers && stickers.length > 0) {
      sections.push({ sectionId: section.id, name: section.name, data: stickers });
    }
  }

  const sectionIndexById = new Map(sections.map((s, i) => [s.sectionId, i]));

  const leftItems: LeftItem[] = [];
  let lastGroup = "";
  for (const s of sections) {
    const group = TEAM_GROUP[s.sectionId];
    if (group && group !== lastGroup) {
      lastGroup = group;
      leftItems.push({ type: "header", label: t("album.group", { letter: group }) });
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
    listRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: true, viewOffset: 0 });
  }

  if (pool.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>{emptyIcon}</Text>
        <Text style={{ color: DIM, fontSize: 15, textAlign: "center" }}>
          {emptyText ?? t("friends.noDuplicatesGeneric")}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {/* Left sidebar */}
      <View style={{ width: 112, borderRightWidth: 1, borderRightColor: DIM3, backgroundColor: SURFACE }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {leftItems.map((item, i) => {
            if (item.type === "header") {
              return (
                <View key={`hdr-${i}`} style={{ paddingHorizontal: 10, paddingTop: 14, paddingBottom: 4 }}>
                  <Text style={{ color: BRAND, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" }}>
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
                style={{
                  paddingHorizontal: 10, paddingVertical: 10,
                  backgroundColor: isActive ? "rgba(244,196,48,0.10)" : "transparent",
                  borderLeftWidth: isActive ? 2 : 2,
                  borderLeftColor: isActive ? BRAND : "transparent",
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {iso ? (
                    <Image
                      source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
                      style={{ width: 22, height: 15, borderRadius: 2, marginRight: 6 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: 22, height: 15, borderRadius: 2, marginRight: 6,
                      backgroundColor: BRAND, alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ color: BG, fontSize: 6, fontWeight: "900", letterSpacing: 0.2 }}>FWC</Text>
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: 11, fontWeight: "600", flex: 1,
                      color: isActive ? INK : DIM,
                    }}
                    numberOfLines={1}
                  >
                    {item.sectionId}
                  </Text>
                  {item.selectedCount > 0 && (
                    <View style={{
                      backgroundColor: BRAND, borderRadius: 99,
                      width: 16, height: 16,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ color: BG, fontSize: 9, fontWeight: "800" }}>{item.selectedCount}</Text>
                    </View>
                  )}
                </View>
                {/* Progress bar */}
                <View style={{
                  height: 2, backgroundColor: DIM3, borderRadius: 99,
                  marginTop: 5, overflow: "hidden",
                }}>
                  <View style={{
                    height: "100%",
                    backgroundColor: isActive ? BRAND : DIM,
                    borderRadius: 99,
                    width: `${Math.round((item.selectedCount / item.total) * 100)}%`,
                  }} />
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      </View>

      {/* Right sticker list */}
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(sticker) => sticker.id}
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 6 }}
        stickySectionHeadersEnabled
        onScrollToIndexFailed={() => {}}
        renderSectionHeader={({ section }) => {
          const iso = FIFA_TO_ISO[section.sectionId];
          const selCount = section.data.filter((s) => selected.includes(s.id)).length;
          return (
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: ELEVATED,
              paddingVertical: 8, paddingHorizontal: 10,
              borderBottomWidth: 1, borderBottomColor: DIM3,
            }}>
              {iso ? (
                <Image
                  source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
                  style={{ width: 22, height: 15, borderRadius: 2, marginRight: 8 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{
                  width: 22, height: 15, borderRadius: 2, marginRight: 8,
                  backgroundColor: BRAND, alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ color: BG, fontSize: 6, fontWeight: "900", letterSpacing: 0.2 }}>FWC</Text>
                </View>
              )}
              <Text style={{ color: INK, fontSize: 12, fontWeight: "700", flex: 1 }}>{section.name}</Text>
              {selCount > 0 && (
                <Text style={{ color: BRAND, fontSize: 11, fontWeight: "700" }}>
                  {t("friends.selCount", { count: selCount })}
                </Text>
              )}
            </View>
          );
        }}
        renderItem={({ item: sticker }) => {
          const isSelected = selected.includes(sticker.id);
          return (
            <TouchableOpacity
              onPress={() => onToggle(sticker.id)}
              style={{
                flexDirection: "row", alignItems: "center",
                borderRadius: 12, marginBottom: 6,
                paddingHorizontal: 12, paddingVertical: 12,
                backgroundColor: isSelected ? "rgba(244,196,48,0.10)" : SURFACE,
                borderWidth: 1,
                borderColor: isSelected ? BRAND : DIM3,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 20, height: 20, borderRadius: 4,
                borderWidth: 2,
                backgroundColor: isSelected ? BRAND : "transparent",
                borderColor: isSelected ? BRAND : DIM,
                marginRight: 10,
                alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {isSelected && (
                  <Text style={{ color: BG, fontSize: 10, fontWeight: "800" }}>✓</Text>
                )}
              </View>
              <Text style={{ color: DIM, fontSize: 11, width: 52 }} numberOfLines={1}>{sticker.id}</Text>
              <Text style={{ color: INK, fontSize: 13, flex: 1 }} numberOfLines={1}>{sticker.name}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
