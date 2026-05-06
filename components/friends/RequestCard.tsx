import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { ALL_STICKERS_MAP } from "@/lib/data/world-cup-2026";
import { RespondToRequestModal } from "./RespondToRequestModal";
import type { StickerRequest } from "@/types/request";

interface Props {
  request: StickerRequest;
}

export function RequestCard({ request }: Props) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  const preview = request.stickers
    .slice(0, 3)
    .map((id) => ALL_STICKERS_MAP.get(id)?.name ?? id)
    .join(", ");
  const more = request.stickers.length - 3;

  return (
    <>
      <View className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm border border-gray-100">
        <View className="flex-row items-center mb-2">
          <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-2">
            <Text className="text-blue-600 font-bold text-sm">
              {request.fromUserName[0]?.toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-gray-800 text-sm">{request.fromUserName}</Text>
            <Text className="text-xs text-gray-400">
              {t("requests.wantsStickers", { count: request.stickers.length })}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-600 mb-3" numberOfLines={2}>
          {preview}
          {more > 0 && t("trades.more", { count: more })}
        </Text>

        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          className="bg-blue-600 rounded-xl py-2.5 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-sm">{t("requests.respond")}</Text>
        </TouchableOpacity>
      </View>

      <RespondToRequestModal
        request={modalOpen ? request : null}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
