import { useState, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Alert, Share, ScrollView, StatusBar, TextInput,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFriends } from "@/hooks/useFriends";
import { useStickerRequests } from "@/hooks/useStickerRequests";
import {
  acceptFriendRequest, rejectFriendRequest,
  getProfile, saveExpoPushToken,
} from "@/lib/firestore/users";
import { markRequestReceived, cancelOutgoingRequest, cancelAcceptedRequest } from "@/lib/firestore/requests";
import { sendPushNotification, registerForPushNotifications } from "@/lib/notifications";
import { RequestCard } from "@/components/friends/RequestCard";
import { RequestDetailModal } from "@/components/friends/RequestDetailModal";
import { TransactionHistoryModal } from "@/components/friends/TransactionHistoryModal";
import { QRModal } from "@/components/friends/QRModal";
import { TrialBanner } from "@/components/premium/TrialBanner";
import type { UserProfile } from "@/types/user";
import type { StickerRequest } from "@/types/request";

// ── Design tokens ──────────────────────────────────────────────────────
const BG       = "#0B0B0E";
const SURFACE  = "#15161B";
const ELEVATED = "#1C1D24";
const INK      = "#F5F4EE";
const DIM      = "rgba(245,244,238,0.38)";
const DIM3     = "rgba(245,244,238,0.08)";
const BRAND    = "#F4C430";
const GREEN    = "#22C55E";
const RED      = "#EF4444";
const ORANGE   = "#F2853A";

const INVITE_BASE = "https://elalbum2026.com/invite";

// Deterministic avatar color from name
const AVATAR_PALETTE = ["#5847C4", "#1FA7A0", "#D9457A", "#2B6FE3", "#10B981", "#E55D4C"];
function avatarBg(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length];
}

// ── Section label ──────────────────────────────────────────────────────
function SectionLabel({ text, count }: { text: string; count: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 20, marginBottom: 10 }}>
      <Text style={{ color: DIM, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
        {text}
      </Text>
      <View style={{
        marginLeft: 6, backgroundColor: ELEVATED,
        borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2,
      }}>
        <Text style={{ color: DIM, fontSize: 10, fontWeight: "700" }}>{count}</Text>
      </View>
    </View>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const bg = avatarBg(name);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg, alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: "#fff", fontSize: size * 0.4, fontWeight: "800" }}>
        {name[0]?.toUpperCase() ?? "?"}
      </Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────
export default function FriendsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { friendProfiles, pendingFrom, loading } = useFriends();
  const { incoming, outgoing, pendingDeliveries, toDeliver } = useStickerRequests();
  const [qrVisible, setQrVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [pendingProfiles, setPendingProfiles] = useState<Record<string, UserProfile>>({});
  const [detailRequest, setDetailRequest] = useState<{
    req: StickerRequest;
    mode: "outgoing" | "toDeliver" | "delivery";
  } | null>(null);

  // Map friendId → profile for quick lookup in outgoing cards
  const friendMap = useMemo(
    () => Object.fromEntries(friendProfiles.map((f) => [f.userId, f])),
    [friendProfiles]
  );

  useEffect(() => {
    if (!user) return;
    registerForPushNotifications().then((token) => {
      if (token) saveExpoPushToken(user.id, token).catch(console.error);
    });
  }, [user?.id]);

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
    } catch { Alert.alert(t("common.error")); }
    finally { setActingOn(null); }
  }

  async function handleRejectFriend(requesterId: string) {
    if (!user) return;
    setActingOn(requesterId);
    try { await rejectFriendRequest(user.id, requesterId); }
    finally { setActingOn(null); }
  }

  async function handleMarkReceived(req: StickerRequest) {
    if (!user) return;
    setActingOn(req.id);
    try {
      await markRequestReceived(req.id, user.id, req.givenStickers ?? []);
      const giverProfile = await getProfile(req.toUserId);
      if (giverProfile?.expoPushToken) {
        const myName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? t("account.userFallback");
        await sendPushNotification(
          giverProfile.expoPushToken,
          t("requests.receivedTitle", { name: myName }),
          t("requests.receivedBody")
        );
      }
    } catch (e) {
      console.error("[markReceived]", e);
      Alert.alert(t("common.error"));
    } finally { setActingOn(null); }
  }

  const filteredFriends = searchQuery.trim()
    ? friendProfiles.filter((f) =>
        f.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : friendProfiles;

  const hasSections =
    pendingFrom.length > 0 || incoming.length > 0 || outgoing.length > 0 ||
    toDeliver.length > 0 || pendingDeliveries.length > 0 || friendProfiles.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
      }}>
        <Text style={{ flex: 1, color: INK, fontSize: 32, fontWeight: "800", letterSpacing: -0.5 }}>
          {t("tabs.friends")}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* History button */}
          <TouchableOpacity
            onPress={() => setHistoryVisible(true)}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: ELEVATED,
              alignItems: "center", justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <FontAwesome name="history" size={16} color={INK} />
          </TouchableOpacity>

          {/* Search button */}
          <TouchableOpacity
            onPress={() => {
              if (searchVisible) {
                setSearchVisible(false);
                setSearchQuery("");
              } else {
                setSearchVisible(true);
              }
            }}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: searchVisible ? "rgba(244,196,48,0.15)" : ELEVATED,
              alignItems: "center", justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <FontAwesome name={searchVisible ? "times" : "search"} size={16} color={searchVisible ? BRAND : INK} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar ── */}
      {searchVisible && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <TextInput
            autoFocus
            placeholder="Buscar amigo..."
            placeholderTextColor="rgba(245,244,238,0.35)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            style={{
              backgroundColor: ELEVATED, borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10,
              color: INK, fontSize: 15,
            }}
          />
        </View>
      )}

      <TrialBanner />

      {/* ── Content ── */}
      {loading ? (
        // Skeleton
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{
              backgroundColor: SURFACE, marginHorizontal: 16, marginTop: 12,
              borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center",
              borderWidth: 1, borderColor: DIM3,
            }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ELEVATED, marginRight: 12 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ height: 12, backgroundColor: ELEVATED, borderRadius: 6, width: "55%" }} />
                <View style={{ height: 10, backgroundColor: ELEVATED, borderRadius: 6, width: "35%" }} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : !hasSections ? (
        // Empty
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>👥</Text>
          <Text style={{ color: INK, fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
            {t("friends.noFriends")}
          </Text>
          <Text style={{ color: DIM, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            {t("friends.noFriendsHint")}
          </Text>
          <TouchableOpacity
            onPress={handleShare}
            style={{
              marginTop: 24, backgroundColor: BRAND, borderRadius: 16,
              paddingHorizontal: 28, paddingVertical: 14,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: BG, fontSize: 15, fontWeight: "800" }}>
              {t("friends.invite")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

          {/* ── Friend requests ── */}
          {pendingFrom.length > 0 && (
            <>
              <SectionLabel text={t("friends.pendingRequests")} count={pendingFrom.length} />
              {pendingFrom.map((requesterId) => {
                loadPendingProfile(requesterId);
                const profile = pendingProfiles[requesterId];
                const name = profile?.name ?? requesterId;
                const isActing = actingOn === requesterId;
                return (
                  <View key={requesterId} style={{
                    backgroundColor: SURFACE, marginHorizontal: 16, marginBottom: 8,
                    borderRadius: 16, padding: 14,
                    borderWidth: 1, borderColor: DIM3,
                    flexDirection: "row", alignItems: "center",
                  }}>
                    <Avatar name={name} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: INK, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }}>
                        {t("friends.wantsToConnect")}
                      </Text>
                    </View>
                    {/* Reject */}
                    <TouchableOpacity
                      onPress={() => handleRejectFriend(requesterId)}
                      disabled={!!isActing}
                      style={{
                        width: 38, height: 38, borderRadius: 19,
                        backgroundColor: "rgba(239,68,68,0.15)",
                        borderWidth: 1.5, borderColor: RED,
                        alignItems: "center", justifyContent: "center",
                        marginRight: 8,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: RED, fontSize: 16, fontWeight: "800", lineHeight: 20 }}>✕</Text>
                    </TouchableOpacity>
                    {/* Accept */}
                    <TouchableOpacity
                      onPress={() => handleAcceptFriend(requesterId)}
                      disabled={!!isActing}
                      style={{
                        width: 38, height: 38, borderRadius: 19,
                        backgroundColor: GREEN,
                        alignItems: "center", justifyContent: "center",
                      }}
                      activeOpacity={0.7}
                    >
                      {isActing
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>✓</Text>
                      }
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {/* ── Incoming sticker requests ── */}
          {incoming.length > 0 && (
            <>
              <SectionLabel text={t("requests.incoming")} count={incoming.length} />
              {incoming.map((req) => (
                <RequestCard key={req.id} request={req} />
              ))}
            </>
          )}

          {/* ── Outgoing requests (sent by me, awaiting response) ── */}
          {outgoing.length > 0 && (
            <>
              <SectionLabel text={t("requests.outgoing")} count={outgoing.length} />
              {outgoing.map((req) => {
                const toName = friendMap[req.toUserId]?.name ?? req.toUserId;
                const preview = req.stickers.slice(0, 4).join(" · ");
                const more = req.stickers.length - 4;
                return (
                  <TouchableOpacity
                    key={req.id}
                    onPress={() => setDetailRequest({ req, mode: "outgoing" })}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: SURFACE, marginHorizontal: 16, marginBottom: 8,
                      borderRadius: 16, padding: 14,
                      borderWidth: 1, borderColor: DIM3,
                      flexDirection: "row", alignItems: "center",
                    }}
                  >
                    <Avatar name={toName} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: INK, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                        {toName}
                      </Text>
                      <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {req.stickers.length} postales · {preview}{more > 0 ? ` +${more}` : ""}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: "rgba(244,196,48,0.12)",
                      borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
                      borderWidth: 1, borderColor: "rgba(244,196,48,0.4)",
                    }}>
                      <Text style={{ color: BRAND, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>
                        ENVIADO
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* ── To deliver (I accepted, need to hand over stickers) ── */}
          {toDeliver.length > 0 && (
            <>
              <SectionLabel text="Para entregar" count={toDeliver.length} />
              {toDeliver.map((req) => {
                const given = req.givenStickers ?? [];
                const preview = given.slice(0, 4).join(" · ");
                const more = given.length - 4;
                return (
                  <TouchableOpacity
                    key={req.id}
                    onPress={() => setDetailRequest({ req, mode: "toDeliver" })}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: SURFACE, marginHorizontal: 16, marginBottom: 8,
                      borderRadius: 16, padding: 14,
                      borderWidth: 1, borderColor: "rgba(34,197,94,0.2)",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: given.length > 0 ? 8 : 0 }}>
                      <Avatar name={req.fromUserName} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: INK, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                          {req.fromUserName}
                        </Text>
                        <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }}>
                          {given.length} postal(es) a entregar
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: "rgba(34,197,94,0.12)",
                        borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
                        borderWidth: 1, borderColor: GREEN,
                      }}>
                        <Text style={{ color: GREEN, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>
                          A ENTREGAR
                        </Text>
                      </View>
                    </View>
                    {given.length > 0 && (
                      <Text style={{ color: DIM, fontSize: 11 }} numberOfLines={1}>
                        {preview}{more > 0 ? ` +${more}` : ""}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* ── Pending deliveries ── */}
          {pendingDeliveries.length > 0 && (
            <>
              <SectionLabel text={t("requests.pendingDelivery")} count={pendingDeliveries.length} />
              {pendingDeliveries.map((req) => {
                const given = req.givenStickers ?? [];
                const preview = given.slice(0, 4).join(" · ");
                const more = given.length - 4;
                const isActing = actingOn === req.id;
                return (
                  <View key={req.id} style={{
                    backgroundColor: SURFACE, marginHorizontal: 16, marginBottom: 8,
                    borderRadius: 16, padding: 14,
                    borderWidth: 1, borderColor: DIM3,
                  }}>
                    {/* Header row — tappable for detail */}
                    <TouchableOpacity
                      onPress={() => setDetailRequest({ req, mode: "delivery" })}
                      activeOpacity={0.7}
                      style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
                    >
                      <Avatar name={req.fromUserName} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: INK, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                          {req.fromUserName} · {t("requests.waitingDelivery", { count: given.length })}
                        </Text>
                        {given.length > 0 && (
                          <Text style={{ color: DIM, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                            {preview}{more > 0 ? ` +${more}` : ""}
                          </Text>
                        )}
                      </View>
                      <View style={{
                        backgroundColor: "rgba(242,133,58,0.15)",
                        borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
                        borderWidth: 1, borderColor: ORANGE,
                      }}>
                        <Text style={{ color: ORANGE, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>
                          {t("requests.pendingLabel").toUpperCase()}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Mark received */}
                    <TouchableOpacity
                      onPress={() => handleMarkReceived(req)}
                      disabled={isActing || given.length === 0}
                      style={{
                        borderRadius: 12, paddingVertical: 13, alignItems: "center",
                        backgroundColor: given.length > 0 && !isActing ? GREEN : ELEVATED,
                      }}
                      activeOpacity={0.8}
                    >
                      {isActing
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={{
                            color: given.length > 0 ? "#fff" : DIM,
                            fontSize: 14, fontWeight: "700",
                          }}>
                            {t("requests.markReceived")}
                          </Text>
                      }
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {/* ── Friends list ── */}
          {friendProfiles.length > 0 && (
            <>
              <SectionLabel text={t("friends.myFriends")} count={filteredFriends.length} />
              {filteredFriends.map((item: UserProfile) => (
                <TouchableOpacity
                  key={item.userId}
                  onPress={() => router.push(`/(tabs)/friends/${item.userId}`)}
                  style={{
                    backgroundColor: SURFACE, marginHorizontal: 16, marginBottom: 8,
                    borderRadius: 16, padding: 14,
                    borderWidth: 1, borderColor: DIM3,
                    flexDirection: "row", alignItems: "center",
                  }}
                  activeOpacity={0.7}
                >
                  <Avatar name={item.name} />
                  <Text style={{ flex: 1, color: INK, fontSize: 15, fontWeight: "600", marginLeft: 12 }}>
                    {item.name}
                  </Text>
                  <FontAwesome name="chevron-right" size={12} color={DIM} />
                </TouchableOpacity>
              ))}
            </>
          )}

        </ScrollView>
      )}

      {/* QR button — floating, always accessible */}
      {!searchVisible && (
        <TouchableOpacity
          onPress={() => setQrVisible(true)}
          style={{
            position: "absolute", bottom: 100, right: 20,
            backgroundColor: BRAND, borderRadius: 28,
            paddingHorizontal: 18, paddingVertical: 12,
            flexDirection: "row", alignItems: "center", gap: 8,
            shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
          }}
          activeOpacity={0.85}
        >
          <FontAwesome name="qrcode" size={16} color="#0B0B0E" />
          <Text style={{ color: "#0B0B0E", fontSize: 13, fontWeight: "800" }}>QR</Text>
        </TouchableOpacity>
      )}

      <QRModal visible={qrVisible} onClose={() => setQrVisible(false)} />

      <TransactionHistoryModal
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        currentUserId={user?.id ?? ""}
        friendMap={friendMap}
      />

      {/* ── Request detail modal ── */}
      {detailRequest && (() => {
        const { req, mode } = detailRequest;
        const toName = friendMap[req.toUserId]?.name ?? req.toUserId;

        if (mode === "outgoing") {
          return (
            <RequestDetailModal
              request={req}
              title={`Para ${toName}`}
              stickers={req.stickers}
              stickersLabel="Postales pedidas"
              stickersColor={INK}
              cancelLabel="Cancelar pedido"
              onClose={() => setDetailRequest(null)}
              onCancel={async () => {
                await cancelOutgoingRequest(req.id);
                setDetailRequest(null);
              }}
            />
          );
        }

        if (mode === "toDeliver") {
          // I am toUserId — stickers I committed to give
          return (
            <RequestDetailModal
              request={req}
              title={`Para ${req.fromUserName}`}
              stickers={req.givenStickers ?? []}
              stickersLabel="Postales a entregar"
              stickersColor={GREEN}
              cancelLabel="Cancelar entrega"
              onClose={() => setDetailRequest(null)}
              onCancel={async () => {
                // toUserId = user.id → restore my own duplicates
                await cancelAcceptedRequest(req.id, user!.id, req.givenStickers ?? []);
                setDetailRequest(null);
              }}
            />
          );
        }

        // mode === "delivery" — I am fromUser, waiting to receive
        return (
          <RequestDetailModal
            request={req}
            title={`De ${req.fromUserName}`}
            stickers={req.givenStickers ?? []}
            stickersLabel="Postales a recibir"
            stickersColor={ORANGE}
            cancelLabel="Eliminar pedido aceptado"
            onClose={() => setDetailRequest(null)}
            onCancel={async () => {
              await cancelAcceptedRequest(req.id, req.toUserId, req.givenStickers ?? []);
              setDetailRequest(null);
            }}
          />
        );
      })()}
    </View>
  );
}
