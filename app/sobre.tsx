import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Image, Dimensions, StatusBar, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import { useCollection } from "@/hooks/useCollection";
import { WORLD_CUP_2026, TEAM_GROUP } from "@/lib/data/world-cup-2026";
import { colorForSection, needsDarkText } from "@/lib/design/groupColors";

// ── Constants ─────────────────────────────────────────────────────────
const PACK_SIZE = 7;
const { width: W } = Dimensions.get("window");

// Sticker lookup map (id → sticker)
const STICKER_MAP = new Map<string, import("@/types/album").AlbumSticker>();
for (const section of WORLD_CUP_2026.sections) {
  for (const sticker of section.stickers) {
    STICKER_MAP.set(sticker.id.toUpperCase(), sticker);
  }
}

// Mosaic colors for the landing illustration (4×4 grid)
const MOSAIC = [
  "#F4C430", "#1FA7A0", "#E2453C", "#7FB832",
  "#2B6FE3", "#5847C4", "#10B981", "#D9457A",
  "#5BB3D6", "#3B8C5B", "#E55D4C", "#9333EA",
  "#0EA5E9", "#D9457A", "#F4C430", "#2B6FE3",
];

// ── Types ─────────────────────────────────────────────────────────────
type Step = "landing" | "input" | "result";

type Entry = {
  raw: string;
  sticker: import("@/types/album").AlbumSticker | null;
  isNew: boolean | null; // null = not yet validated
};

function emptyEntries(): Entry[] {
  return Array.from({ length: PACK_SIZE }, () => ({ raw: "", sticker: null, isNew: null }));
}

// ── Sub-components ────────────────────────────────────────────────────

/** Colorful mosaic pack illustration for the landing screen */
function PackIllustration() {
  const ILLUS = 260;
  const cellSize = ILLUS / 4;
  return (
    <View style={{
      width: ILLUS, height: ILLUS, borderRadius: 28,
      overflow: "hidden", alignSelf: "center",
    }}>
      {/* Color mosaic */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: ILLUS }}>
        {MOSAIC.map((color, i) => (
          <View key={i} style={{ width: cellSize, height: cellSize, backgroundColor: color }} />
        ))}
      </View>

      {/* Overlay: icon + text */}
      <View style={{
        position: "absolute", inset: 0,
        alignItems: "center", justifyContent: "center",
      }}>
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: "rgba(11,11,14,0.88)",
          alignItems: "center", justifyContent: "center",
          marginBottom: 10,
        }}>
          <Image
            source={require("../assets/icon.png")}
            style={{ width: 44, height: 44, borderRadius: 10 }}
          />
        </View>
        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textAlign: "center" }}>
          EL ÁLBUM
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "600", letterSpacing: 1, textAlign: "center" }}>
          {`2026 · ${PACK_SIZE} POSTALES`}
        </Text>
      </View>
    </View>
  );
}

/** Sticker result card (read-only, no toggle) */
function ResultCard({ entry }: { entry: Entry }) {
  if (!entry.sticker) return null;
  const color = colorForSection(entry.sticker.sectionId, TEAM_GROUP);
  const dark = needsDarkText(color);
  const textColor = dark ? "rgba(0,0,0,0.7)" : "#fff";
  const subColor  = dark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.6)";
  const cardW = (W - 32 - 12) / 4; // 4 cols, 4px gap × 3, 16px h-padding × 2

  return (
    <View style={{
      width: cardW, height: cardW * 1.2,
      borderRadius: 12, backgroundColor: color,
      margin: 2, padding: 7,
    }}>
      {/* Top: section badge + dup count */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 }}>
          <Text style={{ color: textColor, fontSize: 8, fontWeight: "800" }}>
            {entry.sticker.sectionId}
          </Text>
        </View>
        {!entry.isNew && (
          <View style={{ backgroundColor: "#0B0B0E", borderRadius: 99, width: 18, height: 18, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 8, fontWeight: "800" }}>×2</Text>
          </View>
        )}
      </View>

      {/* Code centered */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: subColor, fontSize: 10, fontWeight: "700" }} numberOfLines={1}>
          {entry.sticker.id}
        </Text>
      </View>

      {/* Bottom: REPETIDA label */}
      {!entry.isNew && (
        <View style={{
          alignSelf: "center",
          backgroundColor: "#F2853A", borderRadius: 99,
          paddingHorizontal: 6, paddingVertical: 2,
        }}>
          <Text style={{ color: "#fff", fontSize: 7, fontWeight: "800", letterSpacing: 0.5 }}>
            REPETIDA
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────
export default function SobreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { ownedSet, toggle, setDuplicates, duplicates } = useCollection();

  const [step, setStep] = useState<Step>("landing");
  const [entries, setEntries] = useState<Entry[]>(emptyEntries);

  const inputRefs = useRef<Array<TextInput | null>>(Array(PACK_SIZE).fill(null));

  // ── Input handling ──────────────────────────────────────────────────
  const handleChange = useCallback((idx: number, text: string) => {
    const upper = text.toUpperCase().replace(/\s/g, "");
    const sticker = STICKER_MAP.get(upper) ?? null;

    setEntries((prev) => {
      const next = [...prev];
      // "is new" = not already in collection AND not entered earlier in this pack
      const prevEntered = next.slice(0, idx).some((e) => e.sticker?.id === sticker?.id);
      const isNew = sticker ? (!ownedSet.has(sticker.id) && !prevEntered) : null;
      next[idx] = { raw: upper, sticker, isNew };
      return next;
    });

    // Auto-advance when a valid sticker code is fully entered
    if (sticker && idx < PACK_SIZE - 1) {
      setTimeout(() => inputRefs.current[idx + 1]?.focus(), 50);
    }
  }, [ownedSet]);

  // ── Process → result ────────────────────────────────────────────────
  function processAndShowResult() {
    // Re-validate all entries considering duplicates within the pack
    setEntries((prev) => {
      return prev.map((e, idx) => {
        if (!e.sticker) return e;
        const prevEntered = prev.slice(0, idx).some((p) => p.sticker?.id === e.sticker!.id);
        const isNew = !ownedSet.has(e.sticker.id) && !prevEntered;
        return { ...e, isNew };
      });
    });
    setStep("result");
  }

  // ── Save to collection ──────────────────────────────────────────────
  function saveEntries(currentEntries: Entry[]) {
    const dupCounts: Record<string, number> = {};
    const newlyAdded = new Set<string>();

    for (const e of currentEntries) {
      if (!e.sticker) continue;
      const id = e.sticker.id;
      if (e.isNew && !newlyAdded.has(id)) {
        toggle(id);
        newlyAdded.add(id);
      } else if (!e.isNew) {
        dupCounts[id] = (dupCounts[id] ?? 0) + 1;
      }
    }
    for (const [id, added] of Object.entries(dupCounts)) {
      setDuplicates(id, (duplicates[id] ?? 0) + added);
    }
  }

  const validCount = entries.filter((e) => e.sticker !== null).length;
  const newCount  = entries.filter((e) => e.isNew === true).length;
  const dupCount  = entries.filter((e) => e.isNew === false).length;

  // ════════════════════════════════════════════════════════════════════
  // STEP 1 — Landing
  // ════════════════════════════════════════════════════════════════════
  if (step === "landing") {
    return (
      <View style={{ flex: 1, backgroundColor: "#0B0B0E", paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 22 }}>✕</Text>
          </TouchableOpacity>
          <Text style={{ color: "#F5F4EE", fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" }}>
            {t("sobre.title")}
          </Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Content */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <PackIllustration />

          <Text style={{ color: "#F5F4EE", fontSize: 26, fontWeight: "800", textAlign: "center", marginTop: 32, marginBottom: 10 }}>
            {t("sobre.landing.heading")}
          </Text>
          <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
            {t("sobre.landing.subtitle", { count: PACK_SIZE })}
          </Text>
        </View>

        {/* Bottom actions */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setStep("input")}
            style={{
              backgroundColor: "#F4C430", borderRadius: 16,
              paddingVertical: 17, alignItems: "center", marginBottom: 14,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: "#0B0B0E", fontSize: 16, fontWeight: "800" }}>
              {t("sobre.landing.cta")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={{ alignItems: "center" }} activeOpacity={0.7}>
            <Text style={{ color: "rgba(245,244,238,0.45)", fontSize: 14, fontWeight: "500" }}>
              {t("sobre.landing.oneByOne")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 2 — Input
  // ════════════════════════════════════════════════════════════════════
  if (step === "input") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#0B0B0E" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

        {/* Header */}
        <View style={{ paddingTop: insets.top }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}>
            <TouchableOpacity onPress={() => setStep("landing")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 15, fontWeight: "500" }}>
                ← {t("sobre.input.close")}
              </Text>
            </TouchableOpacity>

            <Text style={{ flex: 1, color: "#F5F4EE", fontSize: 15, fontWeight: "700", textAlign: "center" }}>
              {t("sobre.input.title", { n: validCount, total: PACK_SIZE })}
            </Text>

            <TouchableOpacity
              onPress={processAndShowResult}
              disabled={validCount === 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: validCount > 0 ? "#F4C430" : "rgba(245,244,238,0.25)", fontSize: 15, fontWeight: "700" }}>
                {t("sobre.input.done")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Segmented progress bar */}
          <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 4, marginBottom: 8 }}>
            {Array.from({ length: PACK_SIZE }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1, height: 3, borderRadius: 99,
                  backgroundColor: entries[i].sticker ? "#F4C430" : "rgba(245,244,238,0.15)",
                }}
              />
            ))}
          </View>
        </View>

        {/* Entry list */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {entries.map((entry, idx) => {
            const isActive = !entry.sticker && entries.slice(0, idx).every((e) => e.sticker !== null);
            const badgeColor =
              entry.sticker === null ? "rgba(245,244,238,0.15)"
              : entry.isNew ? "#22C55E"
              : "#F2853A";

            return (
              <TouchableOpacity
                key={idx}
                onPress={() => inputRefs.current[idx]?.focus()}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: "#15161B",
                  borderRadius: 14, padding: 14, marginBottom: 8,
                  borderWidth: isActive ? 1.5 : 1,
                  borderColor: isActive ? "#F4C430" : "rgba(245,244,238,0.08)",
                }}
              >
                {/* Position badge */}
                <View style={{
                  width: 30, height: 30, borderRadius: 10,
                  backgroundColor: badgeColor,
                  alignItems: "center", justifyContent: "center", marginRight: 14,
                }}>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>
                    {idx + 1}
                  </Text>
                </View>

                {/* Text input */}
                <TextInput
                  ref={(r) => { inputRefs.current[idx] = r; }}
                  value={entry.raw}
                  onChangeText={(t) => handleChange(idx, t)}
                  placeholder={entry.sticker ? "" : (isActive ? t("sobre.input.writing") : "—")}
                  placeholderTextColor={isActive ? "#F4C430" : "rgba(245,244,238,0.2)"}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType={idx < PACK_SIZE - 1 ? "next" : "done"}
                  onSubmitEditing={() => {
                    if (idx < PACK_SIZE - 1) inputRefs.current[idx + 1]?.focus();
                    else processAndShowResult();
                  }}
                  style={{
                    flex: 1,
                    color: "#F5F4EE",
                    fontSize: 17, fontWeight: "700",
                  }}
                />

                {/* Status badge */}
                {entry.sticker !== null && (
                  <View style={{
                    backgroundColor: entry.isNew ? "rgba(34,197,94,0.15)" : "rgba(242,133,58,0.15)",
                    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: entry.isNew ? "rgba(34,197,94,0.4)" : "rgba(242,133,58,0.4)",
                  }}>
                    <Text style={{
                      color: entry.isNew ? "#22C55E" : "#F2853A",
                      fontSize: 11, fontWeight: "800", letterSpacing: 0.5,
                    }}>
                      {entry.isNew ? `✓ ${t("sobre.input.nueva")}` : `🔁 ${t("sobre.input.repetida")}`}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 3 — Result
  // ════════════════════════════════════════════════════════════════════
  const validEntries = entries.filter((e) => e.sticker !== null);

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0E", paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 22 }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ color: "#F5F4EE", fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" }}>
          {t("sobre.result.title")}
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {/* Summary banner */}
        <View style={{
          backgroundColor: "#15161B", borderRadius: 18,
          padding: 20, marginBottom: 20, alignItems: "center",
          overflow: "hidden",
        }}>
          {/* Confetti dots */}
          {[
            { top: 16, left: 24, color: "#F4C430", size: 8, rotate: "15deg" },
            { top: 24, left: 60, color: "#E2453C", size: 7, rotate: "-20deg" },
            { top: 12, right: 48, color: "#22C55E", size: 6, rotate: "30deg" },
            { top: 20, right: 20, color: "#2B6FE3", size: 8, rotate: "-10deg" },
            { top: 36, right: 68, color: "#D9457A", size: 5, rotate: "45deg" },
            { top: 8,  left: 110, color: "#5847C4", size: 6, rotate: "-35deg" },
          ].map((d, i) => (
            <View key={i} style={{
              position: "absolute",
              top: d.top, left: (d as any).left, right: (d as any).right,
              width: d.size, height: d.size,
              backgroundColor: d.color,
              borderRadius: 2,
              transform: [{ rotate: d.rotate }],
            }} />
          ))}

          <Text style={{ color: "#22C55E", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginBottom: 6 }}>
            {t("sobre.result.goodPack")}
          </Text>
          <Text style={{ color: "#F5F4EE", fontSize: 52, fontWeight: "800", lineHeight: 56 }}>
            +{newCount} <Text style={{ fontSize: 36 }}>{t("sobre.result.nuevas")}</Text>
          </Text>
          {dupCount > 0 && (
            <Text style={{ color: "rgba(245,244,238,0.45)", fontSize: 14, marginTop: 6 }}>
              {t("sobre.result.dupCount", { count: dupCount })}
            </Text>
          )}
        </View>

        {/* Sticker cards grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -2 }}>
          {validEntries.map((entry, i) => (
            <ResultCard key={i} entry={entry} />
          ))}
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={{
        position: "absolute", bottom: insets.bottom + 16, left: 16, right: 16,
        flexDirection: "row", gap: 10,
      }}>
        <TouchableOpacity
          onPress={() => {
            saveEntries(entries);
            setEntries(emptyEntries());
            setStep("input");
          }}
          style={{
            flex: 1, backgroundColor: "#1C1D24", borderRadius: 16,
            paddingVertical: 17, alignItems: "center",
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: "#F5F4EE", fontSize: 15, fontWeight: "700" }}>
            {t("sobre.result.anotherPack")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            saveEntries(entries);
            router.back();
          }}
          style={{
            flex: 2, backgroundColor: "#F4C430", borderRadius: 16,
            paddingVertical: 17, alignItems: "center",
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: "#0B0B0E", fontSize: 15, fontWeight: "800" }}>
            {t("sobre.result.goToAlbum")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
