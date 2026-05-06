import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Share } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useFriends } from "@/hooks/useFriends";
import { useStickerRequests } from "@/hooks/useStickerRequests";
import { acceptFriendRequest, rejectFriendRequest } from "@/lib/firestore/users";
import { sendPushNotification } from "@/lib/notifications";
import { getProfile } from "@/lib/firestore/users";
import { RequestCard } from "@/components/friends/RequestCard";
import { QRModal } from "@/components/friends/QRModal";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { TrialBanner } from "@/components/premium/TrialBanner";
import type { UserProfile } from "@/types/user";

const INVITE_BASE = "https://elalbum2026.com/invite";

export default function FriendsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUser();
  const { friendProfiles, pendingFrom, loading } = useFriends();
  const { incoming } = useStickerRequests();
  const [qrVisible, setQrVisible] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  // Resolved profiles for pending friend requests
  const [pendingProfiles, setPendingProfiles] = useState<Record<string, UserProfile>>({});

  async function loadPendingProfile(userId: string) {
    if (pendingProfiles[userId]) return;
    const p = await getProfile(userId);
    if (p) setPendingProfiles((prev) => ({ ...prev, [userId]: p }));
  }

  async function handleShare() {
    if (!user) return;
    const link = `${INVITE_BASE}/${user.id}`;
    await Share.share({
      message: t("friends.inviteMsg", { link }),
      url: link,
    });
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

  const totalBadge = pendingFrom.length + incoming.length;

  return (
    <>
      <Stack.Screen
        options={{
          title: t("friends.tab"),
          headerRight: () => (
            <TouchableOpacity onPress={() => setQrVisible(true)} className="mr-4 p-1">
              <Text className="text-blue-600 text-2xl">⬛</Text>
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
        ) : (
          <FlatList
            data={friendProfiles}
            keyExtractor={(p) => p.userId}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListHeaderComponent={() => (
              <>
                {/* Pending friend requests */}
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

                {/* Incoming sticker requests */}
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

                {/* Friends header */}
                {friendProfiles.length > 0 && (
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 mt-4 mb-2">
                    {t("friends.myFriends")} ({friendProfiles.length})
                  </Text>
                )}
              </>
            )}
            ListEmptyComponent={
              pendingFrom.length === 0 && incoming.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8 mt-20">
                  <Text className="text-5xl mb-3">👥</Text>
                  <Text className="text-gray-500 text-base text-center font-semibold mb-1">
                    {t("friends.noFriends")}
                  </Text>
                  <Text className="text-gray-400 text-sm text-center">{t("friends.noFriendsHint")}</Text>
                </View>
              ) : null
            }
            renderItem={({ item }: { item: UserProfile }) => (
              <TouchableOpacity
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
            )}
          />
        )}

        <QRModal visible={qrVisible} onClose={() => setQrVisible(false)} />
      </View>
    </>
  );
}
