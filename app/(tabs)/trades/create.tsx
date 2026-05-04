import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useCollection } from "@/hooks/useCollection";
import { createTrade } from "@/lib/firestore/trades";
import { WORLD_CUP_2026, ALL_STICKERS_MAP } from "@/lib/data/world-cup-2026";
import type { AlbumSticker } from "@/types/album";

type Step = "offering" | "requesting";

export default function CreateTradeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { ownedSet, duplicates } = useCollection();
  const [step, setStep] = useState<Step>("offering");
  const [offering, setOffering] = useState<string[]>([]);
  const [requesting, setRequesting] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const allStickers = WORLD_CUP_2026.sections.flatMap((s) => s.stickers);

  // Offering: stickers I own (owned or has duplicates)
  const offeringPool = allStickers.filter(
    (s) => ownedSet.has(s.id) || (duplicates[s.id] ?? 0) > 0
  );
  // Requesting: stickers I don't have
  const requestingPool = allStickers.filter((s) => !ownedSet.has(s.id));

  const pool = step === "offering" ? offeringPool : requestingPool;
  const selected = step === "offering" ? offering : requesting;
  const setSelected = step === "offering" ? setOffering : setRequesting;

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit() {
    if (!user) return;
    if (offering.length === 0 || requesting.length === 0) {
      Alert.alert("Incompleto", "Selecciona al menos 1 sticker de cada lado");
      return;
    }
    setSaving(true);
    try {
      await createTrade({
        albumId: "world-cup-2026",
        fromUserId: user.id,
        fromUserName: user.firstName ?? user.emailAddresses[0].emailAddress,
        offering,
        requesting,
        status: "open",
      });
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo crear el intercambio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Nuevo intercambio", presentation: "modal" }} />
      <View className="flex-1 bg-gray-50">
        {/* Step indicator */}
        <View className="flex-row bg-white px-4 py-3 border-b border-gray-100">
          <View className={`flex-1 items-center pb-2 ${step === "offering" ? "border-b-2 border-blue-600" : ""}`}>
            <Text className={step === "offering" ? "text-blue-600 font-semibold" : "text-gray-400"}>
              1. Ofreces ({offering.length})
            </Text>
          </View>
          <View className={`flex-1 items-center pb-2 ${step === "requesting" ? "border-b-2 border-blue-600" : ""}`}>
            <Text className={step === "requesting" ? "text-blue-600 font-semibold" : "text-gray-400"}>
              2. Pides ({requesting.length})
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-400 px-4 py-2">
          {step === "offering"
            ? "Elige los stickers que ofreces para el intercambio"
            : "Elige los stickers que quieres recibir"}
        </Text>

        <FlatList
          data={pool}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.id);
            return (
              <TouchableOpacity
                onPress={() => toggleSelect(item.id)}
                className={`flex-row items-center rounded-xl mb-2 px-4 py-3 border ${
                  isSelected
                    ? "bg-blue-50 border-blue-400"
                    : "bg-white border-gray-100"
                }`}
              >
                <View
                  className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                    isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                  }`}
                >
                  {isSelected && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
                <Text className="text-xs text-gray-400 w-16">{item.id}</Text>
                <Text className="flex-1 text-gray-800 text-sm" numberOfLines={1}>
                  {item.name}
                </Text>
                {(duplicates[item.id] ?? 0) > 0 && (
                  <View className="bg-orange-500 rounded-full w-5 h-5 items-center justify-center">
                    <Text className="text-white text-xs">{duplicates[item.id]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/* Footer buttons */}
        <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-100 flex-row gap-3">
          {step === "offering" ? (
            <TouchableOpacity
              onPress={() => setStep("requesting")}
              disabled={offering.length === 0}
              className={`flex-1 rounded-xl py-4 items-center ${
                offering.length > 0 ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <Text className={offering.length > 0 ? "text-white font-semibold" : "text-gray-400 font-semibold"}>
                Siguiente →
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setStep("offering")}
                className="flex-1 bg-gray-100 rounded-xl py-4 items-center"
              >
                <Text className="text-gray-700 font-semibold">← Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submit}
                disabled={saving || requesting.length === 0}
                className={`flex-1 rounded-xl py-4 items-center ${
                  requesting.length > 0 && !saving ? "bg-green-600" : "bg-gray-200"
                }`}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className={requesting.length > 0 ? "text-white font-semibold" : "text-gray-400 font-semibold"}>
                    Publicar 🎉
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </>
  );
}
