import { TouchableOpacity, Text, View } from "react-native";
import type { AlbumSticker } from "@/types/album";

interface Props {
  sticker: AlbumSticker;
  owned: boolean;
  duplicates: number;
  onPress: () => void;
}

export function StickerCard({ sticker, owned, duplicates, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`m-1 w-16 h-20 rounded-lg items-center justify-center border-2 ${
        owned
          ? "bg-green-600 border-green-700"
          : "bg-white border-gray-300"
      }`}
      activeOpacity={0.7}
    >
      <Text
        className={`text-xs font-bold ${owned ? "text-white" : "text-gray-500"}`}
        numberOfLines={1}
      >
        {sticker.id}
      </Text>
      <Text
        className={`text-xs text-center mt-1 px-1 ${owned ? "text-green-100" : "text-gray-400"}`}
        numberOfLines={2}
      >
        {sticker.name}
      </Text>
      {duplicates > 0 && (
        <View className="absolute -top-2 -right-2 bg-orange-500 rounded-full w-5 h-5 items-center justify-center">
          <Text className="text-white text-xs font-bold">{duplicates}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
