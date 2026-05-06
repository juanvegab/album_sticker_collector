import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { getProfile, sendFriendRequest, acceptFriendRequest } from "@/lib/firestore/users";
import { sendPushNotification } from "@/lib/notifications";
import type { UserProfile } from "@/types/user";

export default function InviteScreen() {
  const { t } = useTranslation();
  const { userId: inviterId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [inviter, setInviter] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null);

  const alreadyFriends = inviter?.friends?.includes(user?.id ?? "") ?? false;
  const isSelf = inviterId === user?.id;

  useEffect(() => {
    if (!inviterId) return;
    getProfile(inviterId).then(setInviter).finally(() => setLoading(false));
  }, [inviterId]);

  async function handleAccept() {
    if (!user || !inviterId || !inviter) return;
    setActing(true);
    try {
      await acceptFriendRequest(user.id, inviterId);
      // Notify the inviter
      if (inviter.expoPushToken) {
        const myName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? t("account.userFallback");
        await sendPushNotification(
          inviter.expoPushToken,
          t("friends.acceptedTitle", { name: myName }),
          t("friends.acceptedBody")
        );
      }
      setDone("accepted");
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!user || !inviterId) return;
    setActing(true);
    try {
      // Just navigate away — don't add to pendingFrom since user didn't initiate
      setDone("rejected");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!inviter) {
    return (
      <>
        <Stack.Screen options={{ title: t("friends.addFriend") }} />
        <View className="flex-1 items-center justify-center bg-white px-8">
          <Text className="text-5xl mb-3">🔍</Text>
          <Text className="text-gray-500 text-base text-center">{t("friends.userNotFound")}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("friends.addFriend") }} />
      <View className="flex-1 bg-white items-center justify-center px-8">

        {/* Avatar */}
        {inviter.avatarUrl ? (
          <Image
            source={{ uri: inviter.avatarUrl }}
            style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 16 }}
          />
        ) : (
          <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center mb-4">
            <Text className="text-4xl font-bold text-blue-600">
              {inviter.name[0]?.toUpperCase()}
            </Text>
          </View>
        )}

        {isSelf ? (
          <>
            <Text className="text-xl font-bold text-gray-800 mb-2">{t("friends.itsYou")}</Text>
            <Text className="text-gray-500 text-base text-center mb-8">{t("friends.itsYouHint")}</Text>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/friends")}
              className="bg-blue-600 rounded-2xl py-4 px-8"
            >
              <Text className="text-white font-bold text-base">{t("friends.goToFriends")}</Text>
            </TouchableOpacity>
          </>
        ) : alreadyFriends ? (
          <>
            <Text className="text-xl font-bold text-gray-800 mb-2">{inviter.name}</Text>
            <Text className="text-gray-500 text-base text-center mb-8">{t("friends.alreadyFriends")}</Text>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/friends")}
              className="bg-blue-600 rounded-2xl py-4 px-8"
            >
              <Text className="text-white font-bold text-base">{t("friends.goToFriends")}</Text>
            </TouchableOpacity>
          </>
        ) : done === "accepted" ? (
          <>
            <Text className="text-5xl mb-4">🎉</Text>
            <Text className="text-xl font-bold text-gray-800 mb-2">{t("friends.nowFriends", { name: inviter.name })}</Text>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/friends")}
              className="bg-blue-600 rounded-2xl py-4 px-8 mt-4"
            >
              <Text className="text-white font-bold text-base">{t("friends.goToFriends")}</Text>
            </TouchableOpacity>
          </>
        ) : done === "rejected" ? (
          <>
            <Text className="text-gray-500 text-base text-center mb-8">{t("friends.requestDeclined")}</Text>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/album")}
              className="bg-gray-100 rounded-2xl py-4 px-8"
            >
              <Text className="text-gray-700 font-bold text-base">{t("common.ok")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text className="text-2xl font-bold text-gray-800 mb-1">{inviter.name}</Text>
            <Text className="text-gray-500 text-base text-center mb-8">
              {t("friends.addTitle", { name: inviter.name })}
            </Text>
            <View className="flex-row gap-4 w-full">
              <TouchableOpacity
                onPress={handleReject}
                disabled={acting}
                className="flex-1 bg-gray-100 rounded-2xl py-4 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-gray-700 font-semibold text-base">{t("friends.reject")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAccept}
                disabled={acting}
                className="flex-1 bg-blue-600 rounded-2xl py-4 items-center"
                activeOpacity={0.8}
              >
                {acting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">{t("friends.accept")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </>
  );
}
