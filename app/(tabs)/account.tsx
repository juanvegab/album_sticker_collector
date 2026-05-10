import { useState } from "react";
import {
  View, Text, TouchableOpacity, Alert,
  ScrollView, Linking, ActivityIndicator, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import i18n from "i18next";
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
const ORANGE   = "#F2853A";
const RED      = "#EF4444";

type LangCode = "es" | "en";

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
  const { user } = useUser();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { ownedSet, duplicates } = useCollection();
  const { isPremium, isTrialActive, trialDaysLeft } = usePremium();
  const { isPurchasing, setIsPurchasing, setIsPremium } = usePremiumStore();
  const [lang, setLang] = useState<LangCode>((i18n.language as LangCode) ?? "es");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const totalStickers = WORLD_CUP_2026.totalStickers;
  const owned = ownedSet.size;
  const missing = totalStickers - owned;
  const totalDuplicates = Object.values(duplicates).filter((n) => n > 0).length;

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

  // ── Handlers ──
  function handleSignOut() {
    Alert.alert(t("account.signOutTitle"), t("account.signOutConfirm"), [
      { text: t("common.cancel") },
      { text: t("account.signOutYes"), style: "destructive", onPress: () => signOut().catch(console.error) },
    ]);
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

  async function handleLanguageChange() {
    const next: LangCode = lang === "es" ? "en" : "es";
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

  const langLabel = lang === "es" ? "Español" : "English";

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
                  ? `${days} ${lang === "es" ? "DÍAS SIN ADS" : "DAYS WITHOUT ADS"}`
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
                ✓ {lang === "es" ? "Sin anuncios" : "No ads"}
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
            right={<Text style={{ color: DIM, fontSize: 14 }}>{t("account.notificationsEnabled")}</Text>}
          />
          <SettingsRow
            label={t("account.visitSite")}
            onPress={() => Linking.openURL("https://elalbum2026.com/")}
            right={<FontAwesome name="chevron-right" size={12} color={DIM} />}
          />
          <SettingsRow
            label={t("account.privacyPolicy")}
            onPress={() => Linking.openURL("https://elalbum2026.com/privacy")}
            isLast
            right={<FontAwesome name="chevron-right" size={12} color={DIM} />}
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
            El Álbum 2026 · v1.0.0
          </Text>
        </View>

        {/* ── Delete account (subtle) ── */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
          style={{ alignItems: "center", paddingVertical: 10 }}
          activeOpacity={0.6}
        >
          {deletingAccount ? (
            <ActivityIndicator size="small" color={DIM} />
          ) : (
            <Text style={{ color: DIM, fontSize: 12, opacity: 0.5 }}>
              {t("account.deleteAccount")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
