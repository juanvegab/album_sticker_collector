import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCollection } from "@/hooks/useCollection";
import { StickerCard } from "@/components/stickers/StickerCard";
import { ALBUM_SECTIONS_MAP } from "@/lib/data/world-cup-2026";
import type { AlbumSticker } from "@/types/album";

export default function SectionScreen() {
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const section = ALBUM_SECTIONS_MAP.get(sectionId);
  const { isOwned, hasDuplicate, duplicates, toggle, setDuplicates } = useCollection();
  const [selected, setSelected] = useState<AlbumSticker | null>(null);

  if (!section) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">Sección no encontrada</Text>
      </View>
    );
  }

  const ownedCount = section.stickers.filter((s) => isOwned(s.id)).length;
  const pct = Math.round((ownedCount / section.stickers.length) * 100);

  return (
    <>
      <Stack.Screen
        options={{
          title: `${section.emoji} ${section.name}`,
          headerBackTitle: "Álbum",
        }}
      />
      <View className="flex-1 bg-gray-50">
        {/* Section progress */}
        <View className="bg-white px-4 py-3 border-b border-gray-100">
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-gray-500">
              {ownedCount}/{section.stickers.length} stickers
            </Text>
            <Text className="text-sm font-semibold text-blue-600">{pct}%</Text>
          </View>
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
          </View>
        </View>

        <FlatList
          data={section.stickers}
          keyExtractor={(s) => s.id}
          numColumns={4}
          contentContainerStyle={{ padding: 8 }}
          columnWrapperStyle={{ justifyContent: "flex-start" }}
          renderItem={({ item }) => (
            <StickerCard
              sticker={item}
              owned={isOwned(item.id)}
              duplicates={duplicates[item.id] ?? 0}
              onPress={() => setSelected(item)}
            />
          )}
        />

        {/* Sticker detail modal */}
        <Modal
          visible={!!selected}
          transparent
          animationType="fade"
          onRequestClose={() => setSelected(null)}
        >
          <TouchableWithoutFeedback onPress={() => setSelected(null)}>
            <View className="flex-1 bg-black/50 justify-end">
              <TouchableWithoutFeedback>
                <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
                  {selected && (
                    <>
                      <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-6" />
                      <Text className="text-lg font-bold text-gray-900 mb-1">
                        {selected.id} — {selected.name}
                      </Text>
                      <Text className="text-gray-400 text-sm mb-6 capitalize">
                        {selected.type} · {section.name}
                      </Text>

                      {/* Toggle owned */}
                      <TouchableOpacity
                        onPress={() => {
                          toggle(selected.id);
                          setSelected(null);
                        }}
                        className={`rounded-xl py-4 items-center mb-3 ${
                          isOwned(selected.id) ? "bg-gray-200" : "bg-green-600"
                        }`}
                        activeOpacity={0.8}
                      >
                        <Text
                          className={`font-semibold text-base ${
                            isOwned(selected.id) ? "text-gray-700" : "text-white"
                          }`}
                        >
                          {isOwned(selected.id) ? "✗ Quitar de mi colección" : "✓ La tengo"}
                        </Text>
                      </TouchableOpacity>

                      {/* Duplicates */}
                      {isOwned(selected.id) && (
                        <View className="flex-row items-center justify-between bg-orange-50 rounded-xl px-4 py-3">
                          <Text className="text-orange-700 font-medium">Repetidos</Text>
                          <View className="flex-row items-center gap-4">
                            <TouchableOpacity
                              onPress={() =>
                                setDuplicates(
                                  selected.id,
                                  Math.max(0, (duplicates[selected.id] ?? 0) - 1)
                                )
                              }
                              className="w-8 h-8 bg-orange-200 rounded-full items-center justify-center"
                            >
                              <Text className="text-orange-700 font-bold text-lg">−</Text>
                            </TouchableOpacity>
                            <Text className="text-orange-800 font-bold text-lg w-6 text-center">
                              {duplicates[selected.id] ?? 0}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                setDuplicates(
                                  selected.id,
                                  (duplicates[selected.id] ?? 0) + 1
                                )
                              }
                              className="w-8 h-8 bg-orange-500 rounded-full items-center justify-center"
                            >
                              <Text className="text-white font-bold text-lg">+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </>
  );
}
