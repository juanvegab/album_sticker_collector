import { useState } from "react";
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useCollection } from "@/hooks/useCollection";
import { ALL_STICKERS_MAP } from "@/lib/data/world-cup-2026";
import { acceptStickerRequest, rejectStickerRequest } from "@/lib/firestore/requests";
import { getProfile } from "@/lib/firestore/users";
import { sendPushNotification } from "@/lib/notifications";
import type { StickerRequest } from "@/types/request";

// ── Design tokens ──────────────────────────────────────────────────────
const BG       = "#0B0B0E";
const SURFACE  = "#15161B";
const ELEVATED = "#1C1D24";
const INK      = "#F5F4EE";
const DIM      = "rgba(245,244,238,0.38)";
const DIM3     = "rgba(245,244,238,0.08)";
const GREEN    = "#22C55E";
const BRAND    = "#F4C430";

interface Props {
  request: StickerRequest | null;
  onClose: () => void;
}

export function RespondToRequestModal({ request, onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { duplicates } = useCollection();
  const [selected, setSelected] = useState<string[]>([]);
  const [acting, setActing] = useState(false);

  if (!request) return null;

  const available = request.stickers.filter((id) => (duplicates[id] ?? 0) > 0);
  const unavailable = request.stickers.filter((id) => (duplicates[id] ?? 0) === 0);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleConfirm() {
    if (!user || selected.length === 0) return;
    setActing(true);
    try {
      await acceptStickerRequest(request.id, user.id, selected);
      const senderProfile = await getProfile(request.fromUserId);
      if (senderProfile?.expoPushToken) {
        const myName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? t("account.userFallback");
        const names = selected
          .map((id) => ALL_STICKERS_MAP.get(id)?.name ?? id)
          .join(", ");
        await sendPushNotification(
          senderProfile.expoPushToken,
          t("requests.acceptedTitle", { name: myName }),
          t("requests.acceptedBodyPartial", { stickers: names })
        );
      }
      onClose();
    } catch {
      Alert.alert(t("common.error"), t("requests.errorAccept"));
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    setActing(true);
    try {
      await rejectStickerRequest(request.id);
      onClose();
    } catch {
      Alert.alert(t("common.error"), t("requests.errorReject"));
    } finally {
      setActing(false);
    }
  }

  return (
    <Modal
      visible={!!request}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: BG }}>
        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: DIM3,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: INK, fontSize: 18, fontWeight: "800" }}>
              {t("requests.respondTitle")}
            </Text>
            <Text style={{ color: DIM, fontSize: 13, marginTop: 3 }}>
              {t("requests.respondSubtitle", { name: request.fromUserName })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: ELEVATED,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: DIM, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Available stickers */}
          {available.length > 0 ? (
            <>
              <Text style={{
                color: DIM, fontSize: 11, fontWeight: "700",
                letterSpacing: 1.2, textTransform: "uppercase",
                marginBottom: 10,
              }}>
                {t("requests.youCanGive", { count: available.length })}
              </Text>
              {available.map((id) => {
                const sticker = ALL_STICKERS_MAP.get(id);
                const isSelected = selected.includes(id);
                const dupCount = duplicates[id] ?? 0;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => toggle(id)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      borderRadius: 12, marginBottom: 8,
                      paddingHorizontal: 12, paddingVertical: 14,
                      backgroundColor: isSelected ? "rgba(34,197,94,0.12)" : SURFACE,
                      borderWidth: 1,
                      borderColor: isSelected ? GREEN : DIM3,
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 20, height: 20, borderRadius: 4,
                      borderWidth: 2,
                      backgroundColor: isSelected ? GREEN : "transparent",
                      borderColor: isSelected ? GREEN : DIM,
                      marginRight: 12,
                      alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {isSelected && (
                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ color: DIM, fontSize: 11, width: 52 }} numberOfLines={1}>{id}</Text>
                    <Text style={{ color: INK, fontSize: 13, flex: 1 }} numberOfLines={1}>
                      {sticker?.name ?? id}
                    </Text>
                    <View style={{
                      backgroundColor: ELEVATED,
                      borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3,
                    }}>
                      <Text style={{ color: BRAND, fontSize: 11, fontWeight: "700" }}>×{dupCount}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>😔</Text>
              <Text style={{ color: DIM, fontSize: 15, textAlign: "center" }}>
                {t("requests.noneAvailable")}
              </Text>
            </View>
          )}

          {/* Unavailable stickers */}
          {unavailable.length > 0 && (
            <>
              <Text style={{
                color: DIM, fontSize: 11, fontWeight: "700",
                letterSpacing: 1.2, textTransform: "uppercase",
                marginTop: 20, marginBottom: 10,
                opacity: 0.6,
              }}>
                {t("requests.youDontHave", { count: unavailable.length })}
              </Text>
              {unavailable.map((id) => {
                const sticker = ALL_STICKERS_MAP.get(id);
                return (
                  <View
                    key={id}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      borderRadius: 12, marginBottom: 8,
                      paddingHorizontal: 12, paddingVertical: 14,
                      backgroundColor: ELEVATED,
                      borderWidth: 1, borderColor: DIM3,
                      opacity: 0.5,
                    }}
                  >
                    <View style={{
                      width: 20, height: 20, borderRadius: 4,
                      borderWidth: 2, borderColor: DIM3,
                      marginRight: 12, flexShrink: 0,
                    }} />
                    <Text style={{ color: DIM, fontSize: 11, width: 52 }} numberOfLines={1}>{id}</Text>
                    <Text style={{ color: DIM, fontSize: 13, flex: 1 }} numberOfLines={1}>
                      {sticker?.name ?? id}
                    </Text>
                    <Text style={{ color: DIM, fontSize: 11 }}>{t("requests.notAvailable")}</Text>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

        {/* Bottom actions */}
        <View style={{
          backgroundColor: SURFACE,
          borderTopWidth: 1, borderTopColor: DIM3,
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
          gap: 10,
        }}>
          {available.length > 0 && (
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={acting || selected.length === 0}
              style={{
                borderRadius: 14, paddingVertical: 16, alignItems: "center",
                backgroundColor: selected.length > 0 && !acting ? GREEN : ELEVATED,
              }}
              activeOpacity={0.8}
            >
              {acting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{
                  fontSize: 15, fontWeight: "800",
                  color: selected.length > 0 ? "#fff" : DIM,
                }}>
                  {selected.length > 0
                    ? t("requests.confirmGive", { count: selected.length })
                    : t("requests.selectToGive")}
                </Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleReject}
            disabled={acting}
            style={{
              borderRadius: 14, paddingVertical: 14, alignItems: "center",
              backgroundColor: ELEVATED,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: DIM, fontSize: 14, fontWeight: "600" }}>
              {t("requests.cantGiveAny")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
