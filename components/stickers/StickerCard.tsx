import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
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
    if (!isOwned) onToggle(sticker.id);
  }, [isOwned, sticker.id, onToggle]);

  const handleIncrement = useCallback(() => {
    onSetDups(sticker.id, dups + 1);
  }, [dups, sticker.id, onSetDups]);

  const handleDecrement = useCallback(() => {
    if (dups > 0) onSetDups(sticker.id, dups - 1);
    else onToggle(sticker.id);
  }, [dups, sticker.id, onToggle, onSetDups]);

  // ── Derived colors ───────────────────────────────────────────────────
  // Not owned: dark card, section-colored badge
  // Owned:     section-colored card, dark overlays
  const cardBg        = isOwned ? sectionColor : "#15161B";
  const badgeBg       = isOwned ? "rgba(0,0,0,0.2)"  : sectionColor;
  const badgeText     = isOwned ? (dark ? "rgba(0,0,0,0.65)" : "#fff") : (dark ? "#0B0B0E" : "#fff");
  const codeColor     = isOwned ? (dark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)") : "rgba(245,244,238,0.35)";
  const btnBg         = isOwned ? "rgba(0,0,0,0.18)" : "rgba(245,244,238,0.1)";
  const btnText       = isOwned ? (dark ? "rgba(0,0,0,0.65)" : "#fff") : "rgba(245,244,238,0.55)";
  const dupBadgeBg    = isOwned ? "rgba(0,0,0,0.35)" : "rgba(245,244,238,0.12)";
  const dupBadgeText  = isOwned ? (dark ? "rgba(0,0,0,0.7)" : "#fff") : "rgba(245,244,238,0.55)";

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
          borderStyle: "dashed",
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
