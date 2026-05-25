import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, Image, StatusBar,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getProfile, acceptFriendRequest } from "@/lib/firestore/users";
import { sendPushNotification } from "@/lib/notifications";
import type { UserProfile } from "@/types/user";

// ── Design tokens (same as app) ────────────────────────────────────────
const BG      = "#0B0B0E";
const SURFACE = "#15161B";
const CARD    = "#1C1D24";
const INK     = "#F5F4EE";
const DIM     = "rgba(245,244,238,0.45)";
const DIM3    = "rgba(245,244,238,0.08)";
const BRAND   = "#F4C430";
const GREEN   = "#22C55E";
const RED     = "#EF4444";

export default function InviteScreen() {
  const { t } = useTranslation();
  const { userId: inviterId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      if (inviter.expoPushToken) {
        const myName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? t("account.userFallback");
        await sendPushNotification(
          inviter.expoPushToken,
          t("friends.acceptedTitle", { name: myName }),
          t("friends.acceptedBody"),
          { screen: "friends" }
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
      setDone("rejected");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  if (!inviter) {
    return (
      <>
        <Stack.Screen options={{ title: t("friends.addFriend"), headerStyle: { backgroundColor: SURFACE }, headerTintColor: INK }} />
        <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <StatusBar barStyle="light-content" backgroundColor={BG} />
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
          <Text style={{ color: DIM, fontSize: 15, textAlign: "center" }}>{t("friends.userNotFound")}</Text>
        </View>
      </>
    );
  }

  const avatarInitial = inviter.name[0]?.toUpperCase() ?? "?";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <View style={{
        flex: 1, backgroundColor: BG,
        alignItems: "center", justifyContent: "center",
        paddingHorizontal: 32, paddingTop: insets.top, paddingBottom: insets.bottom + 24,
      }}>

        {/* App badge */}
        <View style={{
          backgroundColor: BRAND, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6,
          marginBottom: 32,
        }}>
          <Text style={{ color: "#0B0B0E", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 }}>
            El Álbum 2026
          </Text>
        </View>

        {/* Avatar */}
        {inviter.avatarUrl ? (
          <Image
            source={{ uri: inviter.avatarUrl }}
            style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 16, borderWidth: 3, borderColor: CARD }}
          />
        ) : (
          <View style={{
            width: 96, height: 96, borderRadius: 48,
            backgroundColor: CARD, alignItems: "center", justifyContent: "center",
            marginBottom: 16, borderWidth: 2, borderColor: DIM3,
          }}>
            <Text style={{ fontSize: 36, fontWeight: "800", color: BRAND }}>
              {avatarInitial}
            </Text>
          </View>
        )}

        {isSelf ? (
          <>
            <Text style={{ color: INK, fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 8 }}>
              {t("friends.itsYou")}
            </Text>
            <Text style={{ color: DIM, fontSize: 14, textAlign: "center", marginBottom: 32, lineHeight: 21 }}>
              {t("friends.itsYouHint")}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/friends")}
              style={{ backgroundColor: BRAND, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: "100%", alignItems: "center" }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#0B0B0E", fontWeight: "800", fontSize: 16 }}>
                {t("friends.goToFriends")}
              </Text>
            </TouchableOpacity>
          </>
        ) : alreadyFriends ? (
          <>
            <Text style={{ color: INK, fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 4 }}>
              {inviter.name}
            </Text>
            <Text style={{ color: DIM, fontSize: 14, textAlign: "center", marginBottom: 32 }}>
              {t("friends.alreadyFriends")}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/friends")}
              style={{ backgroundColor: BRAND, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: "100%", alignItems: "center" }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#0B0B0E", fontWeight: "800", fontSize: 16 }}>
                {t("friends.goToFriends")}
              </Text>
            </TouchableOpacity>
          </>
        ) : done === "accepted" ? (
          <>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
            <Text style={{ color: INK, fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 8 }}>
              {t("friends.nowFriends", { name: inviter.name })}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/friends")}
              style={{ backgroundColor: BRAND, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: "100%", alignItems: "center", marginTop: 24 }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#0B0B0E", fontWeight: "800", fontSize: 16 }}>
                {t("friends.goToFriends")}
              </Text>
            </TouchableOpacity>
          </>
        ) : done === "rejected" ? (
          <>
            <Text style={{ color: DIM, fontSize: 15, textAlign: "center", marginBottom: 32 }}>
              {t("friends.requestDeclined")}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/resumen")}
              style={{ backgroundColor: CARD, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, borderWidth: 1, borderColor: DIM3, width: "100%", alignItems: "center" }}
              activeOpacity={0.85}
            >
              <Text style={{ color: INK, fontWeight: "700", fontSize: 15 }}>
                {t("common.ok")}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={{ color: INK, fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 4 }}>
              {inviter.name}
            </Text>
            <Text style={{ color: DIM, fontSize: 14, textAlign: "center", marginBottom: 32, lineHeight: 21 }}>
              {t("friends.addTitle", { name: inviter.name })}
            </Text>

            <TouchableOpacity
              onPress={handleAccept}
              disabled={acting}
              style={{
                backgroundColor: GREEN, borderRadius: 16,
                paddingVertical: 16, width: "100%", alignItems: "center",
                marginBottom: 12,
              }}
              activeOpacity={0.85}
            >
              {acting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                  {t("friends.accept")}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleReject}
              disabled={acting}
              style={{
                backgroundColor: CARD, borderRadius: 16,
                paddingVertical: 14, width: "100%", alignItems: "center",
                borderWidth: 1, borderColor: DIM3,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: DIM, fontWeight: "600", fontSize: 15 }}>
                {t("friends.reject")}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );
}
