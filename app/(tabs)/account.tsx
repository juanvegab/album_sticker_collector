import { useState, useMemo, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Alert, Modal, Share,
  ScrollView, Linking, ActivityIndicator, StatusBar, Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCollection } from "@/hooks/useCollection";
import { WORLD_CUP_2026 } from "@/lib/data/world-cup-2026";
import { usePremium } from "@/hooks/usePremium";
import { usePremiumStore } from "@/store/premiumStore";
import { purchaseNoAds, restorePurchases } from "@/lib/purchases";
import { changeLanguage } from "@/lib/i18n";
import { deleteUserAccount } from "@/lib/firestore/users";
import { useCollectionStore } from "@/store/collectionStore";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import i18n from "i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ImportModal } from "@/components/import/ImportModal";
import * as ExpoNotifications from "expo-notifications";

const ONBOARDING_KEY = (uid: string) => `onboarding_v2_shown_${uid}`;

// ── Design tokens ──────────────────────────────────────────────────────
const BG       = "#0B0B0E";
const SURFACE  = "#15161B";
const ELEVATED = "#1C1D24";
const INK      = "#F5F4EE";
const DIM      = "rgba(245,244,238,0.38)";
const DIM3     = "rgba(245,244,238,0.08)";
const BRAND    = "#F4C430";
const GREEN    = "#22C55E";
const ORANGE   = "#F2853A";
const RED      = "#EF4444";

type LangCode = "es" | "en" | "pt";

// ── StatCard ──────────────────────────────────────────────────────────
function StatCard({ value, label, valueColor }: {
  value: number; label: string; valueColor: string;
}) {
  return (
    <View style={{
      flex: 1, backgroundColor: ELEVATED, borderRadius: 12,
      paddingVertical: 14, paddingHorizontal: 10, alignItems: "center",
    }}>
      <Text style={{ color: valueColor, fontSize: 28, fontWeight: "800", lineHeight: 32 }}>
        {value}
      </Text>
      <Text style={{ color: DIM, fontSize: 11, fontWeight: "700",
        letterSpacing: 0.8, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

// ── Row ───────────────────────────────────────────────────────────────
function SettingsRow({
  label, right, onPress, isFirst, isLast, danger = false,
}: {
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  danger?: boolean;
}) {
  const radius = {
    borderTopLeftRadius: isFirst ? 16 : 0,
    borderTopRightRadius: isFirst ? 16 : 0,
    borderBottomLeftRadius: isLast ? 16 : 0,
    borderBottomRightRadius: isLast ? 16 : 0,
  };
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <>
      <Wrapper
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: SURFACE,
          paddingHorizontal: 16, paddingVertical: 14,
          ...radius,
        }}
      >
        <Text style={{
          flex: 1, fontSize: 15,
          color: danger ? RED : INK,
          fontWeight: danger ? "600" : "400",
        }}>
          {label}
        </Text>
        {right}
      </Wrapper>
      {!isLast && (
        <View style={{ height: 1, backgroundColor: DIM3, marginLeft: 16 }} />
      )}
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────
export default function AccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { ownedSet, duplicates, scheduleSave } = useCollection();
  const { isPremium, isTrialActive, trialDaysLeft } = usePremium();
  const { isPurchasing, setIsPurchasing, setIsPremium } = usePremiumStore();
  const [lang, setLang] = useState<LangCode>((i18n.language as LangCode) ?? "es");
  const isEs = lang === "es";
  const isPt = lang === "pt";
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [shareOwned, setShareOwned] = useState(false);
  const [shareMissing, setShareMissing] = useState(false);
  const [shareRepeated, setShareRepeated] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  const totalStickers = WORLD_CUP_2026.totalStickers;
  const owned = ownedSet.size;
  const missing = totalStickers - owned;
  const totalDuplicates = Object.values(duplicates).reduce((sum, n) => sum + Math.max(0, n), 0);

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress ??
    t("account.userFallback");
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const trialActive = isTrialActive();
  const days = trialDaysLeft();
  const trialLabel = days === 1
    ? t("premium.lastDay").replace("⏳ ", "")
    : `${days} ${t("resumen.trialDays", { count: days }).replace(/\d+ /, "")}`.trim();

  // ── Check notification permission ──
  useEffect(() => {
    ExpoNotifications.getPermissionsAsync().then(({ status }) => {
      setNotifGranted(status === "granted");
    });
  }, []);

  // ── Handlers ──
  function handleSignOut() {
    Alert.alert(t("account.signOutTitle"), t("account.signOutConfirm"), [
      { text: t("common.cancel") },
      { text: t("account.signOutYes"), style: "destructive", onPress: () => signOut().catch(console.error) },
    ]);
  }

  function handleResetCollection() {
    Alert.alert(
      isEs ? "Limpiar colección" : isPt ? "Limpar coleção" : "Reset collection",
      isEs ? "Se borrarán todas tus postales marcadas y repetidas. ¿Estás seguro?"
           : isPt ? "Todas as suas figurinhas marcadas e repetidas serão apagadas. Tem certeza?"
           : "All your marked stickers and duplicates will be cleared. Are you sure?",
      [
        { text: isEs ? "Cancelar" : isPt ? "Cancelar" : "Cancel", style: "cancel" },
        {
          text: isEs ? "Limpiar todo" : isPt ? "Limpar tudo" : "Clear all",
          style: "destructive",
          onPress: () => {
            const col = useCollectionStore.getState().collection;
            if (!col) return;
            useCollectionStore.getState().setCollection({ ...col, owned: [], duplicates: {} });
            scheduleSave();
          },
        },
      ]
    );
  }

  function handleDeleteAccount() {
    Alert.alert(t("account.deleteTitle"), t("account.deleteConfirm"), [
      { text: t("common.cancel") },
      { text: t("account.deleteYes"), style: "destructive", onPress: confirmDeleteAccount },
    ]);
  }

  async function confirmDeleteAccount() {
    if (!user) return;
    setDeletingAccount(true);
    try {
      await deleteUserAccount(user.id);
      await user.delete();
    } catch {
      Alert.alert(t("common.error"), t("account.deleteError"));
      setDeletingAccount(false);
    }
  }

  async function handleViewTour() {
    if (!user?.id) return;
    await AsyncStorage.removeItem(ONBOARDING_KEY(user.id));
    router.push("/(tabs)/resumen");
  }

  async function handleLanguageChange() {
    const next: LangCode = lang === "es" ? "en" : lang === "en" ? "pt" : "es";
    setLang(next);
    await changeLanguage(next);
  }

  async function handlePurchase() {
    setIsPurchasing(true);
    try {
      const success = await purchaseNoAds();
      if (success) {
        setIsPremium(true);
        if (user) {
          await setDoc(doc(db, "users", user.id, "profile", "premium"), { isPremium: true }, { merge: true });
        }
        Alert.alert(t("premium.successTitle"), t("premium.successMsg"));
      }
    } catch (err: any) {
      if (err?.code !== 1 && err?.message !== "no_package") {
        Alert.alert(t("common.error"), t("premium.purchaseError"));
      }
    } finally {
      setIsPurchasing(false);
    }
  }

  async function handleRestore() {
    setIsPurchasing(true);
    try {
      const hasPremium = await restorePurchases();
      if (hasPremium) {
        setIsPremium(true);
        if (user) {
          await setDoc(doc(db, "users", user.id, "profile", "premium"), { isPremium: true }, { merge: true });
        }
        Alert.alert(t("premium.successTitle"), t("premium.restoreSuccess"));
      } else {
        Alert.alert(t("premium.restoreTitle"), t("premium.restoreNotFound"));
      }
    } catch {
      Alert.alert(t("common.error"), t("premium.purchaseError"));
    } finally {
      setIsPurchasing(false);
    }
  }

  // ── Share list ──
  // Pre-compute as the user toggles checkboxes — zero cost on tap
  const shareText = useMemo(() => {
    const allStickers = WORLD_CUP_2026.sections.flatMap((s) => s.stickers);
    const parts: string[] = [];
    parts.push(isEs ? "Mi Álbum 2026 ⚽" : isPt ? "Meu Álbum 2026 ⚽" : "My 2026 Album ⚽");
    parts.push("");

    if (shareRepeated) {
      const ids = allStickers.filter((s) => (duplicates[s.id] ?? 0) > 0).map((s) => s.id);
      parts.push(isEs ? `🔁 REPETIDAS (${ids.length})` : isPt ? `🔁 REPETIDAS (${ids.length})` : `🔁 DUPLICATES (${ids.length})`);
      parts.push(ids.join(", "));
      parts.push("");
    }
    if (shareMissing) {
      const ids = allStickers.filter((s) => !ownedSet.has(s.id)).map((s) => s.id);
      parts.push(isEs ? `❌ ME FALTAN (${ids.length})` : isPt ? `❌ FALTAM (${ids.length})` : `❌ MISSING (${ids.length})`);
      parts.push(ids.join(", "));
      parts.push("");
    }
    if (shareOwned) {
      const ids = allStickers.filter((s) => ownedSet.has(s.id)).map((s) => s.id);
      parts.push(isEs ? `✅ TENGO (${ids.length})` : isPt ? `✅ TENHO (${ids.length})` : `✅ HAVE (${ids.length})`);
      parts.push(ids.join(", "));
      parts.push("");
    }
    parts.push(isEs
      ? "Descargá la app 👉 https://elalbum2026.com/"
      : isPt
        ? "Baixe o app 👉 https://elalbum2026.com/"
        : "Get the app 👉 https://elalbum2026.com/");
    return parts.join("\n").trim();
  }, [shareOwned, shareMissing, shareRepeated, ownedSet, duplicates, lang]);

  async function handleShareList() {
    if (!shareOwned && !shareMissing && !shareRepeated) return;
    setIsSharing(true);
    try {
      await Share.share({ message: shareText });
    } finally {
      setIsSharing(false);
      setShareModalVisible(false);
    }
  }

  const langLabel = lang === "es" ? "Español" : lang === "pt" ? "Português" : "English";

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header title ── */}
        <Text style={{
          color: INK, fontSize: 22, fontWeight: "800",
          letterSpacing: -0.3, marginBottom: 16, textAlign: "center",
        }}>
          {t("tabs.account")}
        </Text>

        {/* ── Profile gradient card ── */}
        <LinearGradient
          colors={["#F4C430", "#F2853A", "#E04020"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, padding: 20, marginBottom: 12 }}
        >
          {/* Avatar + name row */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: "rgba(0,0,0,0.55)",
              alignItems: "center", justifyContent: "center",
              marginRight: 14,
            }}>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#0B0B0E", fontSize: 18, fontWeight: "800" }} numberOfLines={1}>
                {displayName}
              </Text>
              {email ? (
                <Text style={{ color: "rgba(0,0,0,0.55)", fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                  {email}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Trial / premium pill */}
          {!isPremium && (
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={isPurchasing}
              activeOpacity={0.85}
              style={{
                backgroundColor: "rgba(0,0,0,0.40)",
                borderRadius: 99,
                paddingHorizontal: 16, paddingVertical: 11,
                flexDirection: "row", alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700", flex: 1 }}>
                {trialActive
                  ? `${days} ${isEs ? "DÍAS SIN ADS" : isPt ? "DIAS SEM ADS" : "DAYS WITHOUT ADS"}`
                  : t("premium.trialEnded").replace("🚨 ", "")}
              </Text>
              {isPurchasing ? (
                <ActivityIndicator color={BRAND} size="small" />
              ) : (
                <Text style={{ color: BRAND, fontSize: 13, fontWeight: "800" }}>
                  {t("premium.removeAds")} →
                </Text>
              )}
            </TouchableOpacity>
          )}

          {isPremium && (
            <View style={{
              backgroundColor: "rgba(0,0,0,0.30)",
              borderRadius: 99, paddingHorizontal: 16, paddingVertical: 11,
              flexDirection: "row", alignItems: "center",
            }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700", flex: 1 }}>
                ✓ {isEs ? "Sin anuncios" : isPt ? "Sem anúncios" : "No ads"}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Stats row ── */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          <StatCard value={owned} label={t("resumen.owned")} valueColor={GREEN} />
          <StatCard value={missing} label={t("resumen.missing")} valueColor={INK} />
          <StatCard value={totalDuplicates} label={t("resumen.repeated")} valueColor={ORANGE} />
        </View>

        {/* ── Importar colección — prominent card ── */}
        <TouchableOpacity
          onPress={() => setImportVisible(true)}
          activeOpacity={0.82}
          style={{
            backgroundColor: ELEVATED, borderRadius: 16,
            padding: 16, marginBottom: 8,
            flexDirection: "row", alignItems: "center", gap: 14,
            borderWidth: 1, borderColor: "rgba(244,196,48,0.18)",
          }}
        >
          <View style={{
            width: 42, height: 42, borderRadius: 12,
            backgroundColor: "rgba(244,196,48,0.13)",
            alignItems: "center", justifyContent: "center",
          }}>
            <MaterialCommunityIcons name="file-import" size={22} color={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: INK, fontSize: 15, fontWeight: "700", marginBottom: 2 }}>
              {isEs ? "Importar colección" : isPt ? "Importar coleção" : "Import collection"}
            </Text>
            <Text style={{ color: DIM, fontSize: 12, lineHeight: 17 }}>
              {isEs ? "Pegá tu lista de postales y la cargamos automáticamente"
                     : isPt ? "Cole sua lista de figurinhas e carregamos automaticamente"
                     : "Paste your sticker list and we'll load it automatically"}
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={DIM} />
        </TouchableOpacity>

        {/* ── Compartir lista — prominent card ── */}
        <TouchableOpacity
          onPress={() => setShareModalVisible(true)}
          activeOpacity={0.82}
          style={{
            backgroundColor: ELEVATED, borderRadius: 16,
            padding: 16, marginBottom: 12,
            flexDirection: "row", alignItems: "center", gap: 14,
            borderWidth: 1, borderColor: "rgba(244,196,48,0.18)",
          }}
        >
          <View style={{
            width: 42, height: 42, borderRadius: 12,
            backgroundColor: "rgba(244,196,48,0.13)",
            alignItems: "center", justifyContent: "center",
          }}>
            <FontAwesome name="share-alt" size={18} color={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: INK, fontSize: 15, fontWeight: "700", marginBottom: 2 }}>
              {isEs ? "Compartir lista" : isPt ? "Compartilhar lista" : "Share list"}
            </Text>
            <Text style={{ color: DIM, fontSize: 12, lineHeight: 17 }}>
              {isEs ? "Mandá tus repetidas, faltantes o todo tu álbum por WhatsApp"
                     : isPt ? "Envie suas repetidas, faltantes ou todo o álbum pelo WhatsApp"
                     : "Send your duplicates, missing or full album via WhatsApp"}
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={DIM} />
        </TouchableOpacity>

        {/* ── Settings ── */}
        <View style={{ marginBottom: 12 }}>
          <SettingsRow
            label={t("account.language")}
            onPress={handleLanguageChange}
            isFirst
            right={
              <Text style={{ color: DIM, fontSize: 14 }}>{langLabel}</Text>
            }
          />
          <SettingsRow
            label={t("account.notifications")}
            right={
              notifGranted !== null ? (
                <Text style={{ color: notifGranted ? GREEN : DIM, fontSize: 14 }}>
                  {notifGranted
                    ? t("account.notificationsEnabled")
                    : (isEs ? "Desactivadas" : isPt ? "Desativadas" : "Disabled")}
                </Text>
              ) : null
            }
          />
          <SettingsRow
            label={t("account.visitSite")}
            onPress={() => Linking.openURL("https://elalbum2026.com/")}
            right={<FontAwesome name="chevron-right" size={12} color={DIM} />}
          />
          <SettingsRow
            label={t("account.privacyPolicy")}
            onPress={() => Linking.openURL("https://elalbum2026.com/privacy")}
            right={<FontAwesome name="chevron-right" size={12} color={DIM} />}
          />
          <SettingsRow
            label={isEs ? "Ver tour de funciones" : isPt ? "Ver tour de funcionalidades" : "View feature tour"}
            onPress={handleViewTour}
            isLast
            right={<MaterialCommunityIcons name="compass-outline" size={16} color={DIM} />}
          />
        </View>

        {/* ── Sign out ── */}
        <View style={{ marginBottom: 8 }}>
          <SettingsRow
            label={t("account.signOut")}
            onPress={handleSignOut}
            isFirst
            isLast
            danger
          />
        </View>

        {/* ── Footer ── */}
        <View style={{ alignItems: "center", marginTop: 8, marginBottom: 4 }}>
          <Text style={{ color: DIM, fontSize: 12 }}>
            El Álbum 2026 · v1.1.1
          </Text>
        </View>

        {/* ── Danger zone ── */}
        <View style={{ marginBottom: 8 }}>
          <SettingsRow
            label={isEs ? "Limpiar colección" : isPt ? "Limpar coleção" : "Reset collection"}
            onPress={handleResetCollection}
            isFirst
            danger
            right={<FontAwesome name="refresh" size={15} color={RED} />}
          />
          <SettingsRow
            label={deletingAccount ? "..." : t("account.deleteAccount")}
            onPress={deletingAccount ? undefined : handleDeleteAccount}
            isLast
            danger
            right={deletingAccount
              ? <ActivityIndicator size="small" color={RED} />
              : <FontAwesome name="trash-o" size={15} color={RED} />
            }
          />
        </View>
      </ScrollView>

      {/* ── Import modal ── */}
      <ImportModal visible={importVisible} onClose={() => setImportVisible(false)} />

      {/* ── Share list modal ── */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
          onPress={() => setShareModalVisible(false)}
        >
          <Pressable onPress={() => {}} style={{
            backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
          }}>
            {/* Handle */}
            <View style={{
              width: 36, height: 4, borderRadius: 2,
              backgroundColor: DIM, alignSelf: "center", marginBottom: 20,
            }} />

            <Text style={{ color: INK, fontSize: 18, fontWeight: "800", marginBottom: 4 }}>
              {isEs ? "Compartir lista" : isPt ? "Compartilhar lista" : "Share list"}
            </Text>
            <Text style={{ color: DIM, fontSize: 13, marginBottom: 24 }}>
              {isEs ? "Elige qué postales incluir en el mensaje"
                    : isPt ? "Escolha quais figurinhas incluir na mensagem"
                    : "Choose which stickers to include"}
            </Text>

            {/* Checkboxes */}
            {([
              { key: "repeated", label: isEs ? "🔁 Repetidas" : isPt ? "🔁 Repetidas" : "🔁 Duplicates",
                count: Object.values(duplicates).reduce((sum, n) => sum + Math.max(0, n), 0),
                value: shareRepeated, set: setShareRepeated },
              { key: "missing", label: isEs ? "❌ Me faltan" : isPt ? "❌ Faltam" : "❌ Missing",
                count: totalStickers - owned,
                value: shareMissing, set: setShareMissing },
              { key: "owned", label: isEs ? "✅ Tengo" : isPt ? "✅ Tenho" : "✅ Have",
                count: owned,
                value: shareOwned, set: setShareOwned },
            ] as const).map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => item.set(!item.value)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: ELEVATED, borderRadius: 14,
                  paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
                  borderWidth: 1.5,
                  borderColor: item.value ? BRAND : "transparent",
                }}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 6, marginRight: 14,
                  backgroundColor: item.value ? BRAND : DIM3,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: item.value ? 0 : 1.5, borderColor: DIM,
                }}>
                  {item.value && (
                    <FontAwesome name="check" size={12} color="#0B0B0E" />
                  )}
                </View>
                <Text style={{ flex: 1, color: INK, fontSize: 15, fontWeight: "600" }}>
                  {item.label}
                </Text>
                <Text style={{ color: DIM, fontSize: 13, fontWeight: "600" }}>
                  {item.count}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Share button */}
            <TouchableOpacity
              onPress={handleShareList}
              disabled={isSharing || (!shareOwned && !shareMissing && !shareRepeated)}
              activeOpacity={0.85}
              style={{
                marginTop: 12, borderRadius: 14, paddingVertical: 15, alignItems: "center",
                backgroundColor: (shareOwned || shareMissing || shareRepeated) ? BRAND : DIM3,
              }}
            >
              {isSharing ? (
                <ActivityIndicator color={BG} size="small" />
              ) : (
                <Text style={{
                  fontSize: 16, fontWeight: "800",
                  color: (shareOwned || shareMissing || shareRepeated) ? BG : DIM,
                }}>
                  {isEs ? "Compartir 🚀" : isPt ? "Compartilhar 🚀" : "Share 🚀"}
                </Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
