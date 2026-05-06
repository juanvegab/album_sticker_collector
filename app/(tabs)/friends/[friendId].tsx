import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useFriendCollection } from "@/hooks/useFriendCollection";
import { useFriends } from "@/hooks/useFriends";
import { sendStickerRequest } from "@/lib/firestore/requests";
import { getProfile } from "@/lib/firestore/users";
import { sendPushNotification } from "@/lib/notifications";
import { StickerPickerPanel } from "@/components/stickers/StickerPickerPanel";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";

export default function FriendDetailScreen() {
  const { t } = useTranslation();
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { user } = useUser();
  const router = useRouter();
  const { friendProfiles } = useFriends();
  const { duplicateStickers, loading } = useFriendCollection(friendId ?? null);

  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Reset selection whenever we navigate to a different friend
  useEffect(() => {
    setSelected([]);
  }, [friendId]);

  const friend = friendProfiles.find((p) => p.userId === friendId);
  const friendName = friend?.name ?? friendId ?? "";

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSendRequest() {
    if (!user || !friendId || selected.length === 0) return;
    setSending(true);
    try {
      const myName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? t("account.userFallback");
      await sendStickerRequest(user.id, myName, friendId, selected);

      // Notify friend
      const friendProfile = friend ?? await getProfile(friendId);
      if (friendProfile?.expoPushToken) {
        await sendPushNotification(
          friendProfile.expoPushToken,
          t("requests.notifTitle", { name: myName }),
          t("requests.notifBody", { count: selected.length })
        );
      }

      Alert.alert(
        t("requests.sentTitle"),
        t("requests.sentMsg", { name: friendName }),
        [{ text: t("common.ok"), onPress: () => router.back() }]
      );
    } catch {
      Alert.alert(t("common.error"), t("requests.errorSend"));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("friends.wantFrom", { name: friendName }),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="pl-1 pr-3 py-1">
              <Text className="text-blue-600 text-base font-semibold">‹ {t("common.back")}</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View className="flex-1 bg-white">

        <BannerAd />

        {/* Header banner */}
        <View className="bg-blue-600 px-4 py-3">
          <Text className="text-white font-bold text-base">{friendName}</Text>
          <Text className="text-blue-200 text-xs">
            {t("friends.duplicatesCount", { count: duplicateStickers.length })}
          </Text>
        </View>

        {/* Sticker picker */}
        <StickerPickerPanel
          pool={duplicateStickers}
          selected={selected}
          onToggle={toggle}
          emptyText={t("friends.noDuplicates", { name: friendName })}
        />

        {/* Bottom action */}
        {duplicateStickers.length > 0 && (
          <View className="bg-white border-t border-gray-100 px-4 py-4">
            <TouchableOpacity
              onPress={handleSendRequest}
              disabled={sending || selected.length === 0}
              className={`rounded-2xl py-4 items-center ${
                selected.length > 0 && !sending ? "bg-green-600" : "bg-gray-200"
              }`}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  className={`font-bold text-base ${selected.length > 0 ? "text-white" : "text-gray-400"}`}
                >
                  {selected.length > 0
                    ? t("friends.sendRequest", { count: selected.length })
                    : t("friends.selectToRequest")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}
