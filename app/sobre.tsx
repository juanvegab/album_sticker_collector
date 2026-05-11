import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Image, Dimensions, StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useCollection } from "@/hooks/useCollection";
import { WORLD_CUP_2026, TEAM_GROUP, FIFA_TO_ISO } from "@/lib/data/world-cup-2026";
import { colorForSection, needsDarkText } from "@/lib/design/groupColors";
import type { AlbumSection, AlbumSticker } from "@/types/album";

// ── Constants ──────────────────────────────────────────────────────────
const PACK_SIZE = 7;
const { width: W } = Dimensions.get("window");

// ── Module-level pre-computations ──────────────────────────────────────

/** All stickers by uppercase ID */
const STICKER_MAP = new Map<string, AlbumSticker>();
for (const section of WORLD_CUP_2026.sections) {
  for (const sticker of section.stickers) {
    STICKER_MAP.set(sticker.id.toUpperCase(), sticker);
  }
}

/** Sections grouped by first letter of their code */
const SECTIONS_BY_LETTER = new Map<string, AlbumSection[]>();
for (const section of WORLD_CUP_2026.sections) {
  const letter = section.id[0];
  if (!SECTIONS_BY_LETTER.has(letter)) SECTIONS_BY_LETTER.set(letter, []);
  SECTIONS_BY_LETTER.get(letter)!.push(section);
}

/** Sorted unique first letters */
const KEYBOARD_LETTERS = Array.from(SECTIONS_BY_LETTER.keys()).sort();

/** Numbers 0–19 for FWC, 1–20 for all other sections */
function getNumbers(sectionId: string): number[] {
  return sectionId === "FWC"
    ? Array.from({ length: 20 }, (_, i) => i)
    : Array.from({ length: 20 }, (_, i) => i + 1);
}

/** Display string for a sticker number */
function displayNum(sectionId: string, n: number): string {
  return sectionId === "FWC" ? String(n).padStart(2, "0") : String(n);
}

// ── Mosaic colors ──────────────────────────────────────────────────────
const MOSAIC = [
  "#F4C430", "#1FA7A0", "#E2453C", "#7FB832",
  "#2B6FE3", "#5847C4", "#10B981", "#D9457A",
  "#5BB3D6", "#3B8C5B", "#E55D4C", "#9333EA",
  "#0EA5E9", "#D9457A", "#F4C430", "#2B6FE3",
];

// ── Types ──────────────────────────────────────────────────────────────

type Step = "landing" | "input" | "result";

/** Keyboard interaction phase */
type KBPhase =
  | { phase: "letter" }
  | { phase: "country"; letter: string }
  | { phase: "number"; section: AlbumSection };

type Entry = { sticker: AlbumSticker; isNew: boolean };

// ── Sub-components ─────────────────────────────────────────────────────

function PackIllustration() {
  const ILLUS = 260;
  const cellSize = ILLUS / 4;
  return (
    <View style={{
      width: ILLUS, height: ILLUS, borderRadius: 28,
      overflow: "hidden", alignSelf: "center",
    }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: ILLUS }}>
        {MOSAIC.map((color, i) => (
          <View key={i} style={{ width: cellSize, height: cellSize, backgroundColor: color }} />
        ))}
      </View>
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: "rgba(11,11,14,0.88)",
          alignItems: "center", justifyContent: "center", marginBottom: 10,
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

function ResultCard({ entry }: { entry: Entry }) {
  const color = colorForSection(entry.sticker.sectionId, TEAM_GROUP);
  const dark = needsDarkText(color);
  const textColor = dark ? "rgba(0,0,0,0.7)" : "#fff";
  const subColor = dark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.6)";
  // 3 cards per row, 2px margin each side → (16+16) padding + (2+2+2+2) inner margins = 44px
  const cardW = (W - 44) / 3;

  return (
    <View style={{
      width: cardW, height: cardW * 1.2,
      borderRadius: 12, backgroundColor: color, margin: 2, padding: 7,
    }}>
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: subColor, fontSize: 10, fontWeight: "700" }} numberOfLines={1}>
          {entry.sticker.id}
        </Text>
      </View>
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

// ── Main Screen ────────────────────────────────────────────────────────
export default function SobreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { ownedSet, toggle, setDuplicates, duplicates } = useCollection();

  const [step, setStep] = useState<Step>("landing");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [kb, setKb] = useState<KBPhase>({ phase: "letter" });

  const packFull = entries.length >= PACK_SIZE;

  // ── Add sticker ──────────────────────────────────────────────────────
  const addSticker = useCallback((sticker: AlbumSticker) => {
    if (entries.length >= PACK_SIZE) return;
    const alreadyInPack = entries.some((e) => e.sticker.id === sticker.id);
    const isNew = !ownedSet.has(sticker.id) && !alreadyInPack;
    setEntries((prev) => [...prev, { sticker, isNew }]);
    setKb({ phase: "letter" });
  }, [entries, ownedSet]);

  // ── Remove sticker (tap on slot) ─────────────────────────────────────
  const removeEntry = useCallback((idx: number) => {
    setEntries((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Recompute isNew in order, since duplicates depend on position
      return next.map((e, i) => {
        const prevInPack = next.slice(0, i).some((p) => p.sticker.id === e.sticker.id);
        return { ...e, isNew: !ownedSet.has(e.sticker.id) && !prevInPack };
      });
    });
  }, [ownedSet]);

  // ── Back nav within keyboard ─────────────────────────────────────────
  const goBackFromNumber = useCallback((section: AlbumSection) => {
    const sibs = SECTIONS_BY_LETTER.get(section.id[0]) ?? [];
    setKb(sibs.length === 1 ? { phase: "letter" } : { phase: "country", letter: section.id[0] });
  }, []);

  // ── Save pack to collection ──────────────────────────────────────────
  function saveEntries(entriesToSave: Entry[]) {
    const newlyAdded = new Set<string>();
    const dupAdded: Record<string, number> = {};
    for (const e of entriesToSave) {
      const id = e.sticker.id;
      if (e.isNew && !newlyAdded.has(id)) {
        toggle(id);
        newlyAdded.add(id);
      } else {
        dupAdded[id] = (dupAdded[id] ?? 0) + 1;
      }
    }
    for (const [id, count] of Object.entries(dupAdded)) {
      setDuplicates(id, (duplicates[id] ?? 0) + count);
    }
  }

  const newCount = entries.filter((e) => e.isNew).length;
  const dupCount = entries.filter((e) => !e.isNew).length;

  // ── Button sizes ─────────────────────────────────────────────────────
  // 6 letter buttons per row with 8px gaps
  const LETTER_BTN = Math.floor((W - 32 - 5 * 8) / 6);
  // 5 number buttons per row with 6px gaps
  const NUM_BTN = Math.floor((W - 32 - 4 * 6) / 5);

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
            onPress={() => { setEntries([]); setKb({ phase: "letter" }); setStep("input"); }}
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

          <TouchableOpacity
            onPress={() => router.navigate("/(tabs)/album")}
            style={{ alignItems: "center" }}
            activeOpacity={0.7}
          >
            <Text style={{ color: "rgba(245,244,238,0.45)", fontSize: 14, fontWeight: "500" }}>
              {t("sobre.landing.oneByOne")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 2 — Input (interactive keyboard)
  // ════════════════════════════════════════════════════════════════════
  if (step === "input") {
    return (
      <View style={{ flex: 1, backgroundColor: "#0B0B0E", paddingTop: insets.top }}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

        {/* ── Header ── */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}>
          <TouchableOpacity
            onPress={() => { setEntries([]); setKb({ phase: "letter" }); router.back(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 22 }}>✕</Text>
          </TouchableOpacity>

          <Text style={{ flex: 1, color: "#F5F4EE", fontSize: 15, fontWeight: "700", textAlign: "center" }}>
            {t("sobre.input.title", { n: entries.length, total: PACK_SIZE })}
          </Text>

          <TouchableOpacity
            onPress={() => { saveEntries(entries); setStep("result"); }}
            disabled={entries.length === 0}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{
              color: entries.length > 0 ? "#F4C430" : "rgba(245,244,238,0.25)",
              fontSize: 15, fontWeight: "700",
            }}>
              {t("sobre.input.done")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Segmented progress bar ── */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 4, marginBottom: 10 }}>
          {Array.from({ length: PACK_SIZE }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1, height: 3, borderRadius: 99,
                backgroundColor: entries[i] ? "#F4C430" : "rgba(245,244,238,0.15)",
              }}
            />
          ))}
        </View>

        {/* ── Pack slots — 3 / 3 / 1 grid ── */}
        {(() => {
          // Card width: 3 per row, 12px h-padding each side, 8px gap × 2
          const SLOT_W = Math.floor((W - 24 - 16) / 3);
          const SLOT_H = 76;

          const renderSlot = (i: number) => {
            const entry = entries[i];
            const isNext = i === entries.length && !packFull;

            if (!entry) {
              return (
                <View
                  key={i}
                  style={{
                    width: SLOT_W, height: SLOT_H, borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isNext ? "rgba(244,196,48,0.5)" : "rgba(245,244,238,0.1)",
                    borderStyle: "dashed",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{
                    color: isNext ? "rgba(244,196,48,0.5)" : "rgba(245,244,238,0.18)",
                    fontSize: 13, fontWeight: "700",
                  }}>
                    {i + 1}
                  </Text>
                </View>
              );
            }

            const sectionColor = colorForSection(entry.sticker.sectionId, TEAM_GROUP);
            const cardColor = entry.isNew ? sectionColor : "#F2853A";
            const dark = entry.isNew ? needsDarkText(sectionColor) : false;
            const tc = dark ? "rgba(0,0,0,0.75)" : "#fff";

            return (
              <TouchableOpacity
                key={i}
                onPress={() => removeEntry(i)}
                style={{
                  width: SLOT_W, height: SLOT_H, borderRadius: 12,
                  backgroundColor: cardColor,
                  alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 9, fontWeight: "800", color: tc, letterSpacing: 0.4 }}>
                  {entry.sticker.sectionId}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: tc, lineHeight: 24 }}>
                  {displayNum(entry.sticker.sectionId, entry.sticker.number)}
                </Text>
                <View style={{
                  position: "absolute", top: 4, right: 4,
                  width: 16, height: 16, borderRadius: 8,
                  backgroundColor: "rgba(0,0,0,0.28)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ color: "#fff", fontSize: 8, lineHeight: 11 }}>✕</Text>
                </View>
              </TouchableOpacity>
            );
          };

          return (
            <View style={{ paddingHorizontal: 12, gap: 8, marginBottom: 12 }}>
              {/* Row 1: slots 0-2 */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[0, 1, 2].map(renderSlot)}
              </View>
              {/* Row 2: slots 3-5 */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[3, 4, 5].map(renderSlot)}
              </View>
              {/* Row 3: slot 6 — centered */}
              <View style={{ flexDirection: "row", justifyContent: "center" }}>
                {renderSlot(6)}
              </View>
            </View>
          );
        })()}

        {/* ── Keyboard area ── */}
        <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: insets.bottom + 8 }}>

          {/* ─── PHASE: letter ─── */}
          {kb.phase === "letter" && (
            packFull ? (
              // Pack is full — prompt to finish
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Text style={{ fontSize: 36 }}>🎉</Text>
                <Text style={{ color: "#F5F4EE", fontSize: 17, fontWeight: "700", textAlign: "center" }}>
                  {t("sobre.input.packFull")}
                </Text>
                <Text style={{ color: "rgba(245,244,238,0.45)", fontSize: 14, textAlign: "center" }}>
                  {t("sobre.input.packFullHint")}
                </Text>
              </View>
            ) : (
              // Letter grid — 6 per row (18 letters = 3 rows exact)
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
                {KEYBOARD_LETTERS.map((letter) => (
                  <TouchableOpacity
                    key={letter}
                    onPress={() => {
                      const sects = SECTIONS_BY_LETTER.get(letter) ?? [];
                      // Skip country phase when only 1 team starts with this letter
                      if (sects.length === 1) {
                        setKb({ phase: "number", section: sects[0] });
                      } else {
                        setKb({ phase: "country", letter });
                      }
                    }}
                    style={{
                      width: LETTER_BTN, height: LETTER_BTN,
                      borderRadius: 14, backgroundColor: "#1C1D24",
                      borderWidth: 1, borderColor: "rgba(245,244,238,0.08)",
                      alignItems: "center", justifyContent: "center",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: "#F5F4EE", fontSize: 20, fontWeight: "800" }}>
                      {letter}
                    </Text>
                    {/* Small count badge */}
                    <Text style={{ color: "rgba(245,244,238,0.3)", fontSize: 8, fontWeight: "600", marginTop: 1 }}>
                      {SECTIONS_BY_LETTER.get(letter)?.length}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}

          {/* ─── PHASE: country ─── */}
          {kb.phase === "country" && (
            <View style={{ flex: 1 }}>
              {/* Back */}
              <TouchableOpacity
                onPress={() => setKb({ phase: "letter" })}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, marginBottom: 8, gap: 6 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: "rgba(245,244,238,0.5)", fontSize: 22, lineHeight: 24 }}>←</Text>
                <Text style={{ color: "rgba(245,244,238,0.5)", fontSize: 15, fontWeight: "600" }}>
                  {kb.letter}
                </Text>
              </TouchableOpacity>

              {/* Country chips */}
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(SECTIONS_BY_LETTER.get(kb.letter) ?? []).map((section) => {
                    const color = colorForSection(section.id, TEAM_GROUP);
                    const dark = needsDarkText(color);
                    const iso = FIFA_TO_ISO[section.id];
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
                          <Text style={{
                            color: dark ? "#0B0B0E" : "#fff",
                            fontSize: 15, fontWeight: "800",
                          }}>
                            {section.id}
                          </Text>
                          <Text style={{
                            color: dark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)",
                            fontSize: 10, fontWeight: "600",
                          }}>
                            {section.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ─── PHASE: number ─── */}
          {kb.phase === "number" && (() => {
            const section = kb.section;
            const numbers = getNumbers(section.id);
            const sectionColor = colorForSection(section.id, TEAM_GROUP);
            const sectionDark = needsDarkText(sectionColor);
            const sectionIso = FIFA_TO_ISO[section.id];

            return (
              <View style={{ flex: 1 }}>
                {/* Back header */}
                <TouchableOpacity
                  onPress={() => goBackFromNumber(section)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, marginBottom: 10, gap: 8 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ color: "rgba(245,244,238,0.5)", fontSize: 22, lineHeight: 24 }}>←</Text>
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    backgroundColor: sectionColor, borderRadius: 99,
                    paddingHorizontal: 12, paddingVertical: 6,
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
                    <Text style={{
                      color: sectionDark ? "#0B0B0E" : "#fff",
                      fontSize: 13, fontWeight: "800",
                    }}>
                      {section.id}
                    </Text>
                  </View>
                  <Text style={{ color: "rgba(245,244,238,0.45)", fontSize: 12, fontWeight: "500" }}>
                    {section.name}
                  </Text>
                </TouchableOpacity>

                {/* Number grid — 5 per row */}
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {numbers.map((n) => {
                      const id = `${section.id}${n}`;
                      const inPack = entries.some((e) => e.sticker.id === id);
                      const isOwned = ownedSet.has(id);
                      const sticker = STICKER_MAP.get(id.toUpperCase());

                      return (
                        <TouchableOpacity
                          key={n}
                          onPress={() => { if (sticker) addSticker(sticker); }}
                          disabled={packFull}
                          style={{
                            width: NUM_BTN, height: NUM_BTN,
                            borderRadius: 12,
                            backgroundColor: inPack ? "#F2853A" : "#1C1D24",
                            borderWidth: isOwned && !inPack ? 2 : 1,
                            borderColor: inPack ? "#F2853A"
                              : isOwned ? "#22C55E"
                              : "rgba(245,244,238,0.08)",
                            alignItems: "center", justifyContent: "center",
                            opacity: packFull && !inPack ? 0.4 : 1,
                          }}
                          activeOpacity={0.65}
                        >
                          <Text style={{
                            color: inPack ? "#fff" : "#F5F4EE",
                            fontSize: 15, fontWeight: "800",
                          }}>
                            {displayNum(section.id, n)}
                          </Text>

                          {/* Green dot = already in collection */}
                          {isOwned && !inPack && (
                            <View style={{
                              position: "absolute", top: 4, right: 4,
                              width: 6, height: 6, borderRadius: 3,
                              backgroundColor: "#22C55E",
                            }} />
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
      </View>
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
            { top: 16, left: 24,  color: "#F4C430", size: 8,  rotate: "15deg" },
            { top: 24, left: 60,  color: "#E2453C", size: 7,  rotate: "-20deg" },
            { top: 12, right: 48, color: "#22C55E", size: 6,  rotate: "30deg" },
            { top: 20, right: 20, color: "#2B6FE3", size: 8,  rotate: "-10deg" },
            { top: 36, right: 68, color: "#D9457A", size: 5,  rotate: "45deg" },
            { top: 8,  left: 110, color: "#5847C4", size: 6,  rotate: "-35deg" },
          ].map((d, i) => (
            <View key={i} style={{
              position: "absolute",
              top: d.top,
              left: (d as any).left,
              right: (d as any).right,
              width: d.size, height: d.size,
              backgroundColor: d.color, borderRadius: 2,
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

        {/* Sticker cards grid — 3 per row, last card centered if alone */}
        <View style={{ marginHorizontal: -2 }}>
          {Array.from({ length: Math.ceil(validEntries.length / 3) }, (_, rowIdx) => {
            const row = validEntries.slice(rowIdx * 3, rowIdx * 3 + 3);
            const isLast = rowIdx === Math.ceil(validEntries.length / 3) - 1 && row.length < 3;
            return (
              <View
                key={rowIdx}
                style={{ flexDirection: "row", justifyContent: isLast ? "center" : "flex-start" }}
              >
                {row.map((entry, i) => <ResultCard key={`${rowIdx}-${i}`} entry={entry} />)}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={{
        position: "absolute", bottom: insets.bottom + 16, left: 16, right: 16,
        flexDirection: "row", gap: 10,
      }}>
        <TouchableOpacity
          onPress={() => {
            // Already saved when "Listo" was tapped — just reset for next pack
            setEntries([]);
            setKb({ phase: "letter" });
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
          onPress={() => router.navigate("/(tabs)/album")}
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
