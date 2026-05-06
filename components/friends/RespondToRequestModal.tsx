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

  // Only show stickers from the request that I still have as duplicates
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
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-6 pb-3 border-b border-gray-100">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800">
              {t("requests.respondTitle")}
            </Text>
            <Text className="text-sm text-gray-400">
              {t("requests.respondSubtitle", { name: request.fromUserName })}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Text className="text-gray-400 text-2xl">✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Available stickers (I can give these) */}
          {available.length > 0 ? (
            <>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
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
                    className={`flex-row items-center rounded-xl mb-2 px-3 py-3.5 border ${
                      isSelected ? "bg-green-50 border-green-400" : "bg-white border-gray-100"
                    }`}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-green-600 border-green-600" : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <Text className="text-white font-bold" style={{ fontSize: 10 }}>✓</Text>
                      )}
                    </View>
                    <Text className="text-xs text-gray-400 w-14" numberOfLines={1}>{id}</Text>
                    <Text className="flex-1 text-gray-800 text-sm" numberOfLines={1}>
                      {sticker?.name ?? id}
                    </Text>
                    <View className="bg-blue-100 rounded-full px-2 py-0.5">
                      <Text className="text-blue-600 text-xs font-semibold">×{dupCount}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View className="items-center py-8">
              <Text className="text-4xl mb-3">😔</Text>
              <Text className="text-gray-500 text-base text-center">
                {t("requests.noneAvailable")}
              </Text>
            </View>
          )}

          {/* Unavailable stickers (I don't have these anymore) */}
          {unavailable.length > 0 && (
            <>
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-5">
                {t("requests.youDontHave", { count: unavailable.length })}
              </Text>
              {unavailable.map((id) => {
                const sticker = ALL_STICKERS_MAP.get(id);
                return (
                  <View
                    key={id}
                    className="flex-row items-center rounded-xl mb-2 px-3 py-3.5 bg-gray-50 border border-gray-100"
                  >
                    <View className="w-5 h-5 rounded border-2 border-gray-200 mr-3 flex-shrink-0" />
                    <Text className="text-xs text-gray-300 w-14" numberOfLines={1}>{id}</Text>
                    <Text className="flex-1 text-gray-400 text-sm" numberOfLines={1}>
                      {sticker?.name ?? id}
                    </Text>
                    <Text className="text-xs text-gray-300">{t("requests.notAvailable")}</Text>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

        {/* Bottom actions */}
        <View className="bg-white border-t border-gray-100 px-4 py-4 gap-3">
          {available.length > 0 && (
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={acting || selected.length === 0}
              className={`rounded-2xl py-4 items-center ${
                selected.length > 0 && !acting ? "bg-green-600" : "bg-gray-200"
              }`}
              activeOpacity={0.8}
            >
              {acting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  className={`font-bold text-base ${
                    selected.length > 0 ? "text-white" : "text-gray-400"
                  }`}
                >
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
            className="rounded-2xl py-3.5 items-center bg-gray-100"
            activeOpacity={0.8}
          >
            <Text className="text-gray-600 font-semibold">{t("requests.cantGiveAny")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
