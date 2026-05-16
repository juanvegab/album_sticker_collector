import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFriendCollection } from "@/hooks/useFriendCollection";
import { useFriends } from "@/hooks/useFriends";
import { useCollection } from "@/hooks/useCollection";
import { sendStickerRequest } from "@/lib/firestore/requests";
import { getProfile } from "@/lib/firestore/users";
import { sendPushNotification } from "@/lib/notifications";
import { StickerPickerPanel } from "@/components/stickers/StickerPickerPanel";
import FontAwesome from "@expo/vector-icons/FontAwesome";

// ── Design tokens ──────────────────────────────────────────────────────
const BG       = "#0B0B0E";
const SURFACE  = "#15161B";
const ELEVATED = "#1C1D24";
const INK      = "#F5F4EE";
const DIM      = "rgba(245,244,238,0.38)";
const DIM3     = "rgba(245,244,238,0.08)";
const BRAND    = "#F4C430";
const GREEN    = "#22C55E";

// Deterministic avatar color from name
const AVATAR_PALETTE = ["#5847C4", "#1FA7A0", "#D9457A", "#2B6FE3", "#10B981", "#E55D4C"];
function avatarBg(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length];
}

export default function FriendDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ friendId: string }>();
  const friendId = Array.isArray(params.friendId) ? params.friendId[0] : params.friendId;
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { friendProfiles } = useFriends();
  const { duplicateStickers, loading } = useFriendCollection(friendId ?? null);
  const { ownedSet } = useCollection();

  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [preselected, setPreselected] = useState(false);

  // IDs of friend's duplicates that I'm missing — used for pre-selection and visual hint
  const neededSet = useMemo(
    () => new Set(duplicateStickers.filter((s) => !ownedSet.has(s.id)).map((s) => s.id)),
    [duplicateStickers, ownedSet]
  );

  // Reset pre-selection flag every time the screen gains focus
  useFocusEffect(useCallback(() => {
    setPreselected(false);
  }, []));

  // Pre-select stickers I need once data is ready
  useEffect(() => {
    if (!loading && !preselected && duplicateStickers.length > 0) {
      setSelected([...neededSet]);
      setPreselected(true);
    }
  }, [loading, preselected, neededSet, duplicateStickers.length]);

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

      const friendProfile = friend ?? await getProfile(friendId);
      if (friendProfile?.expoPushToken) {
        await sendPushNotification(
          friendProfile.expoPushToken,
          t("requests.notifTitle", { name: myName }),
          t("requests.notifBody", { count: selected.length })
        );
      }

      setSelected([]);
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

  // ── Loading ──
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* ── Custom header ── */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: DIM3,
      }}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: ELEVATED,
            alignItems: "center", justifyContent: "center",
            marginRight: 12,
          }}
          activeOpacity={0.7}
        >
          <FontAwesome name="chevron-left" size={14} color={INK} />
        </TouchableOpacity>

        {/* Avatar + name */}
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: avatarBg(friendName),
          alignItems: "center", justifyContent: "center",
          marginRight: 10,
        }}>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>
            {friendName[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: INK, fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
            {friendName}
          </Text>
          <Text style={{ color: DIM, fontSize: 12, marginTop: 1 }}>
            {t("friends.duplicatesCount", { count: duplicateStickers.length })}
          </Text>
        </View>
      </View>

      {/* ── Sticker picker ── */}
      <StickerPickerPanel
        pool={duplicateStickers}
        selected={selected}
        onToggle={toggle}
        needed={neededSet}
        emptyText={t("friends.noDuplicates", { name: friendName })}
      />

      {/* ── Bottom action ── */}
      {duplicateStickers.length > 0 && (
        <View style={{
          backgroundColor: SURFACE,
          borderTopWidth: 1, borderTopColor: DIM3,
          paddingHorizontal: 16, paddingTop: 12,
          paddingBottom: insets.bottom + 12,
        }}>
          <TouchableOpacity
            onPress={handleSendRequest}
            disabled={sending || selected.length === 0}
            style={{
              borderRadius: 14, paddingVertical: 16, alignItems: "center",
              backgroundColor: selected.length > 0 && !sending ? GREEN : ELEVATED,
            }}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{
                fontSize: 15, fontWeight: "800",
                color: selected.length > 0 ? "#fff" : DIM,
              }}>
                {selected.length > 0
                  ? t("friends.sendRequest", { count: selected.length })
                  : t("friends.selectToRequest")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
