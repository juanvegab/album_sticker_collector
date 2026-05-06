import { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, Share, ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useFriends } from "@/hooks/useFriends";
import { useStickerRequests } from "@/hooks/useStickerRequests";
import { acceptFriendRequest, rejectFriendRequest, getProfile } from "@/lib/firestore/users";
import { markRequestReceived } from "@/lib/firestore/requests";
import { sendPushNotification } from "@/lib/notifications";
import { ALL_STICKERS_MAP } from "@/lib/data/world-cup-2026";
import { RequestCard } from "@/components/friends/RequestCard";
import { QRModal } from "@/components/friends/QRModal";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { TrialBanner } from "@/components/premium/TrialBanner";
import type { UserProfile } from "@/types/user";
import type { StickerRequest } from "@/types/request";

const INVITE_BASE = "https://elalbum2026.com/invite";

export default function FriendsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUser();
  const { friendProfiles, pendingFrom, loading } = useFriends();
  const { incoming, pendingDeliveries } = useStickerRequests();
  const [qrVisible, setQrVisible] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [pendingProfiles, setPendingProfiles] = useState<Record<string, UserProfile>>({});

  async function loadPendingProfile(userId: string) {
    if (pendingProfiles[userId]) return;
    const p = await getProfile(userId);
    if (p) setPendingProfiles((prev) => ({ ...prev, [userId]: p }));
  }

  async function handleShare() {
    if (!user) return;
    const link = `${INVITE_BASE}/${user.id}`;
    await Share.share({ message: t("friends.inviteMsg", { link }), url: link });
  }

  async function handleAcceptFriend(requesterId: string) {
    if (!user) return;
    setActingOn(requesterId);
    try {
      await acceptFriendRequest(user.id, requesterId);
      const myName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? t("account.userFallback");
      const rProfile = pendingProfiles[requesterId];
      if (rProfile?.expoPushToken) {
        await sendPushNotification(
          rProfile.expoPushToken,
          t("friends.acceptedTitle", { name: myName }),
          t("friends.acceptedBody")
        );
      }
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setActingOn(null);
    }
  }

  async function handleRejectFriend(requesterId: string) {
    if (!user) return;
    setActingOn(requesterId);
    try {
      await rejectFriendRequest(user.id, requesterId);
    } finally {
      setActingOn(null);
    }
  }

  async function handleMarkReceived(req: StickerRequest) {
    if (!user) return;
    setActingOn(req.id);
    try {
      await markRequestReceived(req.id, user.id, req.givenStickers ?? []);
      // Notify the giver
      const giverProfile = await getProfile(req.toUserId);
      if (giverProfile?.expoPushToken) {
        const myName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? t("account.userFallback");
        await sendPushNotification(
          giverProfile.expoPushToken,
          t("requests.receivedTitle", { name: myName }),
          t("requests.receivedBody")
        );
      }
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setActingOn(null);
    }
  }

  const totalBadge = pendingFrom.length + incoming.length + pendingDeliveries.length;

  const hasSections =
    pendingFrom.length > 0 ||
    incoming.length > 0 ||
    pendingDeliveries.length > 0 ||
    friendProfiles.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: t("friends.tab"),
          headerRight: () => (
            <TouchableOpacity onPress={() => setQrVisible(true)} className="mr-4 p-1">
              <Text className="text-blue-600 text-2xl">👥</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View className="flex-1 bg-gray-50">
        <TrialBanner />
        <BannerAd />

        {/* Invite FAB */}
        <TouchableOpacity
          onPress={handleShare}
          className="absolute bottom-6 right-6 bg-blue-600 rounded-full w-14 h-14 items-center justify-center shadow-lg z-10"
          activeOpacity={0.8}
        >
          <Text className="text-white text-2xl">+</Text>
        </TouchableOpacity>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : !hasSections ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-5xl mb-3">👥</Text>
            <Text className="text-gray-500 text-base text-center font-semibold mb-1">
              {t("friends.noFriends")}
            </Text>
            <Text className="text-gray-400 text-sm text-center">{t("friends.noFriendsHint")}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

            {/* ── Pending friend requests ── */}
            {pendingFrom.length > 0 && (
              <View className="mt-4">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">
                  {t("friends.pendingRequests")} ({pendingFrom.length})
                </Text>
                {pendingFrom.map((requesterId) => {
                  loadPendingProfile(requesterId);
                  const profile = pendingProfiles[requesterId];
                  const isActing = actingOn === requesterId;
                  return (
                    <View
                      key={requesterId}
                      className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm border border-blue-100"
                    >
                      <View className="flex-row items-center mb-3">
                        <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                          <Text className="text-blue-600 font-bold">
                            {(profile?.name ?? "?")[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold text-gray-800">
                            {profile?.name ?? requesterId}
                          </Text>
                          <Text className="text-xs text-gray-400">{t("friends.wantsToConnect")}</Text>
                        </View>
                      </View>
                      <View className="flex-row gap-3">
                        <TouchableOpacity
                          onPress={() => handleRejectFriend(requesterId)}
                          disabled={!!isActing}
                          className="flex-1 bg-gray-100 rounded-xl py-2.5 items-center"
                        >
                          <Text className="text-gray-600 font-semibold text-sm">{t("friends.reject")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleAcceptFriend(requesterId)}
                          disabled={!!isActing}
                          className="flex-1 bg-blue-600 rounded-xl py-2.5 items-center"
                        >
                          {isActing ? (
                            <ActivityIndicator color="white" size="small" />
                          ) : (
                            <Text className="text-white font-bold text-sm">{t("friends.accept")}</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Incoming sticker requests (to respond to) ── */}
            {incoming.length > 0 && (
              <View className="mt-4">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">
                  {t("requests.incoming")} ({incoming.length})
                </Text>
                {incoming.map((req) => (
                  <RequestCard key={req.id} request={req} />
                ))}
              </View>
            )}

            {/* ── Pending deliveries (my requests that were accepted) ── */}
            {pendingDeliveries.length > 0 && (
              <View className="mt-4">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">
                  {t("requests.pendingDelivery")} ({pendingDeliveries.length})
                </Text>
                {pendingDeliveries.map((req) => {
                  const given = req.givenStickers ?? [];
                  const preview = given
                    .slice(0, 3)
                    .map((id) => ALL_STICKERS_MAP.get(id)?.name ?? id)
                    .join(", ");
                  const more = given.length - 3;
                  const isActing = actingOn === req.id;

                  return (
                    <View
                      key={req.id}
                      className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm border border-green-100"
                    >
                      {/* Header */}
                      <View className="flex-row items-center mb-2">
                        <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-2">
                          <Text className="text-green-600 font-bold text-sm">
                            {req.fromUserName[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold text-gray-800 text-sm">{req.fromUserName}</Text>
                          <Text className="text-xs text-gray-400">
                            {t("requests.waitingDelivery", { count: given.length })}
                          </Text>
                        </View>
                        <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                          <Text className="text-amber-600 text-xs font-semibold">
                            {t("requests.pendingLabel")}
                          </Text>
                        </View>
                      </View>

                      {/* Sticker list */}
                      {given.length > 0 ? (
                        <Text className="text-xs text-gray-600 mb-3" numberOfLines={2}>
                          {preview}
                          {more > 0 && t("trades.more", { count: more })}
                        </Text>
                      ) : (
                        <Text className="text-xs text-gray-400 mb-3 italic">
                          {t("requests.noStickersGiven")}
                        </Text>
                      )}

                      {/* Mark as received */}
                      <TouchableOpacity
                        onPress={() => handleMarkReceived(req)}
                        disabled={isActing || given.length === 0}
                        className={`rounded-xl py-2.5 items-center ${
                          given.length > 0 && !isActing ? "bg-green-600" : "bg-gray-200"
                        }`}
                        activeOpacity={0.8}
                      >
                        {isActing ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <Text
                            className={`font-bold text-sm ${
                              given.length > 0 ? "text-white" : "text-gray-400"
                            }`}
                          >
                            {t("requests.markReceived")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Friends list ── */}
            {friendProfiles.length > 0 && (
              <View className="mt-4">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">
                  {t("friends.myFriends")} ({friendProfiles.length})
                </Text>
                {friendProfiles.map((item: UserProfile) => (
                  <TouchableOpacity
                    key={item.userId}
                    onPress={() => router.push(`/(tabs)/friends/${item.userId}`)}
                    className="bg-white mx-4 mb-3 rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 flex-row items-center"
                    activeOpacity={0.75}
                  >
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                      <Text className="text-blue-600 font-bold text-base">
                        {item.name[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <Text className="flex-1 font-semibold text-gray-800">{item.name}</Text>
                    <Text className="text-gray-400 text-lg">›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          </ScrollView>
        )}

        <QRModal visible={qrVisible} onClose={() => setQrVisible(false)} />
      </View>
    </>
  );
}
