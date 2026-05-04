import { TouchableOpacity, Text, View } from "react-native";
import type { AlbumSection } from "@/types/album";

interface Props {
  section: AlbumSection;
  ownedCount: number;
  onPress: () => void;
}

export function SectionCard({ section, ownedCount, onPress }: Props) {
  const total = section.stickers.length;
  const pct = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white mx-4 mb-3 rounded-xl p-4 shadow-sm border border-gray-100"
      activeOpacity={0.75}
    >
      <View className="flex-row items-center mb-2">
        <Text className="text-2xl mr-2">{section.emoji}</Text>
        <View className="flex-1">
          <Text className="font-semibold text-gray-800 text-base" numberOfLines={1}>
            {section.name}
          </Text>
          <Text className="text-gray-500 text-xs">
            {ownedCount}/{total} stickers · {pct}%
          </Text>
        </View>
        <Text className="text-blue-600 text-lg font-bold">{pct}%</Text>
      </View>
      {/* Progress bar */}
      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <View
          className="h-full bg-green-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </View>
    </TouchableOpacity>
  );
}
