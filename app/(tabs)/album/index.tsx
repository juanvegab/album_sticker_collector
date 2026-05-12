import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, FlatList,
  TouchableOpacity, Image, ActivityIndicator, StatusBar,
  NativeSyntheticEvent, NativeScrollEvent, Modal, Pressable,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { useCollection } from "@/hooks/useCollection";
import { useCollectionStore } from "@/store/collectionStore";
import { StickerCard } from "@/components/stickers/StickerCard";
import { NativeAdCard, AD_HEIGHT } from "@/components/ads/NativeAdCard";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { TrialBanner } from "@/components/premium/TrialBanner";
import { WORLD_CUP_2026, TEAM_GROUP, FIFA_TO_ISO } from "@/lib/data/world-cup-2026";
import { GROUP_COLORS, colorForSection, needsDarkText } from "@/lib/design/groupColors";
import { usePremiumStore } from "@/store/premiumStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AlbumSection, AlbumSticker } from "@/types/album";

// ── Layout constants ──────────────────────────────────────────────────
const SECTION_HEADER_HEIGHT = 56;
const ROW_HEIGHT = 104;  // card height ≈ 98px after 3px top+bottom margin
const STICKERS_PER_ROW = 3;
const PADDING_TOP = 6;

// Pre-computed section colors (module level, stable)
const SECTION_COLOR_MAP = new Map<string, string>();
for (const section of WORLD_CUP_2026.sections) {
  SECTION_COLOR_MAP.set(section.id, colorForSection(section.id, TEAM_GROUP));
}

// ── Flat item list ────────────────────────────────────────────────────
type FlatItem =
  | { type: "header"; sectionId: string; section: AlbumSection }
  | { type: "row";    sectionId: string; stickers: AlbumSticker[] }
  | { type: "ad";     sectionId: string; adIndex: number };

const FLAT_ITEMS: FlatItem[] = [];
const SECTION_FIRST_IDX = new Map<string, number>();
let _adCounter = 0;

for (const section of WORLD_CUP_2026.sections) {
  SECTION_FIRST_IDX.set(section.id, FLAT_ITEMS.length);
  FLAT_ITEMS.push({ type: "header", sectionId: section.id, section });
  FLAT_ITEMS.push({ type: "ad", sectionId: section.id, adIndex: _adCounter++ });
  for (let i = 0; i < section.stickers.length; i += STICKERS_PER_ROW) {
    FLAT_ITEMS.push({
      type: "row",
      sectionId: section.id,
      stickers: section.stickers.slice(i, i + STICKERS_PER_ROW),
    });
  }
}

// ── Pre-computed offsets ──────────────────────────────────────────────
type SectionBound = { sectionId: string; start: number; end: number };

function buildOffsets(adH: number): { offsets: number[]; bounds: SectionBound[] } {
  const offsets: number[] = [];
  let cum = PADDING_TOP;
  for (const item of FLAT_ITEMS) {
    offsets.push(cum);
    cum += item.type === "header" ? SECTION_HEADER_HEIGHT : item.type === "ad" ? adH : ROW_HEIGHT;
  }
  const bounds: SectionBound[] = [];
  for (let i = 0; i < FLAT_ITEMS.length; i++) {
    if (FLAT_ITEMS[i].type === "header") {
      let j = i + 1;
      while (j < FLAT_ITEMS.length && FLAT_ITEMS[j].type !== "header") j++;
      const end = j < FLAT_ITEMS.length
        ? offsets[j]
        : offsets[FLAT_ITEMS.length - 1] + ROW_HEIGHT;
      bounds.push({ sectionId: FLAT_ITEMS[i].sectionId, start: offsets[i], end });
    }
  }
  return { offsets, bounds };
}

const { offsets: FLAT_OFFSETS_ADS,  bounds: SECTION_BOUNDS_ADS  } = buildOffsets(AD_HEIGHT);
const { offsets: FLAT_OFFSETS_FREE, bounds: SECTION_BOUNDS_FREE } = buildOffsets(0);

function sectionWithMostPixels(scrollY: number, viewH: number, bounds: SectionBound[]): string {
  const vpBottom = scrollY + Math.max(viewH, 1);
  let bestId = bounds[0].sectionId;
  let bestPx = -1;
  for (const { sectionId, start, end } of bounds) {
    if (start >= vpBottom) break;
    if (end <= scrollY) continue;
    const px = Math.min(vpBottom, end) - Math.max(scrollY, start);
    if (px > bestPx) { bestPx = px; bestId = sectionId; }
  }
  return bestId;
}

// ── Left panel items ──────────────────────────────────────────────────
const fwcSection = WORLD_CUP_2026.sections[0];

type LeftItem =
  | { type: "header"; group: string }
  | { type: "section"; section: AlbumSection };

function buildLeftItems(): LeftItem[] {
  const items: LeftItem[] = [{ type: "section", section: fwcSection }];
  let lastGroup = "";
  for (const section of WORLD_CUP_2026.sections.slice(1)) {
    const group = TEAM_GROUP[section.id];
    if (group && group !== lastGroup) {
      lastGroup = group;
      items.push({ type: "header", group });
    }
    items.push({ type: "section", section });
  }
  return items;
}
const LEFT_ITEMS = buildLeftItems();

// ── Module-level save trigger (set by AlbumScreen, used by SectionHeader) ──
const _scheduleSaveRef = { current: () => {} };

// ── Memoized sub-components ───────────────────────────────────────────

const SectionHeader = React.memo(({ section }: { section: AlbumSection }) => {
  const ownedCount = useCollectionStore(
    useCallback(
      (state) => {
        const owned = state.collection?.owned ?? [];
        return section.stickers.filter((s) => owned.includes(s.id)).length;
      },
      [section]
    )
  );

  const iso = FIFA_TO_ISO[section.id];
  const total = section.stickers.length;
  const color = SECTION_COLOR_MAP.get(section.id) ?? "#9CA3AF";
  const dark = needsDarkText(color);
  const textMain = dark ? "rgba(0,0,0,0.85)" : "#F5F4EE";
  const textSub  = dark ? "rgba(0,0,0,0.5)"  : "rgba(245,244,238,0.6)";

  const isFWC = section.id === "FWC";
  const subtitle = isFWC
    ? `Sección especial · ${total}`
    : (() => {
        const group = TEAM_GROUP[section.id];
        return group ? `Grupo ${group}` : section.name;
      })();

  const isComplete = ownedCount >= total;

  function handleMarkAll() {
    const ids = section.stickers.map((s) => s.id);
    useCollectionStore.getState().bulkOwn(ids);
    _scheduleSaveRef.current();
  }

  return (
    <View
      style={{ height: SECTION_HEADER_HEIGHT, backgroundColor: color, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}
    >
      {/* Flag or emoji */}
      {iso ? (
        <Image
          source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
          style={{ width: 28, height: 19, borderRadius: 3, marginRight: 9 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize: 20, marginRight: 8 }}>{section.emoji}</Text>
      )}

      {/* Name + subtitle */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: textMain, fontSize: 15, fontWeight: "700", lineHeight: 19 }} numberOfLines={1}>
          {section.name}
        </Text>
        <Text style={{ color: textSub, fontSize: 11, fontWeight: "500" }}>
          {subtitle}
        </Text>
      </View>

      {/* Count */}
      <Text style={{ color: textSub, fontSize: 13, fontWeight: "600" }}>
        {ownedCount}/{total}
      </Text>

      {/* Mark all button */}
      {!isComplete && (
        <TouchableOpacity
          onPress={handleMarkAll}
          activeOpacity={0.7}
          style={{
            marginLeft: 8,
            backgroundColor: "rgba(0,0,0,0.18)",
            borderRadius: 6,
            paddingHorizontal: 7, paddingVertical: 3,
          }}
        >
          <Text style={{ color: textSub, fontSize: 10, fontWeight: "700" }}>✓ Todo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const StickerRow = React.memo(
  ({
    stickers,
    sectionColor,
    onToggle,
    onSetDups,
  }: {
    stickers: AlbumSticker[];
    sectionColor: string;
    onToggle: (id: string) => void;
    onSetDups: (id: string, count: number) => void;
  }) => (
    <View style={{ flexDirection: "row", height: ROW_HEIGHT }}>
      {stickers.map((sticker) => (
        <StickerCard
          key={sticker.id}
          sticker={sticker}
          sectionColor={sectionColor}
          onToggle={onToggle}
          onSetDups={onSetDups}
        />
      ))}
      {/* Fill empty slots in last row */}
      {Array.from({ length: STICKERS_PER_ROW - stickers.length }).map((_, i) => (
        <View key={i} style={{ flex: 1, margin: 3 }} />
      ))}
    </View>
  )
);

// ── Screen ────────────────────────────────────────────────────────────
type FilterType = "all" | "owned" | "missing" | "repeated";

export default function AlbumScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { ownedSet, duplicates, toggle, setDuplicates, bulkOwn, scheduleSave, collectionLoaded } = useCollection();

  // Wire save trigger for SectionHeader's "Mark all" button
  useEffect(() => {
    _scheduleSaveRef.current = scheduleSave;
  }, [scheduleSave]);
  const showAds = usePremiumStore((s) => s.showAds());
  const showAdsRef = useRef(showAds);
  useEffect(() => { showAdsRef.current = showAds; }, [showAds]);

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [filterVisible, setFilterVisible] = useState(false);

  const [activeSectionId, setActiveSectionId] = useState(fwcSection.id);
  const activeSectionIdRef = useRef(fwcSection.id);

  // ── Fix 4: scroll to section from Resumen ──
  const { scrollTo } = useLocalSearchParams<{ scrollTo?: string }>();
  useEffect(() => {
    if (!scrollTo || !collectionLoaded) return;
    if (scrollTo === "FWC") {
      handleSelectSection(fwcSection);
      return;
    }
    const first = WORLD_CUP_2026.sections.find((s) => TEAM_GROUP[s.id] === scrollTo);
    if (first) handleSelectSection(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTo, collectionLoaded]);

  const rightListRef = useRef<FlatList<FlatItem>>(null);
  const rightPanelHeight = useRef(0);
  const leftScrollRef = useRef<ScrollView>(null);
  const leftItemYRef = useRef(new Map<string, number>());
  const programmaticTarget = useRef<string | null>(null);
  const leftScrollAnimated = useRef(false);

  const total = WORLD_CUP_2026.totalStickers;
  const owned = ownedSet.size;
  const missing = total - owned;
  const repeatedCount = Object.values(duplicates).reduce((sum, n) => sum + Math.max(0, n), 0);

  // ── Filtered flat items (Fix 2) ───────────────────────────────────────
  const displayItems = useMemo<FlatItem[]>(() => {
    if (activeFilter === "all") return FLAT_ITEMS;
    const items: FlatItem[] = [];
    for (const section of WORLD_CUP_2026.sections) {
      const filtered = section.stickers.filter((s) => {
        if (activeFilter === "owned")    return ownedSet.has(s.id);
        if (activeFilter === "missing")  return !ownedSet.has(s.id);
        if (activeFilter === "repeated") return (duplicates[s.id] ?? 0) > 0;
        return true;
      });
      if (filtered.length === 0) continue;
      items.push({ type: "header", sectionId: section.id, section });
      for (let i = 0; i < filtered.length; i += STICKERS_PER_ROW)
        items.push({ type: "row", sectionId: section.id, stickers: filtered.slice(i, i + STICKERS_PER_ROW) });
    }
    return items;
  }, [activeFilter, ownedSet, duplicates]);
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  function updateActive(id: string, animated = false) {
    if (activeSectionIdRef.current === id) return;
    activeSectionIdRef.current = id;
    leftScrollAnimated.current = animated;
    setActiveSectionId(id);
  }

  useEffect(() => {
    const y = leftItemYRef.current.get(activeSectionId);
    if (y === undefined) return;
    leftScrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: leftScrollAnimated.current });
  }, [activeSectionId]);

  function scrollLeftTo(sectionId: string, y: number) {
    if (sectionId !== activeSectionIdRef.current) return;
    leftScrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: leftScrollAnimated.current });
  }

  function handleSelectSection(section: AlbumSection) {
    updateActive(section.id, true);
    const idx = SECTION_FIRST_IDX.get(section.id) ?? 0;
    programmaticTarget.current = section.id;
    const offsets = showAdsRef.current ? FLAT_OFFSETS_ADS : FLAT_OFFSETS_FREE;
    rightListRef.current?.scrollToOffset({ offset: offsets[idx] ?? 0, animated: true });
    setTimeout(() => { programmaticTarget.current = null; }, 1500);
  }

  const handleScrollBeginDrag = useCallback(() => {
    programmaticTarget.current = null;
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmaticTarget.current !== null) return;
    const scrollY = e.nativeEvent.contentOffset.y;
    const viewH = rightPanelHeight.current > 0 ? rightPanelHeight.current : ROW_HEIGHT * 6;
    const bounds = showAdsRef.current ? SECTION_BOUNDS_ADS : SECTION_BOUNDS_FREE;
    updateActive(sectionWithMostPixels(scrollY, viewH, bounds), true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FlatItem }) => {
      if (item.type === "header") return <SectionHeader section={item.section} />;
      if (item.type === "ad")    return <NativeAdCard adIndex={item.adIndex} />;
      const sectionColor = SECTION_COLOR_MAP.get(item.sectionId) ?? "#9CA3AF";
      return (
        <StickerRow
          stickers={item.stickers}
          sectionColor={sectionColor}
          onToggle={toggle}
          onSetDups={setDuplicates}
        />
      );
    },
    [toggle, setDuplicates]
  );

  const keyExtractor = useCallback((item: FlatItem, i: number) => {
    if (item.type === "header") return `hdr-${item.sectionId}`;
    if (item.type === "ad")     return `ad-${item.sectionId}`;
    return `row-${item.stickers[0].id}-${i}`;
  }, []);

  const getItemLayout = useCallback((_: unknown, index: number) => {
    const item = FLAT_ITEMS[index];
    const ads = showAdsRef.current;
    const length =
      item?.type === "header" ? SECTION_HEADER_HEIGHT :
      item?.type === "ad"     ? (ads ? AD_HEIGHT : 0) :
      ROW_HEIGHT;
    const offsets = ads ? FLAT_OFFSETS_ADS : FLAT_OFFSETS_FREE;
    return { length, offset: offsets[index] ?? 0, index };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0E", paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      <BannerAd />

      {/* ══ FULL-WIDTH HEADER ══ */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8,
        borderBottomWidth: 1, borderBottomColor: "rgba(245,244,238,0.07)",
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "rgba(245,244,238,0.38)", fontSize: 9, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
            {t("album.title")}
          </Text>
          <Text style={{ color: "#F5F4EE", fontSize: 22, fontWeight: "800", lineHeight: 28, marginTop: 1 }}>
            {pct}%
            <Text style={{ color: "rgba(245,244,238,0.38)", fontSize: 14, fontWeight: "600" }}>
              {" · "}{owned}/{total}
            </Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setFilterVisible(true)}
          style={{
            width: 38, height: 38, borderRadius: 12,
            backgroundColor: activeFilter !== "all" ? "rgba(244,196,48,0.15)" : "#1C1D24",
            alignItems: "center", justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <FontAwesome name="sliders" size={15} color={activeFilter !== "all" ? "#F4C430" : "rgba(245,244,238,0.55)"} />
          {activeFilter !== "all" && (
            <View style={{
              position: "absolute", top: 6, right: 6,
              width: 7, height: 7, borderRadius: 99,
              backgroundColor: "#F4C430",
            }} />
          )}
        </TouchableOpacity>
      </View>

      <TrialBanner />

      <View style={{ flex: 1, flexDirection: "row" }}>

        {/* ══ LEFT PANEL ══ */}
        <View style={{ width: 96, backgroundColor: "#0B0B0E", borderRightWidth: 1, borderRightColor: "rgba(245,244,238,0.07)" }}>

          <ScrollView ref={leftScrollRef} showsVerticalScrollIndicator={false}>
            {LEFT_ITEMS.map((item, i) => {
              if (item.type === "header") {
                // ── GROUP CHIP ──
                const color = GROUP_COLORS[item.group] ?? "#9CA3AF";
                const dark  = needsDarkText(color);
                return (
                  <View key={`hdr-${i}`} style={{ paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4 }}>
                    <View style={{ backgroundColor: color, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}>
                      <Text style={{
                        color: dark ? "rgba(0,0,0,0.7)" : "#fff",
                        fontSize: 9, fontWeight: "800", letterSpacing: 1,
                        textTransform: "uppercase",
                      }}>
                        {t("album.group", { letter: item.group })}
                      </Text>
                    </View>
                  </View>
                );
              }

              // ── SECTION ITEM ──
              const { section } = item;
              const sOwned  = section.stickers.filter((s) => ownedSet.has(s.id)).length;
              const sPct    = Math.round((sOwned / section.stickers.length) * 100);
              const isActive = section.id === activeSectionId;
              const iso     = FIFA_TO_ISO[section.id];
              const color   = SECTION_COLOR_MAP.get(section.id) ?? "#9CA3AF";

              return (
                <TouchableOpacity
                  key={section.id}
                  onLayout={(e) => {
                    const y = e.nativeEvent.layout.y;
                    leftItemYRef.current.set(section.id, y);
                    scrollLeftTo(section.id, y);
                  }}
                  onPress={() => handleSelectSection(section)}
                  style={{
                    paddingHorizontal: 8, paddingVertical: 8,
                    backgroundColor: isActive ? "rgba(245,244,238,0.06)" : "transparent",
                    borderLeftWidth: isActive ? 2 : 0,
                    borderLeftColor: color,
                  }}
                  activeOpacity={0.7}
                >
                  {/* Flag + section ID */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    {iso ? (
                      <Image
                        source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
                        style={{ width: 22, height: 15, borderRadius: 2 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 14 }}>{section.emoji}</Text>
                    )}
                    <Text style={{
                      color: isActive ? "#F5F4EE" : "rgba(245,244,238,0.55)",
                      fontSize: 11, fontWeight: "700", flex: 1,
                    }} numberOfLines={1}>
                      {section.id === "FWC" ? "FWC" : section.id}
                    </Text>
                  </View>

                  {/* Mini progress bar */}
                  <View style={{ height: 2, backgroundColor: "rgba(245,244,238,0.1)", borderRadius: 99, marginTop: 5, overflow: "hidden" }}>
                    <View style={{ height: 2, backgroundColor: color, borderRadius: 99, width: `${sPct}%` }} />
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* ══ RIGHT PANEL ══ */}
        <View
          style={{ flex: 1 }}
          onLayout={(e) => { rightPanelHeight.current = e.nativeEvent.layout.height; }}
        >
          {!collectionLoaded ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color="#F4C430" />
            </View>
          ) : (
            <FlatList
              ref={rightListRef}
              data={displayItems}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              getItemLayout={activeFilter === "all" ? getItemLayout : undefined}
              contentContainerStyle={{ paddingTop: PADDING_TOP, paddingBottom: 120 }}
              windowSize={5}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              scrollEventThrottle={100}
            />
          )}
        </View>

      </View>

      {/* ── Filter Modal (Fix 2) ── */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setFilterVisible(false)}
        />
        <View style={{
          backgroundColor: "#15161B",
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32,
        }}>
          {/* Handle */}
          <View style={{
            width: 36, height: 4, borderRadius: 99,
            backgroundColor: "rgba(245,244,238,0.15)",
            alignSelf: "center", marginBottom: 20,
          }} />

          <Text style={{
            color: "rgba(245,244,238,0.38)", fontSize: 11,
            fontWeight: "700", letterSpacing: 1.2, marginBottom: 14,
          }}>
            FILTRAR POSTALES
          </Text>

          {([
            { key: "all",      label: "Todas",     count: total },
            { key: "owned",    label: "Tengo",     count: owned },
            { key: "missing",  label: "Faltan",    count: missing },
            { key: "repeated", label: "Repetidas", count: repeatedCount },
          ] as { key: FilterType; label: string; count: number }[]).map(({ key, label, count }) => {
            const isActive = activeFilter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => { setActiveFilter(key); setFilterVisible(false); }}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: isActive ? "rgba(244,196,48,0.1)" : "transparent",
                  borderWidth: 1,
                  borderColor: isActive ? "#F4C430" : "rgba(245,244,238,0.08)",
                  borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                  marginBottom: 8,
                }}
              >
                <Text style={{
                  flex: 1, color: isActive ? "#F4C430" : "#F5F4EE",
                  fontSize: 15, fontWeight: "600",
                }}>
                  {label}
                </Text>
                <Text style={{
                  color: isActive ? "#F4C430" : "rgba(245,244,238,0.38)",
                  fontSize: 13, fontWeight: "700",
                }}>
                  {count}
                </Text>
                {isActive && (
                  <FontAwesome name="check" size={12} color="#F4C430" style={{ marginLeft: 10 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}
