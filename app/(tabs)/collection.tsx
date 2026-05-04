import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useCollection } from "@/hooks/useCollection";
import { WORLD_CUP_2026, ALL_STICKERS_MAP } from "@/lib/data/world-cup-2026";
import type { AlbumSticker } from "@/types/album";

type Tab = "owned" | "missing" | "duplicates";

const TABS: { key: Tab; label: string }[] = [
  { key: "owned", label: "Tengo ✅" },
  { key: "missing", label: "Me faltan ❌" },
  { key: "duplicates", label: "Repetidos 🔁" },
];

export default function CollectionScreen() {
  const { ownedSet, duplicates } = useCollection();
  const [activeTab, setActiveTab] = useState<Tab>("owned");

  const allStickers = WORLD_CUP_2026.sections.flatMap((s) => s.stickers);

  let items: (AlbumSticker & { count?: number })[] = [];
  if (activeTab === "owned") {
    items = allStickers.filter((s) => ownedSet.has(s.id));
  } else if (activeTab === "missing") {
    items = allStickers.filter((s) => !ownedSet.has(s.id));
  } else {
    items = Object.entries(duplicates)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => {
        const sticker = ALL_STICKERS_MAP.get(id);
        return sticker ? { ...sticker, count } : null;
      })
      .filter(Boolean) as (AlbumSticker & { count: number })[];
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Tab selector */}
      <View className="flex-row bg-white border-b border-gray-100 px-2 pt-2">
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 items-center rounded-t-lg ${
              activeTab === t.key ? "border-b-2 border-blue-600" : ""
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === t.key ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count badge */}
      <View className="px-4 py-2 bg-white border-b border-gray-100">
        <Text className="text-gray-500 text-sm">{items.length} stickers</Text>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-5xl mb-3">
            {activeTab === "owned" ? "📬" : activeTab === "missing" ? "🎉" : "✨"}
          </Text>
          <Text className="text-gray-400 text-base text-center px-8">
            {activeTab === "owned"
              ? "Aún no tienes stickers. ¡Empieza a marcarlos en el Álbum!"
              : activeTab === "missing"
              ? "¡Tienes todos los stickers! Álbum completo 🏆"
              : "No tienes repetidos por ahora"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View className="flex-row items-center bg-white rounded-xl mb-2 px-4 py-3 shadow-sm border border-gray-100">
              <View
                className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${
                  activeTab === "owned"
                    ? "bg-green-100"
                    : activeTab === "missing"
                    ? "bg-gray-100"
                    : "bg-orange-100"
                }`}
              >
                <Text className="text-xs font-bold text-gray-600">{item.number}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-medium text-gray-800" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-xs text-gray-400">{item.sectionId}</Text>
              </View>
              {activeTab === "duplicates" && item.count && (
                <View className="bg-orange-500 rounded-full w-7 h-7 items-center justify-center">
                  <Text className="text-white text-xs font-bold">{item.count}</Text>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
