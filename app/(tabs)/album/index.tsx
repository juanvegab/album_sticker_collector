import { FlatList, View, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useCollection } from "@/hooks/useCollection";
import { SectionCard } from "@/components/album/SectionCard";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { WORLD_CUP_2026, CONFEDERATION_HEADERS } from "@/lib/data/world-cup-2026";
import type { AlbumSection } from "@/types/album";

type ListItem =
  | { type: "header"; label: string; emoji: string }
  | { type: "section"; section: AlbumSection };

function buildListItems(): ListItem[] {
  const items: ListItem[] = [];
  let lastConfederation = "";

  for (const section of WORLD_CUP_2026.sections) {
    const confHeader = CONFEDERATION_HEADERS[section.id];
    if (confHeader && confHeader !== lastConfederation) {
      lastConfederation = confHeader;
      const [emoji, ...rest] = confHeader.split(" ");
      items.push({ type: "header", label: rest.join(" "), emoji });
    }
    items.push({ type: "section", section });
  }
  return items;
}

const LIST_ITEMS = buildListItems();

export default function AlbumScreen() {
  const { ownedSet } = useCollection();
  const router = useRouter();

  const total = WORLD_CUP_2026.totalStickers;
  const owned = ownedSet.size;
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  return (
    <>
      <Stack.Screen options={{ title: "Álbum Mundial 2026" }} />
      <View className="flex-1 bg-gray-50">
        {/* Overall progress banner */}
        <View className="bg-blue-600 px-4 pt-14 pb-5">
          <Text className="text-white text-xl font-bold">⚽ FIFA World Cup 2026™</Text>
          <Text className="text-blue-200 text-sm mb-3">
            {owned} / {total} stickers · {pct}%
          </Text>
          <View className="h-2.5 bg-blue-400 rounded-full overflow-hidden">
            <View className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
          </View>
        </View>

        <BannerAd />
        <FlatList
          data={LIST_ITEMS}
          keyExtractor={(item, i) =>
            item.type === "header" ? `hdr-${i}` : item.section.id
          }
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View className="px-4 pt-4 pb-2">
                  <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {item.emoji} {item.label}
                  </Text>
                </View>
              );
            }
            const ownedCount = item.section.stickers.filter((s) =>
              ownedSet.has(s.id)
            ).length;
            return (
              <SectionCard
                section={item.section}
                ownedCount={ownedCount}
                onPress={() => router.push(`/(tabs)/album/${item.section.id}`)}
              />
            );
          }}
        />
      </View>
    </>
  );
}
