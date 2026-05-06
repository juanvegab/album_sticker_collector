import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { ALL_STICKERS_MAP } from "@/lib/data/world-cup-2026";
import { acceptStickerRequest, rejectStickerRequest } from "@/lib/firestore/requests";
import { getProfile } from "@/lib/firestore/users";
import { sendPushNotification } from "@/lib/notifications";
import { useState } from "react";
import type { StickerRequest } from "@/types/request";

interface Props {
  request: StickerRequest;
}

export function RequestCard({ request }: Props) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [acting, setActing] = useState(false);

  const preview = request.stickers
    .slice(0, 4)
    .map((id) => ALL_STICKERS_MAP.get(id)?.name ?? id)
    .join(", ");
  const more = request.stickers.length - 4;

  async function handleAccept() {
    if (!user) return;
    setActing(true);
    try {
      await acceptStickerRequest(request.id, user.id, request.stickers);
      // Notify the requester
      const senderProfile = await getProfile(request.fromUserId);
      if (senderProfile?.expoPushToken) {
        const myName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? t("account.userFallback");
        await sendPushNotification(
          senderProfile.expoPushToken,
          t("requests.acceptedTitle", { name: myName }),
          t("requests.acceptedBody")
        );
      }
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
    } catch {
      Alert.alert(t("common.error"), t("requests.errorReject"));
    } finally {
      setActing(false);
    }
  }

  return (
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

      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={handleReject}
          disabled={acting}
          className="flex-1 bg-gray-100 rounded-xl py-2.5 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-gray-600 font-semibold text-sm">{t("requests.reject")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAccept}
          disabled={acting}
          className="flex-1 bg-green-600 rounded-xl py-2.5 items-center"
          activeOpacity={0.8}
        >
          {acting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold text-sm">{t("requests.accept")}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
