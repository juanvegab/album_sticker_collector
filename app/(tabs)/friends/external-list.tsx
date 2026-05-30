import { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StatusBar, Alert, KeyboardAvoidingView, Platform, ScrollView, Share,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { parseExternalList } from "@/lib/stickers/parseExternalList";
import { buildStickerShareText } from "@/lib/stickers/buildShareText";
import { createExternalRequest } from "@/lib/firestore/requests";
import { incrementExternalListUses } from "@/lib/firestore/featureTrials";
import { ALL_STICKERS_MAP } from "@/lib/data/world-cup-2026";
import { useCollection } from "@/hooks/useCollection";
import { usePremium } from "@/hooks/usePremium";
import { useStickerRequests } from "@/hooks/useStickerRequests";
import { StickerPickerPanel } from "@/components/stickers/StickerPickerPanel";
import type { AlbumSticker } from "@/types/album";

// ── Design tokens ──────────────────────────────────────────────────────
const BG       = "#0B0B0E";
const SURFACE  = "#15161B";
const ELEVATED = "#1C1D24";
const INK      = "#F5F4EE";
const DIM      = "rgba(245,244,238,0.38)";
const DIM3     = "rgba(245,244,238,0.08)";
const BRAND    = "#F4C430";
const GREEN    = "#22C55E";

const PLACEHOLDER =
  "Pegá aquí la lista\n\nEj:\nFWC 📜: 9, 10, 13\nMEX 🇲🇽: 3, 7\nBRA 🇧🇷: 11-14\nCIV 18";

type Step = "input" | "results";

export default function ExternalListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { ownedSet } = useCollection();
  const { isPremium } = usePremium();
  const { outgoing, pendingDeliveries } = useStickerRequests();

  const inFlightSet = useMemo(() => {
    const ids = new Set<string>();
    for (const r of outgoing) r.stickers.forEach((id) => ids.add(id));
    return ids;
  }, [outgoing]);

  const securedSet = useMemo(() => {
    const ids = new Set<string>();
    for (const r of pendingDeliveries) (r.givenStickers ?? []).forEach((id) => ids.add(id));
    return ids;
  }, [pendingDeliveries]);

  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [listName, setListName] = useState("");
  const [usefulStickers, setUsefulStickers] = useState<AlbumSticker[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  function getDisplayName() {
    if (listName.trim()) return listName.trim();
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return `Lista del ${dd}/${mm} ${hh}:${min}`;
  }

  // All parsed IDs that are useful (not already owned).
  // In-flight/secured stickers are shown in the picker (with badges) but not pre-selected.
  function analyze() {
    if (!text.trim()) return;
    const parsed = parseExternalList(text);
    // Pool: exclude owned; include in-flight/secured so they show as blocked
    const useful = parsed
      .filter(id => !ownedSet.has(id))
      .map(id => ALL_STICKERS_MAP.get(id))
      .filter(Boolean) as AlbumSticker[];

    setUsefulStickers(useful);
    // Pre-select only those not already in-flight or secured
    setSelected(
      useful
        .filter(s => !inFlightSet.has(s.id) && !securedSet.has(s.id))
        .map(s => s.id)
    );
    setStep("results");
  }

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleConfirm() {
    if (!user || selected.length === 0) return;
    setConfirming(true);
    const selectedIds = [...selected]; // capture before any state changes
    const displayName = getDisplayName();
    try {
      await createExternalRequest(user.id, selectedIds, displayName);
      if (!isPremium) {
        await incrementExternalListUses(user.id);
      }
      Alert.alert(
        "¡Listo!",
        `${selectedIds.length} postales de ${displayName} guardadas en "Por Recibir".`,
        [
          {
            text: "Compartir lista",
            onPress: async () => {
              await Share.share({ message: buildStickerShareText(selectedIds, "es", displayName) });
              router.replace("/(tabs)/friends?tab=requests");
            },
          },
          { text: "Ahora no", onPress: () => router.replace("/(tabs)/friends?tab=requests") },
        ]
      );
    } catch {
      Alert.alert("Error", "No se pudo crear la solicitud. Intenta de nuevo.");
    } finally {
      setConfirming(false);
    }
  }

  // ── Input step ─────────────────────────────────────────────────────────
  if (step === "input") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: BG }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar barStyle="light-content" backgroundColor={BG} />

        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: DIM3,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: ELEVATED,
              alignItems: "center", justifyContent: "center",
              marginRight: 12,
            }}
            activeOpacity={0.7}
          >
            <FontAwesome name="chevron-left" size={14} color={INK} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: INK, fontSize: 18, fontWeight: "800" }}>
              Intercambio externo
            </Text>
            <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }}>
              Pegá la lista de repetidas de tu amigo
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hint */}
          <View style={{
            backgroundColor: "rgba(244,196,48,0.08)",
            borderRadius: 12, borderWidth: 1,
            borderColor: "rgba(244,196,48,0.2)",
            padding: 12, marginBottom: 16,
            flexDirection: "row", alignItems: "flex-start", gap: 10,
          }}>
            <Text style={{ fontSize: 20 }}>💡</Text>
            <Text style={{ color: "rgba(244,196,48,0.9)", fontSize: 13, flex: 1, lineHeight: 19 }}>
              Pedile a tu amigo que te comparta su lista de repetidas. Pegala aquí y te decimos cuáles te sirven al instante.
            </Text>
          </View>

          {/* Nombre de la lista */}
          <TextInput
            value={listName}
            onChangeText={setListName}
            placeholder="Nombre del amigo (ej: Ronald)"
            placeholderTextColor="rgba(245,244,238,0.25)"
            returnKeyType="done"
            style={{
              backgroundColor: SURFACE,
              borderRadius: 12,
              borderWidth: 1, borderColor: DIM3,
              paddingHorizontal: 16, paddingVertical: 13,
              color: INK,
              fontSize: 15,
              marginBottom: 12,
            }}
          />

          {/* Textbox */}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={PLACEHOLDER}
            placeholderTextColor="rgba(245,244,238,0.25)"
            multiline
            textAlignVertical="top"
            style={{
              backgroundColor: SURFACE,
              borderRadius: 16,
              borderWidth: 1, borderColor: DIM3,
              padding: 16,
              color: INK,
              fontSize: 14,
              minHeight: 260,
              fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            }}
          />
        </ScrollView>

        {/* Analyze button */}
        <View style={{
          paddingHorizontal: 16, paddingBottom: insets.bottom + 12,
          paddingTop: 12,
          borderTopWidth: 1, borderTopColor: DIM3,
          backgroundColor: BG,
        }}>
          <TouchableOpacity
            onPress={analyze}
            disabled={!text.trim()}
            style={{
              borderRadius: 14, paddingVertical: 16, alignItems: "center",
              backgroundColor: text.trim() ? BRAND : ELEVATED,
            }}
            activeOpacity={0.85}
          >
            <Text style={{
              fontSize: 16, fontWeight: "800",
              color: text.trim() ? BG : DIM,
            }}>
              Analizar lista
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Results step ───────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: DIM3,
      }}>
        <TouchableOpacity
          onPress={() => setStep("input")}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: ELEVATED,
            alignItems: "center", justifyContent: "center",
            marginRight: 12,
          }}
          activeOpacity={0.7}
        >
          <FontAwesome name="chevron-left" size={14} color={INK} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: INK, fontSize: 18, fontWeight: "800" }}>
            Intercambio externo
          </Text>
          <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }}>
            {usefulStickers.length > 0
              ? `${usefulStickers.length} postales que te sirven`
              : "Ninguna postal de esta lista te sirve"
            }
          </Text>
        </View>
      </View>

      {/* Sticker picker — badges are informational, user can still select in-flight */}
      <StickerPickerPanel
        pool={usefulStickers}
        selected={selected}
        onToggle={toggle}
        inFlight={inFlightSet}
        secured={securedSet}
        blockInFlight={false}
        emptyIcon="📋"
        emptyText="Ninguna postal de esta lista te sirve. Puede que ya las tengas todas o que la lista no tenga postales válidas."
      />

      {/* Bottom action */}
      {usefulStickers.length > 0 && (
        <View style={{
          backgroundColor: SURFACE,
          borderTopWidth: 1, borderTopColor: DIM3,
          paddingHorizontal: 16, paddingTop: 12,
          paddingBottom: insets.bottom + 12,
        }}>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={confirming || selected.length === 0}
            style={{
              borderRadius: 14, paddingVertical: 16, alignItems: "center",
              backgroundColor: selected.length > 0 && !confirming ? GREEN : ELEVATED,
            }}
            activeOpacity={0.8}
          >
            {confirming ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{
                fontSize: 15, fontWeight: "800",
                color: selected.length > 0 ? "#fff" : DIM,
              }}>
                {selected.length > 0
                  ? `Confirmar ${selected.length} postal${selected.length === 1 ? "" : "es"}`
                  : "Seleccioná postales"
                }
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
