import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useCollection } from "@/hooks/useCollection";
import { createTrade } from "@/lib/firestore/trades";
import { WORLD_CUP_2026 } from "@/lib/data/world-cup-2026";
import { TradeStickersSelector } from "@/components/trades/TradeStickersSelector";

type Step = "offering" | "requesting";

const DEEP_LINK_BASE = "controldepostales://trade";

export default function CreateTradeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { ownedSet, duplicates } = useCollection();
  const [step, setStep] = useState<Step>("offering");
  const [offering, setOffering] = useState<string[]>([]);
  const [requesting, setRequesting] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const allStickers = WORLD_CUP_2026.sections.flatMap((s) => s.stickers);

  // Only stickers with extra copies (duplicates > 0)
  const offeringPool = allStickers.filter((s) => (duplicates[s.id] ?? 0) > 0);
  // Only stickers not owned at all
  const requestingPool = allStickers.filter((s) => !ownedSet.has(s.id));

  const pool = step === "offering" ? offeringPool : requestingPool;
  const selected = step === "offering" ? offering : requesting;

  function toggle(id: string) {
    const setter = step === "offering" ? setOffering : setRequesting;
    setter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit() {
    if (!user) return;
    if (offering.length === 0 || requesting.length === 0) {
      Alert.alert("Incompleto", "Selecciona al menos 1 postal de cada lado");
      return;
    }
    setSaving(true);
    try {
      const tradeId = await createTrade({
        albumId: "world-cup-2026",
        fromUserId: user.id,
        fromUserName: user.firstName ?? user.emailAddresses[0].emailAddress,
        offering,
        requesting,
        status: "open",
      });

      const link = `${DEEP_LINK_BASE}/${tradeId}`;
      router.back();

      // Share the link after navigating back so the modal is dismissed first
      setTimeout(() => {
        Share.share({
          message: `¡Te propongo un intercambio de postales del Mundial 2026! 🌍⚽\nTengo ${offering.length} postales repetidas y busco ${requesting.length}.\nAbre el link para ver los detalles:\n${link}`,
          url: link,
        }).catch(() => {});
      }, 400);
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
        {/* Step tabs */}
        <View className="flex-row bg-white px-4 py-3 border-b border-gray-100">
          <TouchableOpacity
            onPress={() => setStep("offering")}
            className={`flex-1 items-center pb-2 ${
              step === "offering" ? "border-b-2 border-blue-600" : ""
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                step === "offering" ? "text-blue-600" : "text-gray-400"
              }`}
            >
              📤 Ofreces ({offering.length})
            </Text>
            <Text className="text-xs text-gray-400 mt-0.5">Repetidas que das</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (offering.length > 0) setStep("requesting");
            }}
            className={`flex-1 items-center pb-2 ${
              step === "requesting" ? "border-b-2 border-blue-600" : ""
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                step === "requesting" ? "text-blue-600" : "text-gray-400"
              }`}
            >
              📥 Pides ({requesting.length})
            </Text>
            <Text className="text-xs text-gray-400 mt-0.5">Las que necesitas</Text>
          </TouchableOpacity>
        </View>

        {/* Grouped selector */}
        <TradeStickersSelector
          key={step}
          pool={pool}
          selected={selected}
          onToggle={toggle}
        />

        {/* Footer */}
        <View className="bg-white px-4 py-4 border-t border-gray-100 flex-row gap-3">
          {step === "offering" ? (
            <TouchableOpacity
              onPress={() => setStep("requesting")}
              disabled={offering.length === 0}
              className={`flex-1 rounded-xl py-4 items-center ${
                offering.length > 0 ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <Text
                className={`font-semibold ${
                  offering.length > 0 ? "text-white" : "text-gray-400"
                }`}
              >
                Siguiente → ({offering.length} seleccionadas)
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
                  <Text
                    className={`font-semibold ${
                      requesting.length > 0 ? "text-white" : "text-gray-400"
                    }`}
                  >
                    Publicar y compartir 🎉
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
