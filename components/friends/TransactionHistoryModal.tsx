import { useState, useEffect, useMemo } from "react";
import {
  Modal, View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, FlatList,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { fetchTransactionHistory } from "@/lib/firestore/requests";
import { ALL_STICKERS_MAP, WORLD_CUP_2026 } from "@/lib/data/world-cup-2026";
import type { StickerRequest, RequestStatus } from "@/types/request";
import type { UserProfile } from "@/types/user";

// ── Design tokens ──────────────────────────────────────────────────────
const BG       = "#0B0B0E";
const SURFACE  = "#15161B";
const ELEVATED = "#1C1D24";
const INK      = "#F5F4EE";
const DIM      = "rgba(245,244,238,0.38)";
const DIM3     = "rgba(245,244,238,0.08)";
const GREEN    = "#22C55E";
const RED      = "#EF4444";
const ORANGE   = "#F2853A";
const GREY     = "rgba(245,244,238,0.18)";

const AVATAR_PALETTE = ["#5847C4", "#1FA7A0", "#D9457A", "#2B6FE3", "#10B981", "#E55D4C"];
function avatarBg(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length];
}

// ── Helpers ────────────────────────────────────────────────────────────

const SECTION_ORDER = new Map(WORLD_CUP_2026.sections.map((s, i) => [s.id, i]));

function sortStickerIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const sa = ALL_STICKERS_MAP.get(a);
    const sb = ALL_STICKERS_MAP.get(b);
    if (!sa || !sb) return 0;
    const diff = (SECTION_ORDER.get(sa.sectionId) ?? 999) - (SECTION_ORDER.get(sb.sectionId) ?? 999);
    return diff !== 0 ? diff : sa.number - sb.number;
  });
}

function statusMeta(status: RequestStatus): { label: string; color: string; icon: string } {
  switch (status) {
    case "received":  return { label: "Completado", color: GREEN,  icon: "check-circle"  };
    case "rejected":  return { label: "Rechazado",  color: RED,    icon: "close-circle"  };
    case "cancelled": return { label: "Cancelado",  color: GREY,   icon: "cancel"        };
    default:          return { label: status,        color: ORANGE, icon: "clock-outline" };
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

// ── Props ──────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  friendMap: Record<string, UserProfile>;
}

// ── Detail panel (shown inline when an item is tapped) ─────────────────

interface DetailProps {
  item: StickerRequest;
  currentUserId: string;
  friendMap: Record<string, UserProfile>;
  onBack: () => void;
}

function TransactionDetail({ item, currentUserId, friendMap, onBack }: DetailProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isSender   = item.fromUserId === currentUserId;
  const otherName  = isSender
    ? (friendMap[item.toUserId]?.name ?? t("history.unknownUser"))
    : item.fromUserName;

  const { color: statusColor, label: statusLabel, icon: statusIcon } = statusMeta(item.status);

  const requestedSorted = useMemo(() => sortStickerIds(item.stickers),              [item.stickers]);
  const givenSorted     = useMemo(() => sortStickerIds(item.givenStickers ?? []),   [item.givenStickers]);
  const hasGiven        = givenSorted.length > 0;

  return (
    <View style={{ flex: 1 }}>
      {/* Back row */}
      <TouchableOpacity
        onPress={onBack}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}
        activeOpacity={0.7}
      >
        <FontAwesome name="chevron-left" size={13} color={ORANGE} />
        <Text style={{ color: ORANGE, fontSize: 14, fontWeight: "600" }}>
          {t("history.title")}
        </Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: avatarBg(otherName),
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
                {otherName[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: INK, fontSize: 18, fontWeight: "800" }} numberOfLines={1}>
                {isSender ? t("history.sentTo", { name: otherName }) : t("history.receivedFrom", { name: otherName })}
              </Text>
              <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }}>
                {formatDate(item.updatedAt)}
              </Text>
            </View>
          </View>

          {/* Status badge */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 6,
            marginTop: 12, alignSelf: "flex-start",
            backgroundColor: `${statusColor}18`,
            borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6,
            borderWidth: 1, borderColor: `${statusColor}55`,
          }}>
            <MaterialCommunityIcons name={statusIcon as any} size={14} color={statusColor} />
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: "700" }}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Postales pedidas */}
        <Text style={{ color: DIM, fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8 }}>
          {t("history.requested").toUpperCase()} · {requestedSorted.length}
        </Text>
        <View style={{ backgroundColor: ELEVATED, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <Text style={{ color: INK, fontSize: 13, lineHeight: 22 }}>
            {requestedSorted.join("   ·   ")}
          </Text>
        </View>

        {/* Postales dadas (solo si el intercambio se completó o se aceptó parcialmente) */}
        {hasGiven && (
          <>
            <Text style={{ color: DIM, fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8 }}>
              {t("history.given").toUpperCase()} · {givenSorted.length}
            </Text>
            <View style={{ backgroundColor: ELEVATED, borderRadius: 14, padding: 14 }}>
              <Text style={{ color: GREEN, fontSize: 13, lineHeight: 22 }}>
                {givenSorted.join("   ·   ")}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────

export function TransactionHistoryModal({ visible, onClose, currentUserId, friendMap }: Props) {
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  const [items,    setItems]    = useState<StickerRequest[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState<StickerRequest | null>(null);

  // Load history every time the modal opens
  useEffect(() => {
    if (!visible || !currentUserId) return;
    setSelected(null);
    setLoading(true);
    fetchTransactionHistory(currentUserId)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [visible, currentUserId]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>

        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: DIM3,
        }}>
          {selected ? (
            // When detail is open, the back button is inside TransactionDetail
            <View style={{ flex: 1 }} />
          ) : (
            <Text style={{ flex: 1, color: INK, fontSize: 24, fontWeight: "800", letterSpacing: -0.3 }}>
              {t("history.title")}
            </Text>
          )}
          <TouchableOpacity
            onPress={selected ? () => setSelected(null) : onClose}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: ELEVATED,
              alignItems: "center", justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <FontAwesome name="times" size={15} color={DIM} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Detail view */}
          {selected ? (
            <TransactionDetail
              item={selected}
              currentUserId={currentUserId}
              friendMap={friendMap}
              onBack={() => setSelected(null)}
            />
          ) : loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
              <ActivityIndicator size="large" color={ORANGE} />
              <Text style={{ color: DIM, fontSize: 14 }}>{t("history.loading")}</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
              <MaterialCommunityIcons name="history" size={56} color={DIM3} />
              <Text style={{ color: INK, fontSize: 17, fontWeight: "700" }}>{t("history.empty")}</Text>
              <Text style={{ color: DIM, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                {t("history.emptyHint")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSender  = item.fromUserId === currentUserId;
                const otherName = isSender
                  ? (friendMap[item.toUserId]?.name ?? t("history.unknownUser"))
                  : item.fromUserName;
                const { color: statusColor, label: statusLabel, icon: statusIcon } = statusMeta(item.status);
                const stickerCount = item.stickers.length;

                return (
                  <TouchableOpacity
                    onPress={() => setSelected(item)}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: SURFACE,
                      borderRadius: 16, padding: 14, marginBottom: 8,
                      borderWidth: 1, borderColor: DIM3,
                      flexDirection: "row", alignItems: "center", gap: 12,
                    }}
                  >
                    {/* Avatar */}
                    <View style={{
                      width: 42, height: 42, borderRadius: 21,
                      backgroundColor: avatarBg(otherName),
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
                        {otherName[0]?.toUpperCase() ?? "?"}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: INK, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                        {otherName}
                      </Text>
                      <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }}>
                        {isSender ? t("history.youRequested") : t("history.theyRequested")}
                        {" · "}
                        {t("history.nStickers", { count: stickerCount })}
                      </Text>
                      <Text style={{ color: DIM, fontSize: 11, marginTop: 1 }}>
                        {formatDate(item.updatedAt)}
                      </Text>
                    </View>

                    {/* Status badge */}
                    <View style={{
                      flexDirection: "row", alignItems: "center", gap: 4,
                      backgroundColor: `${statusColor}18`,
                      borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5,
                      borderWidth: 1, borderColor: `${statusColor}55`,
                    }}>
                      <MaterialCommunityIcons name={statusIcon as any} size={12} color={statusColor} />
                      <Text style={{ color: statusColor, fontSize: 10, fontWeight: "700" }}>
                        {statusLabel}
                      </Text>
                    </View>

                    <FontAwesome name="chevron-right" size={11} color={DIM} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
