import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, FlatList,
  TouchableOpacity, Image, ActivityIndicator, StatusBar,
  NativeSyntheticEvent, NativeScrollEvent, Modal, Pressable, Share,
  Alert, ActionSheetIOS, Platform,
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
import { WORLD_CUP_2026, TEAM_GROUP, FIFA_TO_ISO, CC_STICKER_IDS } from "@/lib/data/world-cup-2026";
import { getSectionName } from "@/lib/data/sectionNames";
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
  | { type: "header"; sectionId: string; section: AlbumSection; emptyLabel?: string; showCompleted?: boolean }
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
    if (section.id === "CC") {
      items.push({ type: "header", group: "CC" });
      items.push({ type: "section", section });
      continue;
    }
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

const SectionHeader = React.memo(({ section, emptyLabel, showCompleted }: {
  section: AlbumSection;
  emptyLabel?: string;
  showCompleted?: boolean;
}) => {
  const { t, i18n } = useTranslation();
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
  const isCC  = section.id === "CC";
  const subtitle = isFWC
    ? `${t("resumen.fwcName")} · ${total}`
    : isCC
    ? `Sección CC · ${total}`
    : (() => {
        const group = TEAM_GROUP[section.id];
        return group ? t("album.group", { letter: group }) : getSectionName(section.id, i18n.language, section.name);
      })();

  const isComplete = ownedCount >= total;

  function handleContextMenu() {
    const ids = section.stickers.map((s) => s.id);
    const options = ["Marcar todo", "Desmarcar todo", "Limpiar repetidas", "Cancelar"];
    const cancelIndex = 3;

    function runAction(index: number) {
      const store = useCollectionStore.getState();
      if (index === 0) {
        // Mark all
        store.bulkOwn(ids);
        _scheduleSaveRef.current();
      } else if (index === 1) {
        // Unmark all — remove these IDs from owned
        const col = store.collection;
        if (!col) return;
        const newOwned = col.owned.filter((id) => !ids.includes(id));
        store.setCollection({ ...col, owned: newOwned });
        _scheduleSaveRef.current();
      } else if (index === 2) {
        // Clear duplicates for this section
        const col = store.collection;
        if (!col) return;
        const newDuplicates = { ...col.duplicates };
        for (const id of ids) delete newDuplicates[id];
        store.setCollection({ ...col, duplicates: newDuplicates });
        _scheduleSaveRef.current();
      }
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, title: getSectionName(section.id, i18n.language, section.name) },
        runAction
      );
    } else {
      Alert.alert(getSectionName(section.id, i18n.language, section.name), undefined, [
        { text: "Marcar todo",      onPress: () => runAction(0) },
        { text: "Desmarcar todo",   onPress: () => runAction(1) },
        { text: "Limpiar repetidas", onPress: () => runAction(2) },
        { text: "Cancelar", style: "cancel" },
      ]);
    }
  }

  const isEmpty = !!emptyLabel;

  return (
    <View
      style={{
        height: SECTION_HEADER_HEIGHT,
        backgroundColor: color,
        flexDirection: "row", alignItems: "center", paddingHorizontal: 12,
        opacity: isEmpty ? 0.45 : 1,
      }}
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

      {/* Name + subtitle / emptyLabel / completado */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: textMain, fontSize: 15, fontWeight: "700", lineHeight: 19 }} numberOfLines={1}>
          {getSectionName(section.id, i18n.language, section.name)}
        </Text>
        <Text style={{ color: isEmpty ? textSub : showCompleted ? "#4ADE80" : textSub, fontSize: 11, fontWeight: "500" }}>
          {isEmpty ? emptyLabel : showCompleted ? "Completado ✓" : subtitle}
        </Text>
      </View>

      {/* Count */}
      <Text style={{ color: textSub, fontSize: 13, fontWeight: "600" }}>
        {ownedCount}/{total}
      </Text>

      {/* Context menu button (3 dots) */}
      <TouchableOpacity
        onPress={handleContextMenu}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          marginLeft: 10,
          backgroundColor: "rgba(0,0,0,0.18)",
          borderRadius: 6,
          paddingHorizontal: 7, paddingVertical: 4,
        }}
      >
        <FontAwesome name="ellipsis-h" size={13} color={textSub} />
      </TouchableOpacity>
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language ?? "es";
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
  const activeFilterRef = useRef<FilterType>("all");
  useEffect(() => { activeFilterRef.current = activeFilter; }, [activeFilter]);
  const [filterVisible, setFilterVisible] = useState(false);

  // ── Share list state ──────────────────────────────────────────────
  const [shareVisible, setShareVisible] = useState(false);
  const [shareOwned, setShareOwned] = useState(false);
  const [shareMissing, setShareMissing] = useState(false);
  const [shareRepeated, setShareRepeated] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  const [activeSectionId, setActiveSectionId] = useState(fwcSection.id);
  const activeSectionIdRef = useRef(fwcSection.id);

  // ── Fix 4: scroll to section from Resumen ──
  const { scrollTo, filter: filterParam } = useLocalSearchParams<{ scrollTo?: string; filter?: string }>();
  useEffect(() => {
    if (!scrollTo || !collectionLoaded) return;
    if (scrollTo === "FWC") {
      handleSelectSection(fwcSection);
      return;
    }
    if (scrollTo === "CC") {
      const ccSec = WORLD_CUP_2026.sections.find((s) => s.id === "CC");
      if (ccSec) handleSelectSection(ccSec);
      return;
    }
    const first = WORLD_CUP_2026.sections.find((s) => TEAM_GROUP[s.id] === scrollTo);
    if (first) handleSelectSection(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTo, collectionLoaded]);

  // ── Filter from Resumen stats tap ──
  const [filterToast, setFilterToast] = useState<string | null>(null);
  const filterToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!filterParam || !collectionLoaded) return;
    const valid: FilterType[] = ["owned", "missing", "repeated"];
    if (!valid.includes(filterParam as FilterType)) return;
    setActiveFilter(filterParam as FilterType);
    // Show tooltip
    if (filterToastTimer.current) clearTimeout(filterToastTimer.current);
    setFilterToast(filterParam);
    filterToastTimer.current = setTimeout(() => setFilterToast(null), 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParam, collectionLoaded]);

  const rightListRef = useRef<FlatList<FlatItem>>(null);
  const rightPanelHeight = useRef(0);
  const leftScrollRef = useRef<ScrollView>(null);
  const leftItemYRef = useRef(new Map<string, number>());
  const programmaticTarget = useRef<string | null>(null);
  const leftScrollAnimated = useRef(false);

  const total = WORLD_CUP_2026.totalStickers; // 980, CC excluded
  // Exclude CC stickers from main album stats
  const ownedMain = useMemo(
    () => [...ownedSet].filter((id) => !CC_STICKER_IDS.has(id)).length,
    [ownedSet]
  );
  const missing = total - ownedMain;
  const repeatedCount = Object.values(duplicates).reduce((sum, n) => sum + Math.max(0, n), 0);

  // ── Share text (pre-computed, grouped by section) ────────────────
  const shareText = useMemo(() => {
    // Returns lines like "Mexico 🦅: MEX1, MEX5" for each section that has matches
    function groupBySection(stickers: { id: string; sectionId: string }[]): string[] {
      const lines: string[] = [];
      for (const section of WORLD_CUP_2026.sections) {
        const ids = stickers.filter((s) => s.sectionId === section.id).map((s) => s.id);
        if (ids.length === 0) continue;
        lines.push(`${getSectionName(section.id, lang, section.name)} ${section.emoji}: ${ids.join(", ")}`);
      }
      return lines;
    }

    const allStickers = WORLD_CUP_2026.sections.flatMap((s) => s.stickers);
    const mainStickers = allStickers.filter((s) => !CC_STICKER_IDS.has(s.id));
    const parts: string[] = [];
    parts.push(lang === "es" ? "Mi Álbum 2026 ⚽" : "My 2026 Album ⚽");
    parts.push("");
    if (shareRepeated) {
      const matched = allStickers.filter((s) => (duplicates[s.id] ?? 0) > 0);
      parts.push(lang === "es" ? `🔁 REPETIDAS (${matched.length})` : `🔁 DUPLICATES (${matched.length})`);
      parts.push(...groupBySection(matched));
      parts.push("");
    }
    if (shareMissing) {
      const matched = mainStickers.filter((s) => !ownedSet.has(s.id));
      parts.push(lang === "es" ? `❌ ME FALTAN (${matched.length})` : `❌ MISSING (${matched.length})`);
      parts.push(...groupBySection(matched));
      parts.push("");
    }
    if (shareOwned) {
      const matched = allStickers.filter((s) => ownedSet.has(s.id));
      parts.push(lang === "es" ? `✅ TENGO (${matched.length})` : `✅ HAVE (${matched.length})`);
      parts.push(...groupBySection(matched));
      parts.push("");
    }
    parts.push(lang === "es" ? "🌐 elalbum2026.com" : "🌐 elalbum2026.com");
    return parts.join("\n").trim();
  }, [shareOwned, shareMissing, shareRepeated, ownedSet, duplicates, lang]);

  async function handleShareList() {
    if (!shareOwned && !shareMissing && !shareRepeated) return;
    setIsSharing(true);
    try {
      await Share.share({ message: shareText });
    } finally {
      setIsSharing(false);
      setShareVisible(false);
    }
  }

  // ── Filtered flat items (Fix 2) ───────────────────────────────────────
  const displayItems = useMemo<FlatItem[]>(() => {
    if (activeFilter === "all") return FLAT_ITEMS;

    const emptyLabelFor = (section: AlbumSection): string => {
      const total = section.stickers.length;
      const owned = section.stickers.filter((s) => ownedSet.has(s.id)).length;
      if (activeFilter === "owned")    return "Te faltan todas";
      if (activeFilter === "missing")  return owned >= total ? "Completado ✓" : "Sin resultados";
      if (activeFilter === "repeated") return "Sin repetidas";
      return "";
    };

    const items: FlatItem[] = [];
    for (const section of WORLD_CUP_2026.sections) {
      const filtered = section.stickers.filter((s) => {
        if (activeFilter === "owned")    return ownedSet.has(s.id);
        if (activeFilter === "missing")  return !ownedSet.has(s.id);
        if (activeFilter === "repeated") return (duplicates[s.id] ?? 0) > 0;
        return true;
      });
      if (filtered.length === 0) {
        // Always show the header, but mark it as empty with a descriptive label
        items.push({ type: "header", sectionId: section.id, section, emptyLabel: emptyLabelFor(section) });
      } else {
        const isComplete = filtered.length === section.stickers.length && activeFilter === "owned";
        items.push({ type: "header", sectionId: section.id, section, showCompleted: isComplete });
        for (let i = 0; i < filtered.length; i += STICKERS_PER_ROW)
          items.push({ type: "row", sectionId: section.id, stickers: filtered.slice(i, i + STICKERS_PER_ROW) });
      }
    }
    return items;
  }, [activeFilter, ownedSet, duplicates]);

  // Pre-compute section start/end bounds for filtered view — used by handleScroll
  const filteredBoundsRef = useRef<{ sectionId: string; start: number; end: number }[]>([]);
  useEffect(() => {
    if (activeFilter === "all") { filteredBoundsRef.current = []; return; }
    const bounds: { sectionId: string; start: number; end: number }[] = [];
    let cum = PADDING_TOP;
    let currentSection: { sectionId: string; start: number } | null = null;
    for (const item of displayItems) {
      if (item.type === "header") {
        if (currentSection) bounds.push({ ...currentSection, end: cum });
        currentSection = { sectionId: item.sectionId, start: cum };
      }
      cum += item.type === "header" ? SECTION_HEADER_HEIGHT : ROW_HEIGHT;
    }
    if (currentSection) bounds.push({ ...currentSection, end: cum });
    filteredBoundsRef.current = bounds;
  }, [activeFilter, displayItems]);

  const pct = total > 0 ? Math.round((ownedMain / total) * 100) : 0;

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
    programmaticTarget.current = section.id;

    let scrollOffset: number;
    if (activeFilter === "all") {
      // Use pre-computed offsets for the full unfiltered list
      const idx = SECTION_FIRST_IDX.get(section.id) ?? 0;
      const offsets = showAdsRef.current ? FLAT_OFFSETS_ADS : FLAT_OFFSETS_FREE;
      scrollOffset = offsets[idx] ?? 0;
    } else {
      // Compute offset dynamically from the filtered list (no ads in filtered view)
      let cum = PADDING_TOP;
      scrollOffset = 0;
      for (const item of displayItems) {
        if (item.type === "header" && item.sectionId === section.id) {
          scrollOffset = cum;
          break;
        }
        cum += item.type === "header" ? SECTION_HEADER_HEIGHT : ROW_HEIGHT;
      }
    }

    rightListRef.current?.scrollToOffset({ offset: scrollOffset, animated: true });
    setTimeout(() => { programmaticTarget.current = null; }, 1500);
  }

  // Reset to top when filter changes — avoids stale scroll position + wrong sidebar highlight
  useEffect(() => {
    rightListRef.current?.scrollToOffset({ offset: 0, animated: false });
    updateActive(WORLD_CUP_2026.sections[0].id);
  }, [activeFilter]);

  const handleScrollBeginDrag = useCallback(() => {
    programmaticTarget.current = null;
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmaticTarget.current !== null) return;
    const scrollY = e.nativeEvent.contentOffset.y;
    const viewH = rightPanelHeight.current > 0 ? rightPanelHeight.current : ROW_HEIGHT * 6;
    if (activeFilterRef.current !== "all") {
      // Use dynamically computed bounds for filtered views
      const sectionId = sectionWithMostPixels(scrollY, viewH, filteredBoundsRef.current);
      if (sectionId) updateActive(sectionId, true);
      return;
    }
    const bounds = showAdsRef.current ? SECTION_BOUNDS_ADS : SECTION_BOUNDS_FREE;
    updateActive(sectionWithMostPixels(scrollY, viewH, bounds), true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FlatItem }) => {
      if (item.type === "header") return <SectionHeader section={item.section} emptyLabel={item.emptyLabel} showCompleted={item.showCompleted} />;
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

  // Pre-compute per-index layout for filtered views (needed for correct scrollToOffset)
  const filteredItemOffsets = useMemo<number[] | null>(() => {
    if (activeFilter === "all") return null;
    const offsets: number[] = [];
    let cum = PADDING_TOP;
    for (const item of displayItems) {
      offsets.push(cum);
      cum += item.type === "header" ? SECTION_HEADER_HEIGHT : ROW_HEIGHT;
    }
    return offsets;
  }, [activeFilter, displayItems]);

  const getFilteredItemLayout = useCallback((_: unknown, index: number) => {
    const item = displayItems[index];
    const length = item?.type === "header" ? SECTION_HEADER_HEIGHT : ROW_HEIGHT;
    const offset = filteredItemOffsets?.[index] ?? 0;
    return { length, offset, index };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItemOffsets]);

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
          <Text style={{ color: "#F5F4EE", fontSize: 22, fontWeight: "800", lineHeight: 28, marginTop: 1 }} numberOfLines={1}>
            {pct}%
            <Text style={{ color: "rgba(245,244,238,0.38)", fontSize: 12, fontWeight: "600" }}>
              {` · ${ownedMain}/${total}`}
              {repeatedCount > 0 ? ` · Repetidas ${repeatedCount}` : ""}
            </Text>
          </Text>
        </View>
        {/* Share button */}
        <TouchableOpacity
          onPress={() => setShareVisible(true)}
          style={{
            width: 38, height: 38, borderRadius: 12,
            backgroundColor: "#1C1D24",
            alignItems: "center", justifyContent: "center",
            marginRight: 8,
          }}
          activeOpacity={0.7}
        >
          <FontAwesome name="share-alt" size={15} color="rgba(245,244,238,0.55)" />
        </TouchableOpacity>
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
                const label = item.group === "CC" ? "CC" : t("album.group", { letter: item.group });
                return (
                  <View key={`hdr-${i}`} style={{ paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4 }}>
                    <View style={{ backgroundColor: color, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}>
                      <Text style={{
                        color: dark ? "rgba(0,0,0,0.7)" : "#fff",
                        fontSize: 9, fontWeight: "800", letterSpacing: 1,
                        textTransform: "uppercase",
                      }}>
                        {label}
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
              getItemLayout={activeFilter === "all" ? getItemLayout : getFilteredItemLayout}
              contentContainerStyle={{ paddingTop: PADDING_TOP, paddingBottom: 120 }}
              windowSize={5}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={50}
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              scrollEventThrottle={100}
            />
          )}
        </View>

      </View>

      {/* ── Filter Modal ── */}
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
          paddingHorizontal: 20, paddingTop: 16,
          paddingBottom: Math.max(32, insets.bottom + 16),
        }}>
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
            { key: "owned",    label: "Tengo",     count: ownedMain },
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

      {/* ── Share Modal ── */}
      <Modal
        visible={shareVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setShareVisible(false)}
        />
        <View style={{
          backgroundColor: "#15161B",
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          paddingHorizontal: 20, paddingTop: 16,
          paddingBottom: Math.max(36, insets.bottom + 16),
        }}>
          <View style={{
            width: 36, height: 4, borderRadius: 99,
            backgroundColor: "rgba(245,244,238,0.15)",
            alignSelf: "center", marginBottom: 20,
          }} />
          <Text style={{
            color: "rgba(245,244,238,0.38)", fontSize: 11,
            fontWeight: "700", letterSpacing: 1.2, marginBottom: 14,
          }}>
            {lang === "es" ? "COMPARTIR LISTA" : "SHARE LIST"}
          </Text>
          {([
            { label: lang === "es" ? "Repetidas 🔁" : "Duplicates 🔁", value: shareRepeated, set: setShareRepeated },
            { label: lang === "es" ? "Me faltan ❌"  : "Missing ❌",    value: shareMissing,  set: setShareMissing  },
            { label: lang === "es" ? "Tengo ✅"       : "Have ✅",       value: shareOwned,    set: setShareOwned    },
          ]).map(({ label, value, set }) => (
            <TouchableOpacity
              key={label}
              onPress={() => set(!value)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row", alignItems: "center",
                paddingVertical: 14, borderBottomWidth: 1,
                borderBottomColor: "rgba(245,244,238,0.07)",
              }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                borderColor: value ? "#F4C430" : "rgba(245,244,238,0.25)",
                backgroundColor: value ? "#F4C430" : "transparent",
                alignItems: "center", justifyContent: "center", marginRight: 12,
              }}>
                {value && <FontAwesome name="check" size={12} color="#0B0B0E" />}
              </View>
              <Text style={{ color: "#F5F4EE", fontSize: 15, fontWeight: "500", flex: 1 }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={handleShareList}
            disabled={isSharing || (!shareOwned && !shareMissing && !shareRepeated)}
            activeOpacity={0.75}
            style={{
              marginTop: 20, borderRadius: 14, paddingVertical: 14, alignItems: "center",
              backgroundColor: (shareOwned || shareMissing || shareRepeated) ? "#F4C430" : "rgba(245,244,238,0.1)",
            }}
          >
            {isSharing
              ? <ActivityIndicator color="#0B0B0E" />
              : <Text style={{
                  color: (shareOwned || shareMissing || shareRepeated) ? "#0B0B0E" : "rgba(245,244,238,0.25)",
                  fontSize: 15, fontWeight: "800",
                }}>
                  {lang === "es" ? "Compartir lista 📤" : "Share list 📤"}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Filter toast — shown for 3s after navigating from Resumen stats ── */}
      {filterToast && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 60,
            left: 0, right: 0,
            alignItems: "center",
            zIndex: 200,
            pointerEvents: "none",
          }}
        >
          <View style={{
            backgroundColor: "#F2853A",
            borderRadius: 20,
            paddingHorizontal: 18, paddingVertical: 9,
          }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              {filterToast === "repeated"
                ? t("album.filterRepeated")
                : filterToast === "owned"
                ? t("album.filterOwned")
                : t("album.filterMissing")}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
