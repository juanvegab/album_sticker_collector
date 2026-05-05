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
import { useCollection } from "@/hooks/useCollection";
import { WORLD_CUP_2026 } from "@/lib/data/world-cup-2026";
import { BannerAd } from "@/lib/ads/BannerAdPlaceholder";
import { TrialBanner } from "@/components/premium/TrialBanner";

export default function AccountScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { ownedSet, duplicates } = useCollection();

  const totalStickers = WORLD_CUP_2026.totalStickers;
  const owned = ownedSet.size;
  const pct = totalStickers > 0 ? Math.round((owned / totalStickers) * 100) : 0;
  const totalDuplicates = Object.values(duplicates).reduce((a, b) => a + b, 0);
  const missing = totalStickers - owned;

  function handleSignOut() {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar" },
      {
        text: "Salir",
        style: "destructive",
        onPress: () => signOut().catch(console.error),
      },
    ]);
  }

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "Usuario";

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
            <View className="w-18 h-18 rounded-full bg-blue-400 items-center justify-center mb-3"
              style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 12 }}>
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
            Mi colección
          </Text>

          {/* Progress bar */}
          <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
            <View
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </View>
          <Text className="text-xs text-gray-400 mb-4 text-right">{pct}% completado</Text>

          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">{owned}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">Tengo</Text>
            </View>
            <View className="w-px bg-gray-100" />
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-400">{missing}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">Me faltan</Text>
            </View>
            <View className="w-px bg-gray-100" />
            <View className="items-center">
              <Text className="text-2xl font-bold text-orange-500">{totalDuplicates}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">Repetidas</Text>
            </View>
          </View>
        </View>

        {/* Account actions */}
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-4 pt-4 pb-2">
            Cuenta
          </Text>

          <View className="px-4 py-3 border-b border-gray-50">
            <Text className="text-xs text-gray-400">Correo</Text>
            <Text className="text-sm text-gray-800 mt-0.5">
              {user?.primaryEmailAddress?.emailAddress ?? "—"}
            </Text>
          </View>

          <View className="px-4 py-3">
            <Text className="text-xs text-gray-400">ID de usuario</Text>
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
              {user?.id ?? "—"}
            </Text>
          </View>
        </View>

        {/* About */}
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-4 pt-4 pb-2">
            Acerca de
          </Text>

          <TouchableOpacity
            onPress={() => Linking.openURL("https://elalbum2026.com/")}
            className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50"
            activeOpacity={0.7}
          >
            <Text className="text-sm text-blue-600">Visitar elalbum2026.com</Text>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>

          <View className="px-4 py-3">
            <Text className="text-xs text-gray-400">Versión</Text>
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
            <Text className="text-red-600 font-semibold">Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
    </ScrollView>
    </View>
  );
}
