import { useMemo, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StatusBar, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useCollection } from "@/hooks/useCollection";
import { usePremiumStore } from "@/store/premiumStore";
import { WORLD_CUP_2026, TEAM_GROUP, CC_STICKER_IDS } from "@/lib/data/world-cup-2026";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { TrialBanner } from "@/components/premium/TrialBanner";
import { ImportModal } from "@/components/import/ImportModal";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

// ── Group color palette (matches design tokens) ───────────────────────
const GROUP_COLORS: Record<string, string> = {
  FWC: "#F4C430",
  A: "#1FA7A0", B: "#E2453C", C: "#7FB832", D: "#2B6FE3",
  E: "#5847C4", F: "#F2853A", G: "#D9457A", H: "#5BB3D6",
  I: "#3B8C5B", J: "#E55D4C", K: "#9333EA", L: "#0EA5E9",
  CC: "#DC2626",
};

const GROUP_ORDER = ["A","B","C","D","E","F","G","H","I","J","K","L"];

type SectionGroup = {
  id: string; badge: string; name: string;
  color: string; total: number; owned: number;
  codes?: string[];
};

// ── StatCard ──────────────────────────────────────────────────────────
function StatCard({ value, label, valueColor }: {
  value: number; label: string; valueColor: string;
}) {
  return (
    <View style={{
      flex: 1, backgroundColor: "#1C1D24", borderRadius: 12,
      paddingVertical: 14, paddingHorizontal: 10, alignItems: "center",
    }}>
      <Text style={{ color: valueColor, fontSize: 28, fontWeight: "800", lineHeight: 32 }}>
        {value}
      </Text>
      <Text style={{ color: "rgba(245,244,238,0.38)", fontSize: 11, fontWeight: "700",
        letterSpacing: 0.8, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

// ── SectionRow ────────────────────────────────────────────────────────
function SectionRow({ item, onPress }: { item: SectionGroup; onPress: () => void }) {
  const pct = item.total > 0 ? item.owned / item.total : 0;
  const isFwc = item.id === "FWC";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#15161B", borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8,
      }}>
      {/* Badge */}
      <View style={{
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: item.color,
        alignItems: "center", justifyContent: "center", marginRight: 12,
      }}>
        <Text style={{
          color: isFwc ? "#0B0B0E" : "#fff",
          fontWeight: "800",
          fontSize: isFwc ? 10 : 14,
        }}>
          {item.badge}
        </Text>
      </View>

      {/* Name + codes + progress bar */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#F5F4EE", fontSize: 15, fontWeight: "600", marginBottom: 2 }}>
          {item.name}
        </Text>
        {item.codes && item.codes.length > 0 && (
          <Text style={{
            color: "rgba(245,244,238,0.28)", fontSize: 10,
            fontWeight: "600", letterSpacing: 0.3, marginBottom: 6,
          }}>
            {item.codes.join(" · ")}
          </Text>
        )}
        <View style={{ height: 3, backgroundColor: "rgba(245,244,238,0.12)", borderRadius: 99,
          marginTop: item.codes && item.codes.length > 0 ? 0 : 6 }}>
          <View style={{
            height: 3, borderRadius: 99,
            backgroundColor: item.color,
            width: `${Math.round(pct * 100)}%`,
          }} />
        </View>
      </View>

      {/* Count */}
      <Text style={{ color: "rgba(245,244,238,0.38)", fontSize: 13,
        fontWeight: "600", marginLeft: 12 }}>
        {item.owned}/{item.total}
      </Text>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────
export default function ResumenScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { ownedSet, duplicates } = useCollection();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const trialDaysLeft = usePremiumStore((s) => s.trialDaysLeft());
  const isTrialActive = usePremiumStore((s) => s.isTrialActive());

  const [importVisible, setImportVisible] = useState(false);

  const total = WORLD_CUP_2026.totalStickers;
  // Exclude CC stickers from main album stats
  const owned = useMemo(
    () => [...ownedSet].filter((id) => !CC_STICKER_IDS.has(id)).length,
    [ownedSet]
  );
  const missing = total - owned;
  const duplicateCount = Object.values(duplicates).reduce((sum, n) => sum + Math.max(0, n), 0);
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  const firstName = user?.firstName ?? t("resumen.defaultName");

  // Build grouped section summaries
  const groups = useMemo<SectionGroup[]>(() => {
    const result: SectionGroup[] = [];

    // FWC section (always first)
    const fwcSec = WORLD_CUP_2026.sections[0];
    const fwcOwned = fwcSec.stickers.filter((s) => ownedSet.has(s.id)).length;
    result.push({
      id: "FWC", badge: "FWC", name: t("resumen.fwcName"),
      color: GROUP_COLORS.FWC,
      total: fwcSec.stickers.length, owned: fwcOwned,
    });

    // Aggregate by group
    const groupData: Record<string, { total: number; owned: number; codes: string[] }> = {};
    for (const section of WORLD_CUP_2026.sections.slice(1)) {
      const letter = TEAM_GROUP[section.id];
      if (!letter) continue;
      if (!groupData[letter]) groupData[letter] = { total: 0, owned: 0, codes: [] };
      groupData[letter].total += section.stickers.length;
      groupData[letter].owned += section.stickers.filter((s) => ownedSet.has(s.id)).length;
      groupData[letter].codes.push(section.id);
    }
    for (const letter of GROUP_ORDER) {
      if (!groupData[letter]) continue;
      result.push({
        id: letter, badge: letter,
        name: t("resumen.group", { letter }),
        color: GROUP_COLORS[letter] ?? "#9CA3AF",
        ...groupData[letter],
      });
    }

    // CC section — optional, at the end
    const ccSec = WORLD_CUP_2026.sections.find((s) => s.id === "CC");
    if (ccSec) {
      const ccOwned = ccSec.stickers.filter((s) => ownedSet.has(s.id)).length;
      result.push({
        id: "CC", badge: "CC", name: "CC",
        color: GROUP_COLORS.CC ?? "#DC2626",
        total: ccSec.stickers.length, owned: ccOwned,
      });
    }

    return result;
  }, [ownedSet, t]);

  const trialLabel = trialDaysLeft === 1
    ? t("resumen.trialLastDay")
    : t("resumen.trialDays", { count: trialDaysLeft });

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0E" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      {/* ── Fixed top section ── */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 14, fontWeight: "500" }}>
              {t("resumen.hello")} {firstName}
            </Text>
            <Text style={{ color: "#F5F4EE", fontSize: 38, fontWeight: "800", lineHeight: 44 }}>
              {t("resumen.myAlbum")}
            </Text>
          </View>

          {/* Right-side actions */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            {/* Trial chip (only when trial active and not premium) */}
            {isTrialActive && !isPremium && (
              <View style={{
                backgroundColor: "rgba(244,196,48,0.15)",
                borderRadius: 999, borderWidth: 1,
                borderColor: "rgba(244,196,48,0.4)",
                paddingHorizontal: 12, paddingVertical: 6,
                flexDirection: "row", alignItems: "center",
              }}>
                <View style={{ width: 7, height: 7, borderRadius: 99,
                  backgroundColor: "#F4C430", marginRight: 6 }} />
                <Text style={{ color: "#F4C430", fontSize: 12, fontWeight: "700" }}>
                  {trialLabel}
                </Text>
              </View>
            )}

            {/* Import button */}
            <TouchableOpacity
              onPress={() => setImportVisible(true)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: "rgba(244,196,48,0.12)",
                borderWidth: 1, borderColor: "rgba(244,196,48,0.25)",
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
              }}
            >
              <MaterialCommunityIcons name="file-import" size={16} color="#F4C430" />
              <Text style={{ color: "#F4C430", fontSize: 13, fontWeight: "700" }}>
                {t("import.importAnalyze")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Remove ads banner (non-premium only) */}
        <TrialBanner />

        {/* Progress card */}
        <View style={{
          backgroundColor: "#15161B", borderRadius: 16,
          padding: 16, marginTop: 8, marginBottom: 12,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ flex: 1, color: "rgba(245,244,238,0.38)", fontSize: 11,
              fontWeight: "700", letterSpacing: 1 }}>
              {t("resumen.globalProgress")}
            </Text>
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: 28, height: 28, borderRadius: 6 }}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 8 }}>
            <Text style={{ color: "#F5F4EE", fontSize: 64, fontWeight: "800", lineHeight: 70 }}>
              {pct}
            </Text>
            <Text style={{ color: "#F4C430", fontSize: 32, fontWeight: "800", marginLeft: 2 }}>
              %
            </Text>
            <Text style={{ flex: 1 }} />
            <Text style={{ color: "rgba(245,244,238,0.38)", fontSize: 14, fontWeight: "600" }}>
              {owned} / {total}
            </Text>
          </View>

          <View style={{ height: 6, backgroundColor: "rgba(245,244,238,0.1)",
            borderRadius: 99, overflow: "hidden" }}>
            <View style={{
              height: 6, borderRadius: 99, backgroundColor: "#F4C430",
              width: `${pct}%`,
            }} />
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <StatCard value={owned} label={t("resumen.owned")} valueColor="#22C55E" />
          <StatCard value={missing} label={t("resumen.missing")} valueColor="#F5F4EE" />
          <StatCard value={duplicateCount} label={t("resumen.repeated")} valueColor="#F2853A" />
        </View>

        {/* Section title row */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ flex: 1, color: "rgba(245,244,238,0.38)", fontSize: 11,
            fontWeight: "700", letterSpacing: 1 }}>
            {t("resumen.bySectionTitle")}
          </Text>
          <TouchableOpacity onPress={() => router.navigate("/(tabs)/album")}>
            <Text style={{ color: "#F4C430", fontSize: 13, fontWeight: "600" }}>
              {t("resumen.viewAll")} →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable groups list ── */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((g, i) => (
          <View key={g.id}>
            {i % 4 === 0 && <BannerAd />}
            <SectionRow
              item={g}
              onPress={() => router.navigate({ pathname: "/(tabs)/album", params: { scrollTo: g.id } })}
            />
          </View>
        ))}
      </ScrollView>

      {/* ── Import modal ── */}
      <ImportModal visible={importVisible} onClose={() => setImportVisible(false)} />

      {/* ── First-time onboarding prompt ── */}
      <OnboardingModal />
    </View>
  );
}
