/**
 * StickerPickerSheet
 *
 * NOT a Modal — rendered as an absolute overlay inside an existing Modal
 * to avoid the nested-modal freeze bug on React Native.
 *
 * Usage: place inside a View with { flex:1, position:"relative" } and pass
 * visible/onClose/onAdd/addedIds props.
 */
import { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Pressable, ScrollView,
  Image, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { WORLD_CUP_2026, FIFA_TO_ISO, TEAM_GROUP } from "@/lib/data/world-cup-2026";
import { colorForSection, needsDarkText } from "@/lib/design/groupColors";
import type { AlbumSection } from "@/types/album";

// ── Module-level data ──────────────────────────────────────────────────────────
const { width: W } = Dimensions.get("window");

const SECTIONS_BY_LETTER = new Map<string, AlbumSection[]>();
for (const section of WORLD_CUP_2026.sections) {
  const letter = section.id[0];
  if (!SECTIONS_BY_LETTER.has(letter)) SECTIONS_BY_LETTER.set(letter, []);
  SECTIONS_BY_LETTER.get(letter)!.push(section);
}
const KEYBOARD_LETTERS = Array.from(SECTIONS_BY_LETTER.keys()).sort();

function getNumbers(sectionId: string): number[] {
  return sectionId === "FWC"
    ? Array.from({ length: 20 }, (_, i) => i)
    : Array.from({ length: 20 }, (_, i) => i + 1);
}

function displayNum(sectionId: string, n: number): string {
  return sectionId === "FWC" ? String(n).padStart(2, "0") : String(n);
}

// ── Types ──────────────────────────────────────────────────────────────────────

type KBPhase =
  | { phase: "letter" }
  | { phase: "country"; letter: string }
  | { phase: "number"; section: AlbumSection };

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Toggle: adds sticker if not in list, removes it if already there */
  onAdd: (id: string) => void;
  /** Adjust qty of a sticker already in the list (called from long-press menu) */
  onAdjustQty: (id: string, delta: number) => void;
  /** Maps sticker id → qty already in the detected list */
  addedQty: Map<string, number>;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function StickerPickerModal({ visible, onClose, onAdd, onAdjustQty, addedQty }: Props) {
  const insets = useSafeAreaInsets();
  const [kb, setKb] = useState<KBPhase>({ phase: "letter" });
  const [longPressId, setLongPressId] = useState<string | null>(null);

  const LETTER_BTN = Math.floor((W - 32 - 5 * 8) / 6);
  const NUM_BTN    = Math.floor((W - 32 - 4 * 6) / 5);

  function handleClose() {
    setKb({ phase: "letter" });
    onClose();
  }

  const goBackFromNumber = useCallback((section: AlbumSection) => {
    const sibs = SECTIONS_BY_LETTER.get(section.id[0]) ?? [];
    setKb(sibs.length === 1 ? { phase: "letter" } : { phase: "country", letter: section.id[0] });
  }, []);

  if (!visible) return null;

  return (
    // Full-screen absolute overlay — sits on top of the confirm list inside the parent Modal
    <View style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "#0B0B0E",
      zIndex: 10,
    }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: "rgba(245,244,238,0.08)",
      }}>
        {kb.phase !== "letter" ? (
          <TouchableOpacity
            onPress={() => {
              if (kb.phase === "country") setKb({ phase: "letter" });
              else goBackFromNumber(kb.section);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="rgba(245,244,238,0.6)" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}

        <Text style={{ color: "#F5F4EE", fontSize: 16, fontWeight: "700" }}>
          {kb.phase === "letter"   ? "Seleccionar postal"
           : kb.phase === "country" ? kb.letter
           : kb.section.id}
        </Text>

        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="close" size={22} color="rgba(245,244,238,0.6)" />
        </TouchableOpacity>
      </View>

      {/* Keyboard area */}
      <View style={{
        flex: 1, paddingHorizontal: 16,
        paddingTop: 16, paddingBottom: 8,
      }}>

        {/* ── PHASE: letter ── */}
        {kb.phase === "letter" && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
            {KEYBOARD_LETTERS.map((letter) => (
              <TouchableOpacity
                key={letter}
                onPress={() => {
                  const sects = SECTIONS_BY_LETTER.get(letter) ?? [];
                  if (sects.length === 1) setKb({ phase: "number", section: sects[0] });
                  else setKb({ phase: "country", letter });
                }}
                style={{
                  width: LETTER_BTN, height: LETTER_BTN,
                  borderRadius: 14, backgroundColor: "#1C1D24",
                  borderWidth: 1, borderColor: "rgba(245,244,238,0.08)",
                  alignItems: "center", justifyContent: "center",
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: "#F5F4EE", fontSize: 20, fontWeight: "800" }}>{letter}</Text>
                <Text style={{ color: "rgba(245,244,238,0.3)", fontSize: 8, fontWeight: "600", marginTop: 1 }}>
                  {SECTIONS_BY_LETTER.get(letter)?.length}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── PHASE: country ── */}
        {kb.phase === "country" && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(SECTIONS_BY_LETTER.get(kb.letter) ?? []).map((section) => {
                const color = colorForSection(section.id, TEAM_GROUP);
                const dark  = needsDarkText(color);
                const iso   = FIFA_TO_ISO[section.id];
                return (
                  <TouchableOpacity
                    key={section.id}
                    onPress={() => setKb({ phase: "number", section })}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 10,
                      backgroundColor: color, borderRadius: 99,
                      paddingHorizontal: 16, paddingVertical: 12,
                    }}
                    activeOpacity={0.75}
                  >
                    {iso ? (
                      <Image
                        source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
                        style={{ width: 28, height: 19, borderRadius: 3 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 20 }}>{section.emoji}</Text>
                    )}
                    <View>
                      <Text style={{ color: dark ? "#0B0B0E" : "#fff", fontSize: 15, fontWeight: "800" }}>
                        {section.id}
                      </Text>
                      <Text style={{ color: dark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "600" }}>
                        {section.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ── PHASE: number ── */}
        {kb.phase === "number" && (() => {
          const section      = kb.section;
          const numbers      = getNumbers(section.id);
          const sectionColor = colorForSection(section.id, TEAM_GROUP);
          const sectionDark  = needsDarkText(sectionColor);
          const sectionIso   = FIFA_TO_ISO[section.id];

          return (
            <View style={{ flex: 1 }}>
              {/* Section pill */}
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                backgroundColor: sectionColor, borderRadius: 99,
                paddingHorizontal: 14, paddingVertical: 8,
                alignSelf: "flex-start", marginBottom: 16,
              }}>
                {sectionIso ? (
                  <Image
                    source={{ uri: `https://flagcdn.com/w40/${sectionIso}.png` }}
                    style={{ width: 24, height: 16, borderRadius: 2 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 16 }}>{section.emoji}</Text>
                )}
                <Text style={{ color: sectionDark ? "#0B0B0E" : "#fff", fontSize: 13, fontWeight: "800" }}>
                  {section.id}
                </Text>
                <Text style={{ color: sectionDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "600" }}>
                  {section.name}
                </Text>
              </View>

              {/* Number grid */}
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {numbers.map((n) => {
                    const id     = `${section.id}${n}`;
                    const qty    = addedQty.get(id) ?? 0;
                    const inList = qty > 0;
                    return (
                      <TouchableOpacity
                        key={n}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onAdd(id);
                        }}
                        onLongPress={() => {
                          if (!inList) return;
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setLongPressId(id);
                        }}
                        delayLongPress={350}
                        style={{
                          width: NUM_BTN, height: NUM_BTN,
                          borderRadius: 12,
                          backgroundColor: inList ? "#F2853A" : "#1C1D24",
                          borderWidth: 1,
                          borderColor: inList ? "#F2853A" : "rgba(245,244,238,0.08)",
                          alignItems: "center", justifyContent: "center",
                        }}
                        activeOpacity={0.65}
                      >
                        <Text style={{ color: "#F5F4EE", fontSize: 15, fontWeight: "800" }}>
                          {displayNum(section.id, n)}
                        </Text>
                        {inList && (
                          <View style={{
                            position: "absolute", top: 3, right: 3,
                            backgroundColor: "#fff", borderRadius: 6,
                            minWidth: 14, height: 14,
                            paddingHorizontal: 2,
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <Text style={{ color: "#F2853A", fontSize: 8, fontWeight: "900", lineHeight: 13 }}>
                              {qty}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          );
        })()}
      </View>

      {/* Footer — appears once at least 1 sticker is in the list */}
      {/* Long-press qty context menu */}
      {longPressId && (
        // Pressable backdrop fills the screen; the menu card sits above it via elevation/zIndex
        <Pressable
          style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 19,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center", alignItems: "center",
          }}
          onPress={() => setLongPressId(null)}
        >
          {/* Stop propagation so taps on the card don't dismiss */}
          <Pressable
            onPress={() => {}}
            style={{
              width: 260,
              zIndex: 20, elevation: 20,
              backgroundColor: "#1C1D24",
              borderRadius: 20, padding: 24,
              alignItems: "center", gap: 16,
              borderWidth: 1, borderColor: "rgba(245,244,238,0.12)",
              shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 16,
            }}
          >
            <Text style={{ color: "rgba(245,244,238,0.45)", fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
              CANTIDAD
            </Text>
            <Text style={{ color: "#F5F4EE", fontSize: 20, fontWeight: "800" }}>
              {longPressId}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const current = addedQty.get(longPressId) ?? 1;
                  if (current <= 1) { setLongPressId(null); onAdd(longPressId); return; }
                  onAdjustQty(longPressId, -1);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: "rgba(245,244,238,0.08)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ color: "#F5F4EE", fontSize: 26, fontWeight: "700", lineHeight: 30 }}>−</Text>
              </TouchableOpacity>

              <Text style={{ color: "#F2853A", fontSize: 40, fontWeight: "900", minWidth: 48, textAlign: "center" }}>
                {addedQty.get(longPressId) ?? 1}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onAdjustQty(longPressId, +1);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: "rgba(245,244,238,0.08)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ color: "#F5F4EE", fontSize: 26, fontWeight: "700", lineHeight: 30 }}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Listo — prominent */}
            <TouchableOpacity
              onPress={() => setLongPressId(null)}
              style={{
                marginTop: 4,
                backgroundColor: "#F2853A", borderRadius: 12,
                paddingVertical: 10, paddingHorizontal: 32,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>Listo</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}

      {addedQty.size > 0 && (
        <View style={{
          paddingHorizontal: 16, paddingTop: 10,
          paddingBottom: insets.bottom + 16,
          borderTopWidth: 1, borderTopColor: "rgba(245,244,238,0.08)",
          gap: 10,
        }}>
          <Text style={{
            textAlign: "center",
            color: "rgba(245,244,238,0.35)",
            fontSize: 12, lineHeight: 17,
          }}>
            Podés seguir marcando postales de otros países antes de cerrar
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#F2853A", borderRadius: 16,
              paddingVertical: 15, alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
              Listo — {addedQty.size} {addedQty.size === 1 ? "postal" : "postales"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
