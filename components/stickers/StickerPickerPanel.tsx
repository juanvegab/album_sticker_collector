import { useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
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
const GREEN    = "#22C55E";
const ORANGE   = "#F2853A";
const TEAL     = "#14B8A6";

interface PoolSection {
  sectionId: string;
  name: string;
  data: AlbumSticker[];
}

type LeftItem =
  | { type: "header"; label: string }
  | { type: "section"; sectionId: string; name: string; total: number; selectedCount: number; neededCount: number; blockedCount: number };

interface Props {
  pool: AlbumSticker[];
  selected: string[];
  onToggle: (id: string) => void;
  /** IDs the current user is missing — shown with a green "FALTA" badge */
  needed?: Set<string>;
  /** IDs in a pending request (asked, waiting for friend's reply) — orange "EN PEDIDO" badge */
  inFlight?: Set<string>;
  /** IDs confirmed by another friend (accepted, coming in) — teal "CONSEGUIDA" badge */
  secured?: Set<string>;
  /**
   * When true (default), in-flight/secured stickers are NOT toggleable — they're locked.
   * When false, badges are informational only and the user can still select/deselect.
   */
  blockInFlight?: boolean;
  emptyIcon?: string;
  emptyText?: string;
}

export function StickerPickerPanel({ pool, selected, onToggle, needed, inFlight, secured, blockInFlight = true, emptyIcon = "📭", emptyText }: Props) {
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
      neededCount: needed ? s.data.filter((st) => needed.has(st.id)).length : 0,
      blockedCount: s.data.filter((st) => (inFlight?.has(st.id) || secured?.has(st.id)) ?? false).length,
    });
  }

  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.sectionId ?? "");
  const rightScrollRef = useRef<ScrollView>(null);
  // Recorded Y positions from onLayout on each section header
  const sectionYRef = useRef<Map<string, number>>(new Map());

  function handleSelectSection(sectionId: string) {
    setActiveSectionId(sectionId);
    const y = sectionYRef.current.get(sectionId) ?? 0;
    rightScrollRef.current?.scrollTo({ y, animated: true });
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
                  {item.selectedCount > 0 ? (
                    <View style={{
                      backgroundColor: BRAND, borderRadius: 99,
                      minWidth: 16, height: 16, paddingHorizontal: 3,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ color: BG, fontSize: 9, fontWeight: "800" }}>{item.selectedCount}</Text>
                    </View>
                  ) : item.neededCount > 0 ? (
                    <View style={{
                      backgroundColor: "rgba(34,197,94,0.2)", borderRadius: 99,
                      minWidth: 16, height: 16, paddingHorizontal: 3,
                      alignItems: "center", justifyContent: "center",
                      borderWidth: 1, borderColor: GREEN,
                    }}>
                      <Text style={{ color: GREEN, fontSize: 9, fontWeight: "800" }}>{item.neededCount}</Text>
                    </View>
                  ) : item.blockedCount > 0 ? (
                    <View style={{
                      backgroundColor: "rgba(242,133,58,0.2)", borderRadius: 99,
                      minWidth: 16, height: 16, paddingHorizontal: 3,
                      alignItems: "center", justifyContent: "center",
                      borderWidth: 1, borderColor: ORANGE,
                    }}>
                      <Text style={{ color: ORANGE, fontSize: 9, fontWeight: "800" }}>{item.blockedCount}</Text>
                    </View>
                  ) : null}
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

      {/* Right sticker list — ScrollView + onLayout for reliable scrollTo */}
      <ScrollView
        ref={rightScrollRef}
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 6 }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => {
          const iso = FIFA_TO_ISO[section.sectionId];
          const selCount = section.data.filter((s) => selected.includes(s.id)).length;
          return (
            <View
              key={section.sectionId}
              onLayout={(e) => sectionYRef.current.set(section.sectionId, e.nativeEvent.layout.y)}
            >
              {/* Section header */}
              <View
                style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: ELEVATED,
                  paddingVertical: 8, paddingHorizontal: 10,
                  borderBottomWidth: 1, borderBottomColor: DIM3,
                  marginBottom: 6,
                }}
              >
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

              {/* Sticker items */}
              {section.data.map((sticker) => {
                const isSelected  = selected.includes(sticker.id);
                const isNeeded    = needed?.has(sticker.id) ?? false;
                const isSecured   = secured?.has(sticker.id) ?? false;
                const isInFlight  = !isSecured && (inFlight?.has(sticker.id) ?? false);
                // "Hard blocked" = in-flight/secured AND blockInFlight mode
                const isHardBlock = blockInFlight && (isSecured || isInFlight);

                return (
                  <TouchableOpacity
                    key={sticker.id}
                    onPress={() => { if (!isHardBlock) onToggle(sticker.id); }}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      borderRadius: 12, marginBottom: 6,
                      paddingHorizontal: 12, paddingVertical: 12,
                      opacity: isHardBlock ? 0.55 : 1,
                      backgroundColor: isSelected
                        ? "rgba(244,196,48,0.10)"
                        : isSecured  ? "rgba(20,184,166,0.06)"
                        : isInFlight ? "rgba(242,133,58,0.06)"
                        : isNeeded   ? "rgba(34,197,94,0.06)"
                        : SURFACE,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? BRAND
                        : isSecured  ? "rgba(20,184,166,0.35)"
                        : isInFlight ? "rgba(242,133,58,0.35)"
                        : isNeeded   ? "rgba(34,197,94,0.35)"
                        : DIM3,
                    }}
                    activeOpacity={isHardBlock ? 1 : 0.7}
                  >
                    <View style={{
                      width: 20, height: 20, borderRadius: 4,
                      borderWidth: 2,
                      backgroundColor: isSelected ? BRAND : "transparent",
                      borderColor: isSelected
                        ? BRAND
                        : isSecured  ? TEAL
                        : isInFlight ? ORANGE
                        : isNeeded   ? GREEN
                        : DIM,
                      marginRight: 10,
                      alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {isSelected && (
                        <Text style={{ color: BG, fontSize: 10, fontWeight: "800" }}>✓</Text>
                      )}
                      {isSecured && !isSelected && blockInFlight && (
                        <Text style={{ color: TEAL, fontSize: 10, fontWeight: "800" }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ color: DIM, fontSize: 11, width: 52 }} numberOfLines={1}>{sticker.id}</Text>
                    <Text style={{
                      color: isHardBlock ? DIM : INK,
                      fontSize: 13, flex: 1,
                    }} numberOfLines={1}>
                      {sticker.name}
                    </Text>
                    {/* Badges — shown whether or not blocking is active */}
                    {isSecured && !isSelected && (
                      <View style={{
                        backgroundColor: "rgba(20,184,166,0.15)",
                        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                        marginLeft: 6,
                      }}>
                        <Text style={{ color: TEAL, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>
                          CONSEGUIDA
                        </Text>
                      </View>
                    )}
                    {isInFlight && !isSelected && (
                      <View style={{
                        backgroundColor: "rgba(242,133,58,0.15)",
                        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                        marginLeft: 6,
                      }}>
                        <Text style={{ color: ORANGE, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>
                          EN PEDIDO
                        </Text>
                      </View>
                    )}
                    {isNeeded && !isSelected && !isSecured && !isInFlight && (
                      <View style={{
                        backgroundColor: "rgba(34,197,94,0.15)",
                        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                        marginLeft: 6,
                      }}>
                        <Text style={{ color: GREEN, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>
                          FALTA
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}
