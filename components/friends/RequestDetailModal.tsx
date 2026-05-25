import { useState, useMemo } from "react";
import {
  Modal, View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { StickerRequest } from "@/types/request";
import { useTranslation } from "react-i18next";
import { ALL_STICKERS_MAP, ALBUM_SECTIONS_MAP, WORLD_CUP_2026 } from "@/lib/data/world-cup-2026";
import { getSectionName } from "@/lib/data/sectionNames";

// Section order index for sorting (FWC=0, MEX=1, …)
const SECTION_ORDER = new Map(WORLD_CUP_2026.sections.map((s, i) => [s.id, i]));

function sortStickerIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const sa = ALL_STICKERS_MAP.get(a);
    const sb = ALL_STICKERS_MAP.get(b);
    if (!sa || !sb) return 0;
    const sectionDiff =
      (SECTION_ORDER.get(sa.sectionId) ?? 999) -
      (SECTION_ORDER.get(sb.sectionId) ?? 999);
    if (sectionDiff !== 0) return sectionDiff;
    return sa.number - sb.number;
  });
}

// ── Design tokens ──────────────────────────────────────────────────────
const SURFACE  = "#15161B";
const ELEVATED = "#1C1D24";
const INK      = "#F5F4EE";
const DIM      = "rgba(245,244,238,0.38)";
const DIM3     = "rgba(245,244,238,0.08)";
const GREEN    = "#22C55E";
const ORANGE   = "#F2853A";
const RED      = "#EF4444";

interface Props {
  request: StickerRequest | null;
  /** Label shown in the header (e.g. "Para Juan" / "De Juan") */
  title: string;
  /** Which sticker list to display */
  stickers: string[];
  /** Label above the sticker list */
  stickersLabel: string;
  /** Color accent for the sticker list (green = owned, orange = given) */
  stickersColor?: string;
  /** If provided, a cancel/delete button appears at the bottom */
  onCancel?: () => Promise<void>;
  cancelLabel?: string;
  onClose: () => void;
}

export function RequestDetailModal({
  request,
  title,
  stickers,
  stickersLabel,
  stickersColor = INK,
  onCancel,
  cancelLabel = "Cancelar pedido",
  onClose,
}: Props) {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [cancelling, setCancelling] = useState(false);
  const sortedStickers = useMemo(() => sortStickerIds(stickers), [stickers]);

  if (!request) return null;

  async function handleCancel() {
    if (!onCancel) return;
    Alert.alert(
      "¿Cancelar pedido?",
      "Esta acción no se puede deshacer.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await onCancel();
              onClose();
            } catch {
              Alert.alert("Error", "No se pudo cancelar el pedido.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }

  const dateStr = new Date(request.createdAt).toLocaleDateString("es-AR", {
    day: "numeric", month: "short",
  });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.65)",
        justifyContent: "flex-end",
      }}>
        <View style={{
          backgroundColor: SURFACE,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 20, paddingTop: 18,
          paddingBottom: Math.max(insets.bottom + 16, 32),
        }}>
          {/* Handle bar */}
          <View style={{
            width: 36, height: 4, borderRadius: 2,
            backgroundColor: DIM3, alignSelf: "center", marginBottom: 16,
          }} />

          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: INK, fontSize: 18, fontWeight: "800" }} numberOfLines={1}>
                {title}
              </Text>
              <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }}>
                {dateStr}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <FontAwesome name="times" size={18} color={DIM} />
            </TouchableOpacity>
          </View>

          {/* Sticker count label */}
          <Text style={{
            color: DIM, fontSize: 10, fontWeight: "700",
            letterSpacing: 1.2, marginBottom: 10,
          }}>
            {stickersLabel.toUpperCase()} · {sortedStickers.length}
          </Text>

          {/* Sticker list — grouped by section */}
          <ScrollView
            style={{ maxHeight: 280 }}
            showsVerticalScrollIndicator={false}
          >
            {(() => {
              // Group stickers by sectionId preserving sort order
              const groups: { sectionId: string; ids: string[] }[] = [];
              for (const id of sortedStickers) {
                const sticker = ALL_STICKERS_MAP.get(id);
                if (!sticker) continue;
                const last = groups[groups.length - 1];
                if (last && last.sectionId === sticker.sectionId) {
                  last.ids.push(id);
                } else {
                  groups.push({ sectionId: sticker.sectionId, ids: [id] });
                }
              }
              return groups.map(({ sectionId, ids }) => {
                const section = ALBUM_SECTIONS_MAP.get(sectionId);
                return (
                  <View key={sectionId} style={{ marginBottom: 12 }}>
                    {/* Section header */}
                    <View style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      marginBottom: 6,
                    }}>
                      <Text style={{ fontSize: 16 }}>{section?.emoji ?? "🌍"}</Text>
                      <Text style={{
                        color: DIM, fontSize: 11, fontWeight: "700",
                        letterSpacing: 0.8, textTransform: "uppercase",
                      }}>
                        {getSectionName(sectionId, i18n.language, section?.name ?? sectionId)}
                      </Text>
                    </View>
                    {/* Stickers */}
                    <Text style={{
                      color: stickersColor, fontSize: 13,
                      fontWeight: "600", lineHeight: 20,
                    }}>
                      {ids.join("  ·  ")}
                    </Text>
                  </View>
                );
              });
            })()}
          </ScrollView>

          {/* Cancel button */}
          {onCancel && (
            <TouchableOpacity
              onPress={handleCancel}
              disabled={cancelling}
              style={{
                marginTop: 18,
                borderRadius: 14, paddingVertical: 15,
                alignItems: "center",
                backgroundColor: "rgba(239,68,68,0.12)",
                borderWidth: 1, borderColor: RED,
              }}
              activeOpacity={0.7}
            >
              {cancelling
                ? <ActivityIndicator color={RED} size="small" />
                : <Text style={{ color: RED, fontSize: 15, fontWeight: "700" }}>
                    {cancelLabel}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
