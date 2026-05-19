import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useCollectionStore } from "@/store/collectionStore";
import { needsDarkText } from "@/lib/design/groupColors";
import type { AlbumSticker } from "@/types/album";

interface Props {
  sticker: AlbumSticker;
  sectionColor: string;           // pre-computed by album screen
  onToggle: (id: string) => void;
  onSetDups: (id: string, count: number) => void;
}

export const StickerCard = React.memo(({ sticker, sectionColor, onToggle, onSetDups }: Props) => {
  const count = useCollectionStore(
    useCallback(
      (state) => {
        const coll = state.collection;
        if (!coll) return 0;
        const owned = coll.owned.includes(sticker.id);
        const dups = coll.duplicates?.[sticker.id] ?? 0;
        return owned ? 1 + dups : 0;
      },
      [sticker.id]
    )
  );

  const isOwned = count > 0;
  const dups = Math.max(0, count - 1);
  const dark = needsDarkText(sectionColor);

  const handleCardPress = useCallback(() => {
    if (isOwned) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(sticker.id);
  }, [isOwned, sticker.id, onToggle]);

  const handleIncrement = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSetDups(sticker.id, dups + 1);
  }, [dups, sticker.id, onSetDups]);

  const handleDecrement = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (dups > 0) onSetDups(sticker.id, dups - 1);
    else onToggle(sticker.id);
  }, [dups, sticker.id, onToggle, onSetDups]);

  // ── Derived colors ───────────────────────────────────────────────────
  // count=0: dark card, section-colored badge
  // count=1: section-colored card (tengo)
  // count≥2: orange card — "duplicate" token #F2853A (semánticamente correcto)
  const DUP_COLOR = "#F2853A"; // duplicate design token — distinct from all group colors now that F=#10B981
  const cardBg    = count === 0 ? "#15161B" : count === 1 ? sectionColor : DUP_COLOR;
  const darkCard  = count === 1 ? dark : false;           // orange is always light-text-friendly
  const badgeBg       = count === 0 ? sectionColor        : "rgba(0,0,0,0.2)";
  const badgeText     = count === 0 ? (dark ? "#0B0B0E" : "#fff") : (darkCard ? "rgba(0,0,0,0.65)" : "#fff");
  const codeColor     = count === 0 ? "rgba(245,244,238,0.35)" : (darkCard ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)");
  const btnBg         = count === 0 ? "rgba(245,244,238,0.1)" : "rgba(0,0,0,0.18)";
  const btnText       = count === 0 ? "rgba(245,244,238,0.55)" : (darkCard ? "rgba(0,0,0,0.65)" : "#fff");
  const dupBadgeBg    = count === 0 ? "rgba(245,244,238,0.12)" : "rgba(0,0,0,0.35)";
  const dupBadgeText  = count === 0 ? "rgba(245,244,238,0.55)" : (darkCard ? "rgba(0,0,0,0.7)" : "#fff");

  return (
    <TouchableOpacity
      style={{
        flex: 1,
        margin: 3,
        borderRadius: 12,
        backgroundColor: cardBg,
        // dashed border when not owned
        ...(isOwned ? {} : {
          borderWidth: 1,
          borderColor: "rgba(245,244,238,0.13)",
          borderStyle: Platform.OS === "ios" ? "dashed" : "solid",
        }),
      }}
      onPress={handleCardPress}
      activeOpacity={isOwned ? 1 : 0.7}
    >
      {/* ── TOP: section badge + dup count ── */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 7 }}>
        {/* Section badge */}
        <View style={{
          backgroundColor: badgeBg,
          borderRadius: 5,
          paddingHorizontal: 5,
          paddingVertical: 2,
        }}>
          <Text style={{ color: badgeText, fontSize: 9, fontWeight: "800", letterSpacing: 0.3 }}>
            {sticker.sectionId}
          </Text>
        </View>

        {/* Duplicate count badge — only when count ≥ 2 */}
        {count >= 2 && (
          <View style={{
            backgroundColor: dupBadgeBg,
            borderRadius: 99,
            minWidth: 20, height: 20,
            paddingHorizontal: 4,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: dupBadgeText, fontSize: 9, fontWeight: "800" }}>
              ×{count}
            </Text>
          </View>
        )}
      </View>

      {/* ── CENTER: sticker code — always centered, never hidden ── */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
        <Text
          style={{ color: codeColor, fontSize: 12, fontWeight: "700", letterSpacing: 0.2 }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {sticker.id}
        </Text>
      </View>

      {/* ── BOTTOM: toggle (owned) or spacer (not owned) ── */}
      {isOwned ? (
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 7,
          paddingBottom: 7,
        }}>
          <TouchableOpacity
            onPress={handleDecrement}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 6 }}
            style={{
              width: 26, height: 26, borderRadius: 13,
              backgroundColor: btnBg,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: btnText, fontSize: 18, fontWeight: "800", lineHeight: 22 }}>−</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleIncrement}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 10 }}
            style={{
              width: 26, height: 26, borderRadius: 13,
              backgroundColor: btnBg,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: btnText, fontSize: 18, fontWeight: "800", lineHeight: 22 }}>+</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ height: 40 }} />
      )}
    </TouchableOpacity>
  );
});
