import { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ALL_STICKERS_MAP, ALBUM_SECTIONS_MAP, OCR_ALIASES_MAP } from "@/lib/data/world-cup-2026";
import { useCollection } from "@/hooks/useCollection";
import { StickerPickerModal } from "./StickerPickerModal";

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = "idle" | "processing" | "confirm";
type Mode = "add" | "remove";

interface DetectedSticker {
  id: string;
  selected: boolean;
  isOwned: boolean;
  duplicateCount: number; // current count in collection before this action
  qty: number;            // how many to add or remove in this batch (≥ 1)
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ── OCR Parser — returns Map<id, qty> counting each occurrence ────────────────

function parseStickersFromOCR(rawText: string): Map<string, number> {
  const counts = new Map<string, number>();

  // Primary pass: count every occurrence of valid codes
  const regex = /\b([A-Z]{2,3})\s?(\d{1,2})\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const id = `${match[1]}${parseInt(match[2], 10)}`;
    if (ALL_STICKERS_MAP.has(id)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  // Secondary pass: alias codes — count occurrences via matchAll
  for (const [alias, canonicalId] of OCR_ALIASES_MAP) {
    const aliasRegex = new RegExp(`\\b${alias}\\b`, "g");
    const hits = [...rawText.matchAll(aliasRegex)].length;
    if (hits > 0) {
      counts.set(canonicalId, (counts.get(canonicalId) ?? 0) + hits);
    }
  }

  return counts;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ScanStickersModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("idle");
  const [mode, setMode] = useState<Mode>("add");
  const [detected, setDetected] = useState<DetectedSticker[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const { ownedSet, duplicates, bulkOwn, setDuplicates } = useCollection();

  // ── Reset on close ────────────────────────────────────────────────────────
  function handleClose() {
    setStep("idle");
    setMode("add");
    setDetected([]);
    onClose();
  }

  // ── Open camera via ImagePicker (UIImagePickerController — always stable) ──
  const handleOpenCamera = useCallback(async () => {
    console.log("[Scan] requesting camera permission...");
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    console.log("[Scan] camera permission status:", status);

    if (status !== "granted") {
      Alert.alert(t("friends.cameraPermission"), t("friends.allowCamera"));
      return;
    }

    console.log("[Scan] launching camera...");
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });

    console.log("[Scan] camera result — cancelled:", result.canceled);
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    console.log("[Scan] photo URI:", uri);

    setStep("processing");

    try {
      console.log("[Scan] running OCR...");
      const ocrResult = await TextRecognition.recognize(uri);
      console.log("[Scan] OCR raw text:", ocrResult.text);

      const counts = parseStickersFromOCR(ocrResult.text);
      console.log("[Scan] matched sticker counts:", Object.fromEntries(counts));

      if (counts.size === 0) {
        Alert.alert(t("scan.noDetected"), t("scan.noDetectedHint"), [
          { text: t("common.ok"), onPress: () => setStep("idle") },
        ]);
        return;
      }

      const items: DetectedSticker[] = [...counts.entries()].map(([id, qty]) => ({
        id,
        selected: true,
        isOwned: ownedSet.has(id),
        duplicateCount: duplicates[id] ?? 0,
        qty,
      }));

      setDetected(items);
      setMode("add");
      setStep("confirm");
    } catch (err) {
      console.error("[Scan] OCR error:", err);
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert("Error (debug)", message, [
        { text: "OK", onPress: () => setStep("idle") },
      ]);
    }
  }, [ownedSet, duplicates, t]);

  // ── Toggle selection ──────────────────────────────────────────────────────
  function toggleSelected(id: string) {
    setDetected((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  }

  // ── Switch mode ───────────────────────────────────────────────────────────
  function handleSetMode(next: Mode) {
    if (next === mode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(next);
    if (next === "remove") {
      setDetected((prev) =>
        prev.map((d) => {
          if (!d.isOwned || d.duplicateCount === 0) {
            // Can't deliver what you don't have as a duplicate
            return { ...d, selected: false };
          }
          // Cap qty to available duplicates
          return { ...d, qty: Math.min(d.qty, d.duplicateCount) };
        })
      );
    } else {
      setDetected((prev) => prev.map((d) => ({ ...d, selected: true })));
    }
  }

  // ── Adjust qty on a detected sticker ─────────────────────────────────────
  function adjustQty(id: string, delta: number) {
    setDetected((prev) => {
      const next = prev.map((d) => {
        if (d.id !== id) return d;
        const nextQty = d.qty + delta;
        const max     = mode === "remove" ? d.duplicateCount : Infinity;
        if (nextQty < 1 || nextQty > max) return d;
        return { ...d, qty: nextQty };
      });
      // Only fire haptic if something actually changed
      const changed = next.some((d, i) => d.qty !== prev[i].qty);
      if (changed) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return next;
    });
  }

  // ── Manual add from picker — toggle: adds if not in list, removes if present
  function handlePickerAdd(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetected((prev) => {
      if (prev.some((d) => d.id === id)) {
        // Toggle off — remove from list
        return prev.filter((d) => d.id !== id);
      }
      return [
        ...prev,
        {
          id,
          selected: true,
          isOwned: ownedSet.has(id),
          duplicateCount: duplicates[id] ?? 0,
          qty: 1,
        },
      ];
    });
  }

  // ── Action: Update — applies qty for each selected item ──────────────────
  function handleUpdate() {
    const selected = detected.filter((d) => d.selected);

    if (mode === "add") {
      selected.forEach((d) => {
        if (!d.isOwned) {
          // First copy marks as owned, remaining qty-1 become duplicates
          bulkOwn([d.id]);
          if (d.qty > 1) setDuplicates(d.id, (d.duplicateCount) + (d.qty - 1));
        } else {
          // Already owned — all qty copies are duplicates
          setDuplicates(d.id, d.duplicateCount + d.qty);
        }
      });
    } else {
      selected.forEach((d) => {
        const remaining = d.duplicateCount - d.qty;
        if (remaining >= 0) {
          setDuplicates(d.id, remaining);
        } else {
          // Removing more dups than exist → clear dups and unmark owned
          setDuplicates(d.id, 0);
          bulkOwn([d.id]); // bulkOwn toggles: owned → removes
        }
      });
    }

    handleClose();
  }

  // ── Mini badge (state indicator, left of stepper) ─────────────────────────
  function renderBadge(item: DetectedSticker) {
    if (mode === "add") {
      if (!item.isOwned) {
        return <View style={styles.badgeNew}><Text style={styles.badgeText}>{t("scan.new")}</Text></View>;
      }
      return <View style={styles.badgeDuplicate}><Text style={styles.badgeText}>+{item.qty}</Text></View>;
    } else {
      if (!item.isOwned) {
        return <View style={styles.badgeDisabled}><Text style={styles.badgeText}>—</Text></View>;
      }
      if (item.duplicateCount === 0) {
        return <View style={styles.badgeNoStock}><Text style={styles.badgeNoStockText}>{t("scan.noStock")}</Text></View>;
      }
      return <View style={styles.badgeRemoveDup}><Text style={styles.badgeText}>−{item.qty}</Text></View>;
    }
  }

  // ── Map id → qty for picker (shows count on each number button) ──────────
  const detectedQtyMap = new Map(detected.map((d) => [d.id, d.qty]));

  // ── Bottom safe padding (more generous on Android) ────────────────────────
  const bottomPad = Platform.OS === "android"
    ? Math.max(insets.bottom, 16) + 16
    : Math.max(insets.bottom, 8) + 8;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.headerTitle}>{t("scan.title")}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>

          {/* Step: idle — instructions + scan button */}
          {step === "idle" && (
            <View style={styles.idleContainer}>

              {/* Tips */}
              <View style={styles.tipsCard}>
                {[
                  { icon: "layers-outline",      text: t("scan.tip1") },
                  { icon: "white-balance-sunny", text: t("scan.tip2") },
                  { icon: "focus-field",         text: t("scan.tip3") },
                ].map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <MaterialCommunityIcons name={tip.icon as any} size={20} color="#F2853A" style={{ marginTop: 1 }} />
                    <Text style={styles.tipText}>{tip.text}</Text>
                  </View>
                ))}
              </View>

              {/* Example */}
              <View style={styles.exampleBox}>
                <Text style={styles.exampleLabel}>{t("scan.exampleLabel")}</Text>
                <View style={styles.exampleCodes}>
                  {["NOR 13", "ARG 5", "FWC 3", "MEX 8", "ESP 11"].map((c) => (
                    <View key={c} style={styles.exampleChip}>
                      <Text style={styles.exampleChipText}>{c}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.exampleSub}>{t("scan.exampleSub")}</Text>
              </View>

              {/* Disclaimer */}
              <View style={styles.disclaimerRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color="rgba(245,244,238,0.3)" />
                <Text style={styles.disclaimerText}>{t("scan.disclaimer")}</Text>
              </View>

              <TouchableOpacity
                onPress={handleOpenCamera}
                style={styles.scanBtn}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                <Text style={styles.scanBtnText}>{t("scan.openCamera")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step: processing */}
          {step === "processing" && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#F2853A" />
              <Text style={styles.processingText}>{t("scan.processing")}</Text>
            </View>
          )}

          {/* Step: confirm */}
          {step === "confirm" && (
            <View style={styles.confirmContainer}>

              {/* ── Mode toggle ── */}
              <View style={styles.modeToggleRow}>
                <TouchableOpacity
                  onPress={() => handleSetMode("add")}
                  style={[styles.modeBtn, mode === "add" && styles.modeBtnActive]}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name="plus-circle-outline"
                    size={16}
                    color={mode === "add" ? "#F2853A" : "rgba(245,244,238,0.4)"}
                  />
                  <Text style={[styles.modeBtnText, mode === "add" && styles.modeBtnTextActive]}>
                    {t("scan.modeAdd")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSetMode("remove")}
                  style={[styles.modeBtn, mode === "remove" && styles.modeBtnActive]}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name="send-outline"
                    size={16}
                    color={mode === "remove" ? "#F2853A" : "rgba(245,244,238,0.4)"}
                  />
                  <Text style={[styles.modeBtnText, mode === "remove" && styles.modeBtnTextActive]}>
                    {t("scan.modeRemove")}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.confirmSubtitle}>
                {t("scan.detectedCount", {
                  count: mode === "remove"
                    ? detected.filter((d) => d.isOwned && d.duplicateCount > 0).reduce((sum, d) => sum + d.qty, 0)
                    : detected.reduce((sum, d) => sum + d.qty, 0),
                })}
              </Text>

              <FlatList
                data={detected}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const sticker = ALL_STICKERS_MAP.get(item.id);
                  const flag    = sticker ? ALBUM_SECTIONS_MAP.get(sticker.sectionId)?.emoji : undefined;
                  const disabled = mode === "remove" && (!item.isOwned || item.duplicateCount === 0);
                  const qtyColor = mode === "add"
                    ? (!item.isOwned ? "#22C55E" : "#F2853A")
                    : "#EF4444";
                  return (
                    <View
                      style={[
                        styles.stickerRow,
                        (!item.selected || disabled) && styles.stickerRowUnselected,
                      ]}
                    >
                      {/* Checkbox */}
                      <TouchableOpacity
                        onPress={() => !disabled && toggleSelected(item.id)}
                        activeOpacity={disabled ? 1 : 0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <View style={[
                          styles.checkbox,
                          item.selected && !disabled && styles.checkboxChecked,
                        ]}>
                          {item.selected && !disabled && (
                            <MaterialCommunityIcons name="check" size={14} color="#fff" />
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* ID + badge */}
                      <View style={styles.stickerInfo}>
                        <Text style={styles.stickerCode}>
                          {flag ? `${flag}  ` : ""}{item.id}
                        </Text>
                      </View>
                      {renderBadge(item)}

                      {/* Qty stepper */}
                      {!disabled && (
                        <View style={styles.stepper}>
                          <TouchableOpacity
                            onPress={() => adjustQty(item.id, -1)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.stepperBtn}
                          >
                            <Text style={styles.stepperBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={[styles.stepperQty, { color: qtyColor }]}>
                            {item.qty}
                          </Text>
                          <TouchableOpacity
                            onPress={() => adjustQty(item.id, +1)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.stepperBtn}
                          >
                            <Text style={styles.stepperBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }}
              />

              {/* Review warning + scan again + add manual */}
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep("idle"); setDetected([]); }}
                  style={styles.secondaryBtn}
                >
                  <MaterialCommunityIcons name="camera-retake-outline" size={18} color="#F2853A" />
                  <Text style={styles.secondaryBtnText}>{t("scan.scanAgain")}</Text>
                </TouchableOpacity>

                <View style={styles.secondaryDivider} />

                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPickerVisible(true); }}
                  style={styles.secondaryBtn}
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#F2853A" />
                  <Text style={styles.secondaryBtnText}>{t("scan.addManual")}</Text>
                </TouchableOpacity>
              </View>

              {/* Single action button */}
              <View style={[styles.actionArea, { paddingBottom: bottomPad }]}>
                <TouchableOpacity
                  onPress={handleUpdate}
                  style={styles.btnPrimary}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnPrimaryText}>{t("scan.update")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        {/* Sticker picker — overlay inside this Modal (avoids nested-modal freeze) */}
        <StickerPickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onAdd={handlePickerAdd}
          onAdjustQty={adjustQty}
          addedQty={detectedQtyMap}
        />
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0E" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(245,244,238,0.08)",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#F5F4EE" },
  closeBtn: { padding: 6 },
  closeBtnText: { color: "#F2853A", fontWeight: "600", fontSize: 15 },

  // Idle
  idleContainer: {
    flex: 1, paddingHorizontal: 20, paddingVertical: 24,
    justifyContent: "center", gap: 16,
  },
  tipsCard: {
    backgroundColor: "#15161B", borderRadius: 16, padding: 16, gap: 14,
    borderWidth: 1, borderColor: "rgba(245,244,238,0.07)",
  },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tipText: { flex: 1, color: "rgba(245,244,238,0.7)", fontSize: 14, lineHeight: 20 },
  exampleBox: {
    backgroundColor: "#15161B", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(245,244,238,0.07)", gap: 10,
  },
  exampleLabel: {
    color: "rgba(245,244,238,0.4)", fontSize: 11, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase",
  },
  exampleCodes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  exampleChip: {
    backgroundColor: "rgba(242,133,58,0.12)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(242,133,58,0.25)",
  },
  exampleChipText: { color: "#F2853A", fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  exampleSub: { color: "rgba(245,244,238,0.35)", fontSize: 12, lineHeight: 18 },
  disclaimerRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 4,
  },
  disclaimerText: {
    flex: 1, color: "rgba(245,244,238,0.3)", fontSize: 12, lineHeight: 17,
  },
  scanBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#F2853A", borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 32,
  },
  scanBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Processing
  processingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  processingText: { color: "rgba(245,244,238,0.6)", fontSize: 15 },

  // Confirm
  confirmContainer: { flex: 1 },

  // Mode toggle
  modeToggleRow: {
    flexDirection: "row", marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: "#15161B", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(245,244,238,0.08)", padding: 3, gap: 3,
  },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 9, borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: "#1C1D24" },
  modeBtnText: { color: "rgba(245,244,238,0.4)", fontSize: 14, fontWeight: "600" },
  modeBtnTextActive: { color: "#F2853A" },

  confirmSubtitle: {
    color: "rgba(245,244,238,0.5)", fontSize: 13, fontWeight: "500",
    textAlign: "center", paddingVertical: 10,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 8 },
  stickerRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#15161B",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "rgba(245,244,238,0.08)", gap: 12,
  },
  stickerRowUnselected: { opacity: 0.35 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: "rgba(245,244,238,0.25)", alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#F2853A", borderColor: "#F2853A" },
  stickerInfo: { flex: 1 },
  stickerCode: { color: "#F5F4EE", fontSize: 14, fontWeight: "700" },

  // Badges
  badgeNew:         { backgroundColor: "#16A34A", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeDuplicate:   { backgroundColor: "#2B6FE3", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeRemoveDup:   { backgroundColor: "#F2853A", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeUnmark:      { backgroundColor: "#EF4444", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeDisabled:    { backgroundColor: "rgba(245,244,238,0.08)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeNoStock:     {
    backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
  },
  badgeText:        { color: "#fff", fontSize: 10, fontWeight: "700" },
  badgeNoStockText: { color: "#EF4444", fontSize: 10, fontWeight: "700" },

  // Qty stepper
  stepper:        { flexDirection: "row", alignItems: "center", gap: 6 },
  stepperBtn:     {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: "rgba(245,244,238,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  stepperBtnText: { color: "rgba(245,244,238,0.6)", fontSize: 16, fontWeight: "700", lineHeight: 20 },
  stepperQty:     { fontSize: 14, fontWeight: "800", minWidth: 28, textAlign: "center" },

  // Secondary actions row (scan again + add manual)
  secondaryRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: "rgba(245,244,238,0.06)",
  },
  secondaryBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 7, paddingVertical: 6,
  },
  secondaryBtnText: { color: "#F5F4EE", fontSize: 14, fontWeight: "600" },
  secondaryDivider: {
    width: 1, height: 20, backgroundColor: "rgba(245,244,238,0.1)",
  },

  // Action area
  actionArea: {
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "rgba(245,244,238,0.08)",
  },
  btnPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#F2853A", borderRadius: 16,
    paddingVertical: 16, gap: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
