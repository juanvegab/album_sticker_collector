import { ScrollView, View, Text, TouchableOpacity, Image } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useCollection } from "@/hooks/useCollection";
import { StatCard } from "@/components/stats/StatCard";
import { WORLD_CUP_2026, FIFA_TO_ISO } from "@/lib/data/world-cup-2026";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { TrialBanner } from "@/components/premium/TrialBanner";

export default function StatsScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { ownedSet, duplicates } = useCollection();

  const total = WORLD_CUP_2026.totalStickers;
  const owned = ownedSet.size;
  const missing = total - owned;
  const duplicateCount = Object.values(duplicates).reduce((a, b) => a + b, 0);
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  const sections = WORLD_CUP_2026.sections.filter((s) => s.stickers.length > 0);

  return (
    <View className="flex-1 bg-gray-50">
      <TrialBanner />
      <BannerAd />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="bg-blue-600 pt-6 pb-8 px-4">
          <Text className="text-white text-sm opacity-80 mb-1">{t("stats.hello")}</Text>
          <Text className="text-white text-2xl font-bold">
            {user?.firstName ?? user?.emailAddresses[0].emailAddress}
          </Text>
        </View>

        <View className="bg-white mx-4 -mt-4 rounded-2xl p-5 shadow-sm mb-4">
          <Text className="text-gray-500 text-sm mb-1">{t("stats.globalProgress")}</Text>
          <Text className="text-4xl font-bold text-gray-900 mb-1">{pct}%</Text>
          <View className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
            <View className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
          </View>
          <Text className="text-gray-400 text-xs">
            {owned} {t("stats.of")} {total} stickers
          </Text>
        </View>

        <View className="flex-row gap-3 mx-4 mb-4">
          <StatCard label={t("stats.owned")} value={owned} emoji="✅" color="bg-green-50" />
          <StatCard label={t("stats.missing")} value={missing} emoji="❌" color="bg-red-50" />
          <StatCard label={t("stats.duplicates")} value={duplicateCount} emoji="🔁" color="bg-orange-50" />
        </View>

        <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm mb-4">
          <Text className="font-semibold text-gray-800 mb-4">{t("stats.bySection")}</Text>
          {sections.map((section) => {
            const sOwned = section.stickers.filter((s) => ownedSet.has(s.id)).length;
            const sPct = Math.round((sOwned / section.stickers.length) * 100);
            return (
              <View key={section.id} className="mb-3">
                <View className="flex-row justify-between mb-1">
                  <View className="flex-row items-center flex-1 mr-2">
                    {FIFA_TO_ISO[section.id] ? (
                      <Image
                        source={{ uri: `https://flagcdn.com/w40/${FIFA_TO_ISO[section.id]}.png` }}
                        style={{ width: 22, height: 15, borderRadius: 2, marginRight: 6 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="mr-1">{section.emoji}</Text>
                    )}
                    <Text className="text-sm text-gray-700 flex-1" numberOfLines={1}>
                      {section.name}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400">{sOwned}/{section.stickers.length}</Text>
                </View>
                <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <View className="h-full bg-green-400 rounded-full" style={{ width: `${sPct}%` }} />
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => signOut()}
          className="mx-4 bg-gray-100 rounded-xl py-3 items-center"
          activeOpacity={0.7}
        >
          <Text className="text-gray-500 font-medium">{t("stats.signOut")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
