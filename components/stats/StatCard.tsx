import { View, Text } from "react-native";

interface Props {
  label: string;
  value: string | number;
  emoji: string;
  color?: string;
}

export function StatCard({ label, value, emoji, color = "bg-blue-50" }: Props) {
  return (
    <View className={`${color} rounded-xl p-4 flex-1 items-center`}>
      <Text className="text-3xl mb-1">{emoji}</Text>
      <Text className="text-2xl font-bold text-gray-800">{value}</Text>
      <Text className="text-gray-500 text-xs text-center mt-1">{label}</Text>
    </View>
  );
}
