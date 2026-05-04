/**
 * Banner ad placeholder.
 *
 * During development (Expo Go), this renders a visual stub.
 * In a real build, swap this for the actual BannerAd from
 * react-native-google-mobile-ads (requires Expo Dev Build).
 *
 * Instructions to activate real ads:
 *   1. npx expo install react-native-google-mobile-ads
 *   2. Add plugin to app.json (see docs)
 *   3. Run: npx expo prebuild
 *   4. Replace this file with the real BannerAd component
 */

import { View, Text } from "react-native";

interface Props {
  hidden?: boolean;
}

export function BannerAd({ hidden }: Props) {
  if (hidden) return null;

  return (
    <View className="bg-gray-100 border-t border-gray-200 h-14 items-center justify-center">
      <Text className="text-gray-400 text-xs">📢 Ad placeholder — AdMob (Dev Build)</Text>
    </View>
  );
}
