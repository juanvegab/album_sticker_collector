import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { RespondToRequestModal } from "./RespondToRequestModal";
import type { StickerRequest } from "@/types/request";

// ── Design tokens ──────────────────────────────────────────────────────
const SURFACE  = "#15161B";
const ELEVATED = "#1C1D24";
const INK      = "#F5F4EE";
const DIM      = "rgba(245,244,238,0.38)";
const DIM3     = "rgba(245,244,238,0.08)";
const BRAND    = "#F4C430";

const AVATAR_PALETTE = ["#5847C4", "#1FA7A0", "#D9457A", "#2B6FE3", "#10B981", "#E55D4C"];
function avatarBg(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length];
}

interface Props {
  request: StickerRequest;
}

export function RequestCard({ request }: Props) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  const preview = request.stickers.slice(0, 4).join(" · ");
  const more = request.stickers.length - 4;

  return (
    <>
      <View style={{
        backgroundColor: SURFACE,
        marginHorizontal: 16, marginBottom: 8,
        borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: DIM3,
      }}>
        {/* Header row */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          {/* Avatar */}
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: avatarBg(request.fromUserName),
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
              {request.fromUserName[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: INK, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
              {request.fromUserName}
            </Text>
            <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }}>
              {t("requests.wantsStickers", { count: request.stickers.length })}
            </Text>
          </View>
        </View>

        {/* Sticker IDs preview */}
        {request.stickers.length > 0 && (
          <View style={{
            backgroundColor: ELEVATED,
            borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
            marginBottom: 12,
          }}>
            <Text style={{ color: DIM, fontSize: 12 }} numberOfLines={1}>
              {preview}{more > 0 ? ` +${more}` : ""}
            </Text>
          </View>
        )}

        {/* Respond button */}
        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          style={{
            borderRadius: 12, paddingVertical: 13,
            alignItems: "center", backgroundColor: BRAND,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#0B0B0E", fontSize: 14, fontWeight: "800" }}>
            {t("requests.respond")}
          </Text>
        </TouchableOpacity>
      </View>

      <RespondToRequestModal
        request={modalOpen ? request : null}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
