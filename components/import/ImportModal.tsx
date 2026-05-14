import { useState, useMemo } from "react";
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCollection } from "@/hooks/useCollection";
import { usePremium } from "@/hooks/usePremium";
import {
  WORLD_CUP_2026, ALL_STICKERS_MAP,
  TEAM_GROUP, FIFA_TO_ISO, CC_STICKER_IDS,
} from "@/lib/data/world-cup-2026";
import { parseCollectionWithAI, type ImportResult } from "@/lib/firestore/import";
import type { AlbumSection } from "@/types/album";

// ── Design tokens ─────────────────────────────────────────────────────
const BG      = "#0B0B0E";
const SURFACE = "#15161B";
const INK     = "#F5F4EE";
const DIM     = "rgba(245,244,238,0.38)";
const DIM3    = "rgba(245,244,238,0.08)";
const BRAND   = "#F4C430";
const GREEN   = "#22C55E";
const ORANGE  = "#F2853A";

type Step = "input" | "preview" | "done";

interface GroupedSection {
  section: AlbumSection;
  numbers: number[];
}

type PreviewItem =
  | { type: "header"; letter: string }
  | { type: "section"; gs: GroupedSection };

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Stable sort index from album order
const SECTION_INDEX = new Map(WORLD_CUP_2026.sections.map((s, i) => [s.id, i]));

export function ImportModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ownedSet, bulkOwn, setDuplicates } = useCollection();
  const { isPremium, isTrialActive } = usePremium();

  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Captured at confirm time — newOwned becomes [] after bulkOwn updates ownedSet
  const [confirmedNew, setConfirmedNew] = useState(0);
  const [confirmedDupes, setConfirmedDupes] = useState(0);

  const hasAccess = isPremium || isTrialActive();

  // ── Merge logic: only stickers not yet owned ──────────────────────
  const newOwned = useMemo(
    () => (result?.owned ?? []).filter((id) => !ownedSet.has(id)),
    [result, ownedSet]
  );

  const newDupes = useMemo(() => result?.duplicates ?? {}, [result]);

  // ── Group newOwned by section, sorted by album order ──────────────
  const grouped = useMemo<GroupedSection[]>(() => {
    const map = new Map<string, GroupedSection>();
    for (const id of newOwned) {
      const sticker = ALL_STICKERS_MAP.get(id);
      if (!sticker) continue;
      const sec = WORLD_CUP_2026.sections.find((s) => s.id === sticker.sectionId);
      if (!sec) continue;
      if (!map.has(sec.id)) map.set(sec.id, { section: sec, numbers: [] });
      map.get(sec.id)!.numbers.push(sticker.number);
    }
    for (const g of map.values()) g.numbers.sort((a, b) => a - b);
    return [...map.values()].sort(
      (a, b) =>
        (SECTION_INDEX.get(a.section.id) ?? 999) -
        (SECTION_INDEX.get(b.section.id) ?? 999)
    );
  }, [newOwned]);

  // ── Duplicates per section ────────────────────────────────────────
  const dupsBySection = useMemo(() => {
    const map = new Map<string, { num: number; count: number }[]>();
    for (const [id, count] of Object.entries(newDupes)) {
      const sticker = ALL_STICKERS_MAP.get(id);
      if (!sticker) continue;
      if (!map.has(sticker.sectionId)) map.set(sticker.sectionId, []);
      map.get(sticker.sectionId)!.push({ num: sticker.number, count });
    }
    for (const arr of map.values()) arr.sort((a, b) => a.num - b.num);
    return map;
  }, [newDupes]);

  // ── Insert group headers between sections ─────────────────────────
  const previewItems = useMemo<PreviewItem[]>(() => {
    const items: PreviewItem[] = [];
    let lastGroup = "__START__";
    for (const gs of grouped) {
      const group = TEAM_GROUP[gs.section.id] ?? null;
      if (group !== lastGroup) {
        if (group) items.push({ type: "header", letter: group });
        lastGroup = group ?? "__NONE__";
      }
      items.push({ type: "section", gs });
    }
    return items;
  }, [grouped]);

  function handleClose() {
    setStep("input");
    setText("");
    setResult(null);
    setConfirmedNew(0);
    setConfirmedDupes(0);
    onClose();
  }

  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      const res = await parseCollectionWithAI(text.trim(), token);
      setResult(res);
      setStep("preview");
    } catch {
      Alert.alert(t("common.error"), t("import.importError"));
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    // Capture counts NOW — after bulkOwn, ownedSet updates and newOwned becomes []
    setConfirmedNew(newOwned.length);
    setConfirmedDupes(Object.keys(newDupes).length);
    if (newOwned.length > 0) bulkOwn(newOwned);
    for (const [id, count] of Object.entries(newDupes)) {
      setDuplicates(id, count);
    }
    setStep("done");
  }

  const totalNew = newOwned.length;
  const totalDupes = Object.keys(newDupes).length;

  // Album % after import (ownedSet is updated synchronously by Zustand after bulkOwn)
  const albumPct = useMemo(() => {
    const nonCC = [...ownedSet].filter((id) => !CC_STICKER_IDS.has(id)).length;
    return Math.round((nonCC / WORLD_CUP_2026.totalStickers) * 100);
  }, [ownedSet]);

  // Bottom padding for safe area
  const bottomPad = Math.max(insets.bottom + 12, 24);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: BG }}>

        {/* ── Loading overlay ── */}
        {loading && (
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: "rgba(0,0,0,0.75)",
            alignItems: "center", justifyContent: "center", zIndex: 99,
          }]}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={{ color: INK, fontSize: 15, fontWeight: "600", marginTop: 16 }}>
              {t("import.importAnalyzing")}
            </Text>
          </View>
        )}

        {/* ── Header ── */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingTop: insets.top || 16,
          paddingHorizontal: 20, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: DIM3,
        }}>
          <Text style={{ flex: 1, color: INK, fontSize: 18, fontWeight: "800" }}>
            {t("import.importTitle")}
          </Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <FontAwesome name="times" size={18} color={DIM} />
          </TouchableOpacity>
        </View>

        {/* ══ INPUT STEP ══ */}
        {step === "input" && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            {!hasAccess ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
                <FontAwesome name="lock" size={40} color={DIM} style={{ marginBottom: 20 }} />
                <Text style={{ color: INK, fontSize: 17, fontWeight: "700", marginBottom: 10, textAlign: "center" }}>
                  {t("import.importTitle")}
                </Text>
                <Text style={{ color: DIM, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                  {t("import.importPremiumOnly")}
                </Text>
              </View>
            ) : (
              <>
                <ScrollView
                  contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={{ color: DIM, fontSize: 14, marginBottom: 16, lineHeight: 22 }}>
                    {t("import.importHintText")}
                  </Text>

                  <TextInput
                    multiline
                    value={text}
                    onChangeText={setText}
                    placeholder={t("import.importHint")}
                    placeholderTextColor="rgba(245,244,238,0.25)"
                    style={{
                      backgroundColor: SURFACE, borderRadius: 14,
                      paddingHorizontal: 16, paddingVertical: 14,
                      color: INK, fontSize: 14, lineHeight: 22,
                      minHeight: 200, textAlignVertical: "top",
                    }}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </ScrollView>

                {/* Fixed bottom button */}
                <View style={{
                  paddingHorizontal: 20,
                  paddingBottom: bottomPad,
                  paddingTop: 12,
                  borderTopWidth: 1, borderTopColor: DIM3,
                }}>
                  <TouchableOpacity
                    onPress={handleAnalyze}
                    disabled={loading || !text.trim()}
                    activeOpacity={0.85}
                    style={{
                      borderRadius: 14, paddingVertical: 16, alignItems: "center",
                      backgroundColor: text.trim() && !loading ? BRAND : DIM3,
                    }}
                  >
                    {loading ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <ActivityIndicator color={BG} size="small" />
                        <Text style={{ color: BG, fontSize: 15, fontWeight: "800" }}>
                          {t("import.importAnalyzing")}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{
                        fontSize: 16, fontWeight: "800",
                        color: text.trim() ? BG : DIM,
                      }}>
                        {t("import.importAnalyze")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </KeyboardAvoidingView>
        )}

        {/* ══ PREVIEW STEP ══ */}
        {step === "preview" && (
          <>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 }}>
              {totalNew === 0 && totalDupes === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 48 }}>
                  <FontAwesome name="check-circle" size={56} color={GREEN} style={{ marginBottom: 20 }} />
                  <Text style={{ color: INK, fontSize: 17, fontWeight: "700", textAlign: "center", lineHeight: 24 }}>
                    {t("import.importNoNew")}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Summary chips */}
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                    {totalNew > 0 && (
                      <View style={{
                        flex: 1, backgroundColor: "rgba(34,197,94,0.15)",
                        borderRadius: 12, padding: 14, alignItems: "center",
                      }}>
                        <Text style={{ color: GREEN, fontSize: 26, fontWeight: "800" }}>{totalNew}</Text>
                        <Text style={{ color: GREEN, fontSize: 10, fontWeight: "700", marginTop: 2 }}>
                          {t("import.importFoundOwned", { count: totalNew }).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {totalDupes > 0 && (
                      <View style={{
                        flex: 1, backgroundColor: "rgba(242,133,58,0.12)",
                        borderRadius: 12, padding: 14, alignItems: "center",
                      }}>
                        <Text style={{ color: ORANGE, fontSize: 26, fontWeight: "800" }}>{totalDupes}</Text>
                        <Text style={{ color: ORANGE, fontSize: 10, fontWeight: "700", marginTop: 2 }}>
                          {t("import.importFoundDupes", { count: totalDupes }).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Sections + group headers */}
                  {previewItems.map((item, idx) => {
                    if (item.type === "header") {
                      return (
                        <View
                          key={`header-${item.letter}`}
                          style={{
                            flexDirection: "row", alignItems: "center",
                            marginTop: idx === 0 ? 0 : 12, marginBottom: 8,
                          }}
                        >
                          <Text style={{
                            color: DIM, fontSize: 11, fontWeight: "700",
                            letterSpacing: 1, textTransform: "uppercase",
                          }}>
                            Grupo {item.letter}
                          </Text>
                          <View style={{ flex: 1, height: 1, backgroundColor: DIM3, marginLeft: 8 }} />
                        </View>
                      );
                    }

                    const { gs } = item;
                    const iso = FIFA_TO_ISO[gs.section.id];
                    const sectionDupes = dupsBySection.get(gs.section.id) ?? [];
                    const dupCount = sectionDupes.reduce((s, d) => s + d.count, 0);

                    return (
                      <View
                        key={gs.section.id}
                        style={{
                          backgroundColor: SURFACE, borderRadius: 14,
                          padding: 14, marginBottom: 8,
                        }}
                      >
                        {/* Section header row */}
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                          {iso ? (
                            <Image
                              source={{ uri: `https://flagcdn.com/w40/${iso}.png` }}
                              style={{ width: 26, height: 17, borderRadius: 2, marginRight: 8 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={{ fontSize: 18, marginRight: 8 }}>{gs.section.emoji}</Text>
                          )}
                          <Text style={{ flex: 1, color: INK, fontSize: 14, fontWeight: "700" }}>
                            {gs.section.name}
                          </Text>
                          {/* Pills */}
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            {gs.numbers.length > 0 && (
                              <View style={{
                                backgroundColor: "rgba(34,197,94,0.15)",
                                borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3,
                              }}>
                                <Text style={{ color: GREEN, fontSize: 11, fontWeight: "700" }}>
                                  +{gs.numbers.length} {t("import.importNewSection")}
                                </Text>
                              </View>
                            )}
                            {sectionDupes.length > 0 && (
                              <View style={{
                                backgroundColor: "rgba(242,133,58,0.15)",
                                borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3,
                              }}>
                                <Text style={{ color: ORANGE, fontSize: 11, fontWeight: "700" }}>
                                  {dupCount} repetidas
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Owned sticker numbers — green */}
                        {gs.numbers.length > 0 && (
                          <Text style={{ color: GREEN, fontSize: 12, lineHeight: 18, opacity: 0.8 }}>
                            {gs.numbers.join(" ")}
                          </Text>
                        )}

                        {/* Duplicate numbers — orange, below owned */}
                        {sectionDupes.length > 0 && (
                          <Text style={{
                            color: ORANGE, fontSize: 12, lineHeight: 18, opacity: 0.9,
                            marginTop: gs.numbers.length > 0 ? 3 : 0,
                          }}>
                            {sectionDupes
                              .map((d) => d.count > 1 ? `${d.num}×${d.count}` : `${d.num}`)
                              .join(" ")}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>

            <View style={{
              paddingHorizontal: 20, paddingBottom: bottomPad,
              borderTopWidth: 1, borderTopColor: DIM3, paddingTop: 14, gap: 10,
            }}>
              {(totalNew > 0 || totalDupes > 0) && (
                <TouchableOpacity
                  onPress={handleConfirm}
                  activeOpacity={0.85}
                  style={{ borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: BRAND }}
                >
                  <Text style={{ color: BG, fontSize: 16, fontWeight: "800" }}>
                    {t("import.importConfirm")}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setStep("input")}
                activeOpacity={0.7}
                style={{ borderRadius: 14, paddingVertical: 13, alignItems: "center", backgroundColor: DIM3 }}
              >
                <Text style={{ color: DIM, fontSize: 14, fontWeight: "600" }}>{t("common.back")}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ══ DONE STEP ══ */}
        {step === "done" && (
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
            {/* Icon + title */}
            <View style={{ alignItems: "center", marginBottom: 32 }}>
              <FontAwesome name="check-circle" size={64} color={GREEN} style={{ marginBottom: 16 }} />
              <Text style={{ color: INK, fontSize: 24, fontWeight: "800", textAlign: "center" }}>
                {t("import.importSuccess")}
              </Text>
            </View>

            {/* Stats row: nuevas + repetidas */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <View style={{
                flex: 1, backgroundColor: "rgba(34,197,94,0.12)",
                borderRadius: 16, padding: 16, alignItems: "center",
              }}>
                <Text style={{ color: GREEN, fontSize: 32, fontWeight: "800", lineHeight: 36 }}>
                  {confirmedNew}
                </Text>
                <Text style={{ color: GREEN, fontSize: 11, fontWeight: "700", marginTop: 4, letterSpacing: 0.5 }}>
                  NUEVAS
                </Text>
              </View>
              {confirmedDupes > 0 && (
                <View style={{
                  flex: 1, backgroundColor: "rgba(242,133,58,0.12)",
                  borderRadius: 16, padding: 16, alignItems: "center",
                }}>
                  <Text style={{ color: ORANGE, fontSize: 32, fontWeight: "800", lineHeight: 36 }}>
                    {confirmedDupes}
                  </Text>
                  <Text style={{ color: ORANGE, fontSize: 11, fontWeight: "700", marginTop: 4, letterSpacing: 0.5 }}>
                    REPETIDAS
                  </Text>
                </View>
              )}
            </View>

            {/* Album completion */}
            <View style={{
              backgroundColor: SURFACE, borderRadius: 16,
              padding: 16, marginBottom: 36,
            }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 8 }}>
                <Text style={{ color: INK, fontSize: 36, fontWeight: "800", lineHeight: 40 }}>
                  {albumPct}
                </Text>
                <Text style={{ color: BRAND, fontSize: 20, fontWeight: "800", marginLeft: 2 }}>%</Text>
                <Text style={{ flex: 1 }} />
                <Text style={{ color: DIM, fontSize: 13, fontWeight: "600" }}>
                  de tu álbum
                </Text>
              </View>
              <View style={{ height: 5, backgroundColor: DIM3, borderRadius: 99, overflow: "hidden" }}>
                <View style={{
                  height: 5, borderRadius: 99, backgroundColor: BRAND,
                  width: `${albumPct}%`,
                }} />
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={() => { handleClose(); router.navigate("/(tabs)/album"); }}
              activeOpacity={0.85}
              style={{ borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: BRAND }}
            >
              <Text style={{ color: BG, fontSize: 16, fontWeight: "800" }}>{t("import.importViewAlbum")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
