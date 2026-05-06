import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useCollection } from "@/hooks/useCollection";
import { useCollectionStore } from "@/store/collectionStore";
import { StickerCard } from "@/components/stickers/StickerCard";
import { NativeAdCard, AD_HEIGHT } from "@/components/ads/NativeAdCard";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { TrialBanner } from "@/components/premium/TrialBanner";
import { WORLD_CUP_2026, TEAM_GROUP, FIFA_TO_ISO } from "@/lib/data/world-cup-2026";
import { usePremiumStore } from "@/store/premiumStore";
import type { AlbumSection, AlbumSticker } from "@/types/album";

// ── Layout constants (must match rendered heights exactly) ────────────
const SECTION_HEADER_HEIGHT = 43;
const ROW_HEIGHT = 96;
const PADDING_TOP = 6;

// ── Flat item list for the right panel ───────────────────────────────
type FlatItem =
  | { type: "header"; sectionId: string; section: AlbumSection }
  | { type: "row"; sectionId: string; stickers: AlbumSticker[] }
  | { type: "ad"; sectionId: string; adIndex: number };

const FLAT_ITEMS: FlatItem[] = [];
const SECTION_FIRST_IDX = new Map<string, number>();
let _adCounter = 0;

for (const section of WORLD_CUP_2026.sections) {
  SECTION_FIRST_IDX.set(section.id, FLAT_ITEMS.length);
  FLAT_ITEMS.push({ type: "header", sectionId: section.id, section });
  // Native ad injected right after each section header
  FLAT_ITEMS.push({ type: "ad", sectionId: section.id, adIndex: _adCounter++ });
  for (let i = 0; i < section.stickers.length; i += 2) {
    FLAT_ITEMS.push({
      type: "row",
      sectionId: section.id,
      stickers: section.stickers.slice(i, i + 2),
    });
  }
}

// Pre-computed cumulative offsets — two variants: with ads (non-premium) and without ads (trial/premium).
// NativeAdCard renders null (0px) when showAds() is false, so offsets diverge per ad item.
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
      const end =
        j < FLAT_ITEMS.length ? offsets[j] : offsets[FLAT_ITEMS.length - 1] + ROW_HEIGHT;
      bounds.push({ sectionId: FLAT_ITEMS[i].sectionId, start: offsets[i], end });
    }
  }
  return { offsets, bounds };
}

const { offsets: FLAT_OFFSETS_ADS, bounds: SECTION_BOUNDS_ADS } = buildOffsets(AD_HEIGHT);
const { offsets: FLAT_OFFSETS_FREE, bounds: SECTION_BOUNDS_FREE } = buildOffsets(0);

// Returns the section occupying the most pixels in [scrollY, scrollY+viewH].
function sectionWithMostPixels(scrollY: number, viewH: number, bounds: SectionBound[]): string {
  const vpTop = scrollY;
  const vpBottom = scrollY + Math.max(viewH, 1);
  let bestId = bounds[0].sectionId;
  let bestPx = -1;
  for (const { sectionId, start, end } of bounds) {
    if (start >= vpBottom) break;
    if (end <= vpTop) continue;
    const px = Math.min(vpBottom, end) - Math.max(vpTop, start);
    if (px > bestPx) {
      bestPx = px;
      bestId = sectionId;
    }
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

// ── Memoized sub-components ───────────────────────────────────────────

/**
 * Section header — reads its own owned-count from the Zustand store so the
 * parent's renderItem doesn't need ownedSet in scope.
 */
const SectionHeader = React.memo(({ section }: { section: AlbumSection }) => {
  const ownedCount = useCollectionStore(
    useCallback(
      (state) => {
        const owned = state.collection?.owned ?? [];
        return section.stickers.filter((s) => owned.includes(s.id)).length;
      },
      // section is module-level static data — reference is stable
      [section]
    )
  );

  const iso = FIFA_TO_ISO[section.id];
  const total = section.stickers.length;

  return (
    <View
      style={{ height: SECTION_HEADER_HEIGHT }}
      className="flex-row items-center bg-gray-100 px-3 border-b border-gray-200"
    >
      {iso ? (
        <Image
          source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
          style={{ width: 28, height: 19, borderRadius: 2, marginRight: 7 }}
          resizeMode="cover"
        />
      ) : (
        <Text className="text-lg mr-2">{section.emoji}</Text>
      )}
      <Text className="text-sm font-bold text-gray-800 flex-1" numberOfLines={1}>
        {section.name}
      </Text>
      <Text className="text-xs text-gray-500">
        {ownedCount}/{total} · {Math.round((ownedCount / total) * 100)}%
      </Text>
    </View>
  );
});

/**
 * Sticker row — stable props so React.memo inside StickerCard can short-circuit.
 * All state reading is handled inside StickerCard via per-sticker Zustand selectors.
 */
const StickerRow = React.memo(
  ({
    stickers,
    onToggle,
    onSetDups,
  }: {
    stickers: AlbumSticker[];
    onToggle: (id: string) => void;
    onSetDups: (id: string, count: number) => void;
  }) => (
    <View className="flex-row" style={{ height: ROW_HEIGHT }}>
      {stickers.map((sticker) => (
        <StickerCard
          key={sticker.id}
          sticker={sticker}
          onToggle={onToggle}
          onSetDups={onSetDups}
        />
      ))}
      {stickers.length < 2 && <View className="flex-1 m-1" />}
    </View>
  )
);

// ── Screen ────────────────────────────────────────────────────────────
export default function AlbumScreen() {
  const { t } = useTranslation();
  const { ownedSet, toggle, setDuplicates } = useCollection();
  const showAds = usePremiumStore((s) => s.showAds());
  const showAdsRef = useRef(showAds);
  useEffect(() => { showAdsRef.current = showAds; }, [showAds]);

  const [activeSectionId, setActiveSectionId] = useState(fwcSection.id);
  const activeSectionIdRef = useRef(fwcSection.id);

  const rightListRef = useRef<FlatList<FlatItem>>(null);
  const rightPanelHeight = useRef(0);
  const leftScrollRef = useRef<ScrollView>(null);
  const leftItemYRef = useRef(new Map<string, number>());
  const programmaticTarget = useRef<string | null>(null);
  const leftScrollAnimated = useRef(false);

  const total = WORLD_CUP_2026.totalStickers;
  const owned = ownedSet.size;
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

    setTimeout(() => {
      programmaticTarget.current = null;
    }, 1500);
  }

  const handleScrollBeginDrag = useCallback(() => {
    programmaticTarget.current = null;
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmaticTarget.current !== null) return;
    const scrollY = e.nativeEvent.contentOffset.y;
    const viewH = rightPanelHeight.current > 0 ? rightPanelHeight.current : ROW_HEIGHT * 6;
    const bounds = showAdsRef.current ? SECTION_BOUNDS_ADS : SECTION_BOUNDS_FREE;
    const id = sectionWithMostPixels(scrollY, viewH, bounds);
    updateActive(id, true);
  }, []);

  /**
   * renderItem is memoized with stable deps (toggle/setDuplicates never change
   * while logged in). FlatList won't re-render cells just because AlbumScreen
   * re-renders (e.g. when ownedSet changes for the left panel).
   */
  const renderItem = useCallback(
    ({ item }: { item: FlatItem }) => {
      if (item.type === "header") {
        return <SectionHeader section={item.section} />;
      }
      if (item.type === "ad") {
        return <NativeAdCard adIndex={item.adIndex} />;
      }
      return (
        <StickerRow
          stickers={item.stickers}
          onToggle={toggle}
          onSetDups={setDuplicates}
        />
      );
    },
    [toggle, setDuplicates]
  );

  const keyExtractor = useCallback((item: FlatItem, i: number) => {
    if (item.type === "header") return `hdr-${item.sectionId}`;
    if (item.type === "ad") return `ad-${item.sectionId}`;
    return `row-${item.stickers[0].id}-${i}`;
  }, []);

  const getItemLayout = useCallback((_: unknown, index: number) => {
    const item = FLAT_ITEMS[index];
    const ads = showAdsRef.current;
    const length =
      item?.type === "header"
        ? SECTION_HEADER_HEIGHT
        : item?.type === "ad"
        ? (ads ? AD_HEIGHT : 0)
        : ROW_HEIGHT;
    const offsets = ads ? FLAT_OFFSETS_ADS : FLAT_OFFSETS_FREE;
    return { length, offset: offsets[index] ?? 0, index };
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: t("album.title") }} />
      <View className="flex-1 bg-gray-50">

        {/* Global progress banner */}
        <View className="bg-blue-600 px-4 py-3">
          <Text className="text-white text-base font-bold">⚽ FIFA World Cup 2026™</Text>
          <Text className="text-blue-200 text-xs mb-2">
            {owned} / {total} · {pct}%
          </Text>
          <View className="h-2 bg-blue-400 rounded-full overflow-hidden">
            <View className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
          </View>
        </View>

        <TrialBanner />
        <BannerAd />

        <View className="flex-1 flex-row">

          {/* ── Left panel: country list ── */}
          <View style={{ width: 120 }} className="border-r border-gray-200 bg-white">
            <ScrollView ref={leftScrollRef} showsVerticalScrollIndicator={false}>
              {LEFT_ITEMS.map((item, i) => {
                if (item.type === "header") {
                  return (
                    <View key={`hdr-${i}`} className="px-2 pt-3 pb-1">
                      <Text className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                        {t("album.group", { letter: item.group })}
                      </Text>
                    </View>
                  );
                }
                const { section } = item;
                const sOwned = section.stickers.filter((s) => ownedSet.has(s.id)).length;
                const sPct = Math.round((sOwned / section.stickers.length) * 100);
                const isActive = section.id === activeSectionId;
                const iso = FIFA_TO_ISO[section.id];
                return (
                  <TouchableOpacity
                    key={section.id}
                    onLayout={(e) => {
                      const y = e.nativeEvent.layout.y;
                      leftItemYRef.current.set(section.id, y);
                      scrollLeftTo(section.id, y);
                    }}
                    onPress={() => handleSelectSection(section)}
                    className={`px-3 py-3 ${isActive ? "bg-blue-50" : ""}`}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      {iso ? (
                        <Image
                          source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
                          style={{ width: 30, height: 20, borderRadius: 3, marginRight: 7 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-xl mr-1.5">{section.emoji}</Text>
                      )}
                      <Text
                        className={`text-sm font-medium flex-1 ${
                          isActive ? "text-blue-700" : "text-gray-700"
                        }`}
                        numberOfLines={1}
                      >
                        {section.id === "FWC" ? "FWC" : section.id}
                      </Text>
                    </View>
                    <View className="h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                      <View
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${sPct}%` }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View className="h-4" />
            </ScrollView>
          </View>

          {/* ── Right panel: virtualized FlatList ── */}
          <View
            className="flex-1"
            onLayout={(e) => {
              rightPanelHeight.current = e.nativeEvent.layout.height;
            }}
          >
            <FlatList
              ref={rightListRef}
              data={FLAT_ITEMS}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              getItemLayout={getItemLayout}
              contentContainerStyle={{ paddingTop: PADDING_TOP, paddingBottom: 16 }}
              // ── Performance props ──────────────────────────────
              windowSize={5}              // render 2 screens above + 2 below
              initialNumToRender={12}     // enough for ~1 section on first paint
              maxToRenderPerBatch={8}     // items rendered per JS batch
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={true}
              // ──────────────────────────────────────────────────
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              scrollEventThrottle={100}
            />
          </View>

        </View>
      </View>
    </>
  );
}
