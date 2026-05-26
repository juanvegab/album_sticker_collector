import { useState, useCallback, useRef } from "react";
import Toast from "react-native-toast-message";
import {
  View, Text, Modal, TouchableOpacity, ActivityIndicator,
  Alert, FlatList, StyleSheet, Platform, Image,
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
  qty: number; // how many to add or remove in this batch (≥ 1)
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ── OCR Parser — returns Map<id, qty> counting each occurrence ────────────────

/**
 * Known OCR misreads for section codes.
 * Covers digit-for-letter substitutions (bold condensed font on stickers)
 * and letter-for-letter confusions. Every entry has been verified against
 * the full album code list — no correction maps to a real team code.
 */
const SECTION_CODE_CORRECTIONS: Record<string, string> = {
  // Q misread as O (tail of Q hard to detect)
  OAT: "QAT",
  IRO: "IRQ",

  // S misread as 5
  "5EN": "SEN",
  "5CO": "SCO",
  "5UI": "SUI",
  "5WE": "SWE",
  U5A: "USA",
  R5A: "RSA",
  K5A: "KSA",
  E5P: "ESP",

  // I misread as 1
  "1RN": "IRN",
  "1RQ": "IRQ",
  B1H: "BIH",
  C1V: "CIV",

  // B misread as 8
  "8EL": "BEL",
  "8RA": "BRA",
  "8IH": "BIH",

  // Letter O misread as digit 0
  N0R: "NOR",
  J0R: "JOR",
  P0R: "POR",
  C0D: "COD",
  C0L: "COL",
  CR0: "CRO",
  SC0: "SCO",

  // Y misread as V or 4
  EGV: "EGY",
  EG4: "EGY",
};

function parseStickersFromOCR(rawText: string): Map<string, number> {
  const counts = new Map<string, number>();

  // Primary pass: [A-Z0-9] in the code position catches digit-for-letter
  // misreads (e.g. "5EN" for SEN); SECTION_CODE_CORRECTIONS normalises them.
  // False positives from purely numeric matches are dropped by ALL_STICKERS_MAP.
  const regex = /\b([A-Z0-9]{2,3})\s?(\d{1,2})\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const raw = match[1];
    const section = SECTION_CODE_CORRECTIONS[raw] ?? raw;
    const id = `${section}${parseInt(match[2], 10)}`;
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
  const [cameraOpening, setCameraOpening] = useState(false);
  const [rescanMessage, setRescanMessage] = useState("");
  const { ownedSet, duplicates, bulkOwn, setDuplicates } = useCollection();

  // ── Toast helper ──────────────────────────────────────────────────────────
  function showToast(message: string, visibilityTime = 3000) {
    Toast.show({
      type: "success",
      text1: message,
      visibilityTime,
      topOffset: insets.top + 12,
    });
  }

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

    setDetected([]);
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

      const items: DetectedSticker[] = [...counts.entries()].map(
        ([id, qty]) => ({
          id,
          selected: true,
          isOwned: ownedSet.has(id),
          duplicateCount: duplicates[id] ?? 0,
          qty,
        }),
      );

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

  // ── Rescan — clears state and opens camera directly ───────────────────────
  function handleRescan() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetected([]);
    handleOpenCamera();
  }

  // ── Toggle selection ──────────────────────────────────────────────────────
  function toggleSelected(id: string) {
    setDetected((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)),
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
            return { ...d, selected: false };
          }
          return { ...d, qty: Math.min(d.qty, d.duplicateCount) };
        }),
      );
    } else {
      setDetected((prev) => prev.map((d) => ({ ...d, selected: true })));
    }
  }

  // ── Manual add from picker — toggle: adds if not in list, removes if present
  function handlePickerAdd(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetected((prev) => {
      if (prev.some((d) => d.id === id)) {
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

  // ── Apply changes and compute toast message ───────────────────────────────
  function applyAndNotify(rescan: boolean) {
    const selected = detected.filter((d) => d.selected);
    let toastMsg = "";

    if (mode === "add") {
      let newCount = 0;
      let dupCount = 0;
      selected.forEach((d) => {
        if (!d.isOwned) {
          bulkOwn([d.id]);
          newCount += 1;
          const extraDups = d.qty - 1;
          if (extraDups > 0) {
            setDuplicates(d.id, d.duplicateCount + extraDups);
            dupCount += extraDups;
          }
        } else {
          setDuplicates(d.id, d.duplicateCount + d.qty);
          dupCount += d.qty;
        }
      });
      if (newCount > 0 && dupCount > 0) {
        const newPart = newCount === 1 ? t("scan.toastNewOne") : t("scan.toastNewMany", { count: newCount });
        const dupPart = dupCount === 1 ? t("scan.toastDupOne") : t("scan.toastDupMany", { count: dupCount });
        toastMsg = t("scan.toastAdded", { newPart, dupPart });
      } else if (newCount > 0) {
        toastMsg = newCount === 1 ? t("scan.toastAddedNew") : t("scan.toastAddedNewMany", { count: newCount });
      } else {
        toastMsg = dupCount === 1 ? t("scan.toastAddedDup") : t("scan.toastAddedDupMany", { count: dupCount });
      }
    } else {
      let deliveredCount = 0;
      selected.forEach((d) => {
        const remaining = d.duplicateCount - d.qty;
        deliveredCount += d.qty;
        if (remaining >= 0) {
          setDuplicates(d.id, remaining);
        } else {
          setDuplicates(d.id, 0);
          bulkOwn([d.id]); // toggles off
        }
      });
      toastMsg = deliveredCount === 1 ? t("scan.toastDelivered") : t("scan.toastDeliveredMany", { count: deliveredCount });
    }

    if (rescan) {
      setRescanMessage(toastMsg);
      setCameraOpening(true);
      setTimeout(() => {
        setCameraOpening(false);
        setRescanMessage("");
        setDetected([]);
        handleOpenCamera();
      }, 3000);
    } else {
      handleClose();
      // Root-level <Toast /> is always mounted — show after modal closes
      setTimeout(() => showToast(toastMsg), 100);
    }
  }

  // ── Mini badge (state indicator) ──────────────────────────────────────────
  function renderBadge(item: DetectedSticker) {
    if (mode === "add") {
      if (!item.isOwned) {
        return (
          <View style={styles.badgeNew}>
            <Text style={styles.badgeText}>{t("scan.new")}</Text>
          </View>
        );
      }
      // Already owned
      if (item.qty === 1) {
        return (
          <View style={styles.badgeDuplicate}>
            <Text style={styles.badgeText}>{t("scan.duplicate")}</Text>
          </View>
        );
      }
      return (
        <View style={styles.badgeDuplicate}>
          <Text style={styles.badgeText}>×{item.qty}</Text>
        </View>
      );
    } else {
      if (!item.isOwned) {
        return (
          <View style={styles.badgeDisabled}>
            <Text style={styles.badgeText}>—</Text>
          </View>
        );
      }
      if (item.duplicateCount === 0) {
        return (
          <View style={styles.badgeNoStock}>
            <Text style={styles.badgeNoStockText}>{t("scan.noStock")}</Text>
          </View>
        );
      }
      return (
        <View style={styles.badgeRemoveDup}>
          <Text style={styles.badgeText}>−{item.qty}</Text>
        </View>
      );
    }
  }

  // ── Map id → qty for picker (shows count on each number button) ──────────
  const detectedQtyMap = new Map(detected.map((d) => [d.id, d.qty]));

  // ── Bottom safe padding (more generous on Android) ────────────────────────
  const bottomPad =
    Platform.OS === "android"
      ? Math.max(insets.bottom, 16) + 16
      : Math.max(insets.bottom, 8) + 8;

  // ── Detected count label (with singular/plural) ──────────────────────────
  const detectedTotal =
    mode === "remove"
      ? detected
          .filter((d) => d.isOwned && d.duplicateCount > 0)
          .reduce((sum, d) => sum + d.qty, 0)
      : detected.reduce((sum, d) => sum + d.qty, 0);

  const detectedCountLabel =
    detectedTotal === 1
      ? t("scan.detectedCountOne")
      : t("scan.detectedCount", { count: detectedTotal });

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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("scan.title")}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>

        {/* Step: idle — tips + disclaimer + image filling remaining space + fixed scan button */}
        {step === "idle" && (
          <View style={styles.idleWrapper}>
            {/* Image — top-anchored, crops only at the bottom */}
            <View style={styles.exampleImageWrapper}>
              <Image
                source={require("@/assets/images/PostalesApiladas.png")}
                style={styles.exampleImage}
                resizeMode="cover"
              />
            </View>

            {/* Tips card */}
            <View style={styles.idleContainer}>
              <View style={styles.tipsCard}>
                {[
                  { icon: "layers-outline", text: t("scan.tip1") },
                  { icon: "white-balance-sunny", text: t("scan.tip2") },
                  { icon: "focus-field", text: t("scan.tip3") },
                ].map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <MaterialCommunityIcons
                      name={tip.icon as any}
                      size={20}
                      color="#F2853A"
                      style={{ marginTop: 1 }}
                    />
                    <Text style={styles.tipText}>{tip.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Disclaimer — pinned above scan button */}
            <View style={styles.disclaimerRowBottom}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={14}
                color="rgba(245,244,238,0.3)"
              />
              <Text style={styles.disclaimerText}>{t("scan.disclaimer")}</Text>
            </View>

            {/* Fixed scan button at bottom */}
            <View style={[styles.idleScanArea, { paddingBottom: bottomPad }]}>
              <TouchableOpacity
                onPress={handleOpenCamera}
                style={styles.scanBtn}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                <Text style={styles.scanBtnText}>{t("scan.openCamera")}</Text>
              </TouchableOpacity>
            </View>
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
                <Text
                  style={[
                    styles.modeBtnText,
                    mode === "add" && styles.modeBtnTextActive,
                  ]}
                >
                  {t("scan.modeAdd")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSetMode("remove")}
                style={[
                  styles.modeBtn,
                  mode === "remove" && styles.modeBtnActive,
                ]}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name="send-outline"
                  size={16}
                  color={
                    mode === "remove" ? "#F2853A" : "rgba(245,244,238,0.4)"
                  }
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    mode === "remove" && styles.modeBtnTextActive,
                  ]}
                >
                  {t("scan.modeRemove")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Detected count — prominent ── */}
            <Text style={styles.confirmCount}>{detectedCountLabel}</Text>

            <FlatList
              data={detected}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const sticker = ALL_STICKERS_MAP.get(item.id);
                const flag = sticker
                  ? ALBUM_SECTIONS_MAP.get(sticker.sectionId)?.emoji
                  : undefined;
                const disabled =
                  mode === "remove" &&
                  (!item.isOwned || item.duplicateCount === 0);
                return (
                  <View
                    style={[
                      styles.stickerRow,
                      (!item.selected || disabled) &&
                        styles.stickerRowUnselected,
                    ]}
                  >
                    {/* Checkbox */}
                    <TouchableOpacity
                      onPress={() => !disabled && toggleSelected(item.id)}
                      activeOpacity={disabled ? 1 : 0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          item.selected && !disabled && styles.checkboxChecked,
                        ]}
                      >
                        {item.selected && !disabled && (
                          <MaterialCommunityIcons
                            name="check"
                            size={14}
                            color="#fff"
                          />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* ID */}
                    <View style={styles.stickerInfo}>
                      <Text style={styles.stickerCode}>
                        {flag ? `${flag}  ` : ""}
                        {item.id}
                      </Text>
                    </View>

                    {/* Badge — no stepper */}
                    {renderBadge(item)}
                  </View>
                );
              }}
            />

            {/* Secondary actions: Reescanear + Agregar postales */}
            <View style={styles.secondaryRow}>
              <TouchableOpacity
                onPress={handleRescan}
                style={styles.secondaryBtn}
              >
                <MaterialCommunityIcons
                  name="camera-retake-outline"
                  size={18}
                  color="#F2853A"
                />
                <Text style={styles.secondaryBtnText}>
                  {t("scan.scanAgain")}
                </Text>
              </TouchableOpacity>

              <View style={styles.secondaryDivider} />

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPickerVisible(true);
                }}
                style={styles.secondaryBtn}
              >
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={18}
                  color="#F2853A"
                />
                <Text style={styles.secondaryBtnText}>
                  {t("scan.addManual")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action buttons */}
            <View style={[styles.actionArea, { paddingBottom: bottomPad }]}>
              <TouchableOpacity
                onPress={() => applyAndNotify(false)}
                style={styles.btnPrimary}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>{t("scan.update")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => applyAndNotify(true)}
                style={styles.btnSecondaryAction}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="camera-retake-outline"
                  size={16}
                  color="#F2853A"
                />
                <Text style={styles.btnSecondaryActionText}>
                  {t("scan.updateAndRescan")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sticker picker — overlay inside this Modal (avoids nested-modal freeze) */}
        <StickerPickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onAdd={handlePickerAdd}
          onAdjustQty={() => {}}
          addedQty={detectedQtyMap}
        />

        {/* Blocking overlay while camera is about to open */}
        {cameraOpening && (
          <View style={styles.cameraOpeningOverlay} pointerEvents="box-only">
            {!!rescanMessage && (
              <>
                <MaterialCommunityIcons name="check-circle-outline" size={22} color="#fff" />
                <Text style={styles.overlayMessage}>{rescanMessage}</Text>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0E" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,244,238,0.08)",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#F5F4EE" },
  closeBtn: { padding: 6 },
  closeBtnText: { color: "#F2853A", fontWeight: "600", fontSize: 15 },

  // Idle
  idleWrapper: { flex: 1 },
  idleContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  idleScanArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,244,238,0.08)",
  },
  tipsCard: {
    backgroundColor: "#15161B",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(245,244,238,0.07)",
  },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tipText: {
    flex: 1,
    color: "rgba(245,244,238,0.7)",
    fontSize: 14,
    lineHeight: 20,
  },

  exampleImageWrapper: {
    flex: 1,
    overflow: "hidden",
  },
  exampleImage: {
    width: "100%",
    height: "100%",
  },

  disclaimerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  disclaimerRowBottom: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 12,
  },
  disclaimerText: {
    flex: 1,
    color: "rgba(245,244,238,0.3)",
    fontSize: 12,
    lineHeight: 17,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#F2853A",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  scanBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Processing
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  processingText: { color: "rgba(245,244,238,0.6)", fontSize: 15 },

  // Confirm
  confirmContainer: { flex: 1 },

  // Mode toggle
  modeToggleRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#15161B",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,244,238,0.08)",
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: "#1C1D24" },
  modeBtnText: {
    color: "rgba(245,244,238,0.4)",
    fontSize: 14,
    fontWeight: "600",
  },
  modeBtnTextActive: { color: "#F2853A" },

  // Detected count — prominent
  confirmCount: {
    color: "#F5F4EE",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 8 },
  stickerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#15161B",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(245,244,238,0.08)",
    gap: 12,
  },
  stickerRowUnselected: { opacity: 0.35 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(245,244,238,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#F2853A", borderColor: "#F2853A" },
  stickerInfo: { flex: 1 },
  stickerCode: { color: "#F5F4EE", fontSize: 14, fontWeight: "700" },

  // Badges
  badgeNew: {
    backgroundColor: "#16A34A",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDuplicate: {
    backgroundColor: "#2B6FE3",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeRemoveDup: {
    backgroundColor: "#F2853A",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDisabled: {
    backgroundColor: "rgba(245,244,238,0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeNoStock: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  badgeNoStockText: { color: "#EF4444", fontSize: 11, fontWeight: "700" },

  // Secondary actions row (rescan + add manual)
  secondaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,244,238,0.06)",
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 6,
  },
  secondaryBtnText: { color: "#F5F4EE", fontSize: 14, fontWeight: "600" },
  secondaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(245,244,238,0.1)",
  },

  // Action area
  actionArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,244,238,0.08)",
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2853A",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnSecondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 13,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(242,133,58,0.35)",
  },
  btnSecondaryActionText: { color: "#F2853A", fontWeight: "700", fontSize: 15 },
  cameraOpeningOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.72)",
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  overlayMessage: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
