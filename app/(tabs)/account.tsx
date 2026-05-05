import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Linking,
} from "react-native";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useCollection } from "@/hooks/useCollection";
import { WORLD_CUP_2026 } from "@/lib/data/world-cup-2026";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { TrialBanner } from "@/components/premium/TrialBanner";
import { changeLanguage } from "@/lib/i18n";
import i18n from "i18next";

type LangCode = "es" | "en";

export default function AccountScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { ownedSet, duplicates } = useCollection();
  const [lang, setLang] = useState<LangCode>((i18n.language as LangCode) ?? "es");

  const totalStickers = WORLD_CUP_2026.totalStickers;
  const owned = ownedSet.size;
  const pct = totalStickers > 0 ? Math.round((owned / totalStickers) * 100) : 0;
  const totalDuplicates = Object.values(duplicates).reduce((a, b) => a + b, 0);
  const missing = totalStickers - owned;

  function handleSignOut() {
    Alert.alert(t("account.signOutTitle"), t("account.signOutConfirm"), [
      { text: t("common.cancel") },
      {
        text: t("account.signOutYes"),
        style: "destructive",
        onPress: () => signOut().catch(console.error),
      },
    ]);
  }

  async function handleLanguageChange(code: LangCode) {
    setLang(code);
    await changeLanguage(code);
  }

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress ??
    t("account.userFallback");

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View className="flex-1 bg-gray-50">
      <TrialBanner />
      <BannerAd />
      <ScrollView>
        {/* Profile header */}
        <View className="bg-blue-600 px-6 pt-8 pb-8 items-center">
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 12 }}
            />
          ) : (
            <View
              className="w-18 h-18 rounded-full bg-blue-400 items-center justify-center mb-3"
              style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 12 }}
            >
              <Text className="text-white text-2xl font-bold">{initials}</Text>
            </View>
          )}
          <Text className="text-white text-xl font-bold">{displayName}</Text>
          <Text className="text-blue-200 text-sm mt-1">
            {user?.primaryEmailAddress?.emailAddress}
          </Text>
        </View>

        {/* Collection stats */}
        <View className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            {t("account.myCollection")}
          </Text>

          <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
            <View className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
          </View>
          <Text className="text-xs text-gray-400 mb-4 text-right">
            {t("account.completed", { pct })}
          </Text>

          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">{owned}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{t("account.have")}</Text>
            </View>
            <View className="w-px bg-gray-100" />
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-400">{missing}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{t("account.missing")}</Text>
            </View>
            <View className="w-px bg-gray-100" />
            <View className="items-center">
              <Text className="text-2xl font-bold text-orange-500">{totalDuplicates}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{t("account.repeated")}</Text>
            </View>
          </View>
        </View>

        {/* Account actions */}
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-4 pt-4 pb-2">
            {t("account.accountSection")}
          </Text>

          <View className="px-4 py-3 border-b border-gray-50">
            <Text className="text-xs text-gray-400">{t("account.email")}</Text>
            <Text className="text-sm text-gray-800 mt-0.5">
              {user?.primaryEmailAddress?.emailAddress ?? "—"}
            </Text>
          </View>

          <View className="px-4 py-3">
            <Text className="text-xs text-gray-400">{t("account.userId")}</Text>
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
              {user?.id ?? "—"}
            </Text>
          </View>
        </View>

        {/* About */}
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-4 pt-4 pb-2">
            {t("account.about")}
          </Text>

          {/* Language toggle */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50">
            <Text className="text-sm text-gray-700">{t("account.language")}</Text>
            <View className="flex-row bg-gray-100 rounded-xl overflow-hidden">
              {(["es", "en"] as LangCode[]).map((code) => (
                <TouchableOpacity
                  key={code}
                  onPress={() => handleLanguageChange(code)}
                  className={`px-4 py-1.5 ${lang === code ? "bg-blue-600" : ""}`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      lang === code ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL("https://elalbum2026.com/")}
            className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50"
            activeOpacity={0.7}
          >
            <Text className="text-sm text-blue-600">{t("account.visitSite")}</Text>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>

          <View className="px-4 py-3">
            <Text className="text-xs text-gray-400">{t("account.version")}</Text>
            <Text className="text-sm text-gray-800 mt-0.5">1.0.0</Text>
          </View>
        </View>

        {/* Sign out */}
        <View className="mx-4 mt-4 mb-8">
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-red-50 border border-red-200 rounded-2xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-red-600 font-semibold">{t("account.signOut")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
