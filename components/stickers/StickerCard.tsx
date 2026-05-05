import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useCollectionStore } from "@/store/collectionStore";
import type { AlbumSticker } from "@/types/album";

interface Props {
  sticker: AlbumSticker;
  onToggle: (id: string) => void;
  onSetDups: (id: string, count: number) => void;
}

export const StickerCard = React.memo(({ sticker, onToggle, onSetDups }: Props) => {
  // Per-sticker selector — only this card re-renders when its own count changes
  const count = useCollectionStore(
    useCallback(
      (state) => {
        const coll = state.collection;
        if (!coll) return 0;
        const owned = coll.owned.includes(sticker.id);
        const dups = coll.duplicates?.[sticker.id] ?? 0;
        return owned ? 1 + dups : 0;
      },
      [sticker.id]
    )
  );

  const isOwned = count > 0;
  const dups = Math.max(0, count - 1);

  const handleIncrement = useCallback(() => {
    if (!isOwned) onToggle(sticker.id);
    else onSetDups(sticker.id, dups + 1);
  }, [isOwned, dups, sticker.id, onToggle, onSetDups]);

  const handleDecrement = useCallback(() => {
    if (dups > 0) onSetDups(sticker.id, dups - 1);
    else if (isOwned) onToggle(sticker.id);
  }, [isOwned, dups, sticker.id, onToggle, onSetDups]);

  const containerClass =
    count === 0
      ? "bg-gray-100 border-gray-200"
      : count === 1
      ? "bg-green-600 border-green-700"
      : "bg-yellow-400 border-yellow-500";

  const idClass =
    count === 0 ? "text-gray-400" : count === 1 ? "text-white" : "text-yellow-900";

  const nameClass =
    count === 0 ? "text-gray-400" : count === 1 ? "text-green-100" : "text-yellow-800";

  const btnClass =
    count === 0 ? "text-gray-600" : count === 1 ? "text-white" : "text-yellow-900";

  // Button pill background: darker on gray cards so the circle is visible
  const btnBg =
    count === 0 ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.15)";

  return (
    <View
      className={`flex-1 m-1 rounded-lg border ${containerClass}`}
      style={{ minHeight: 84 }}
    >
      {/* ID + duplicate badge */}
      <View className="flex-row justify-between items-center px-1.5 pt-1.5">
        <Text className={`text-xs font-bold ${idClass}`} numberOfLines={1}>
          {sticker.id}
        </Text>
        {count >= 2 && (
          <View className="bg-black/20 rounded-full px-1">
            <Text className="text-xs font-bold text-yellow-900">{count - 1}</Text>
          </View>
        )}
      </View>

      {/* Sticker name — centered in remaining space */}
      <View className="flex-1 items-center justify-center px-1">
        <Text className={`text-xs text-center ${nameClass}`} numberOfLines={2}>
          {sticker.name}
        </Text>
      </View>

      {/* +/− controls */}
      <View className="flex-row items-center justify-between px-1 pb-1.5 mt-1">
        <TouchableOpacity
          onPress={handleDecrement}
          disabled={count === 0}
          hitSlop={{ top: 8, bottom: 8, left: 10, right: 6 }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: btnBg,
            alignItems: "center",
            justifyContent: "center",
            opacity: count === 0 ? 0.3 : 1,
          }}
        >
          <Text className={`text-xl font-bold leading-none ${btnClass}`}>−</Text>
        </TouchableOpacity>

        {count >= 2 && (
          <Text className={`text-xs font-semibold ${idClass}`}>{count - 1}</Text>
        )}

        <TouchableOpacity
          onPress={handleIncrement}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 10 }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: btnBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text className={`text-xl font-bold leading-none ${btnClass}`}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
