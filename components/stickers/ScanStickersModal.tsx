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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ALL_STICKERS_MAP, ALBUM_SECTIONS_MAP } from "@/lib/data/world-cup-2026";
import { useCollection } from "@/hooks/useCollection";

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = "idle" | "processing" | "confirm";

interface DetectedSticker {
  id: string;
  selected: boolean;
  isOwned: boolean;
  duplicateCount: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ── OCR Parser ─────────────────────────────────────────────────────────────────

function parseStickersFromOCR(rawText: string): string[] {
  const regex = /\b([A-Z]{2,3})\s?(\d{1,2})\b/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const id = `${match[1]}${parseInt(match[2], 10)}`;
    if (ALL_STICKERS_MAP.has(id)) found.add(id);
  }
  return [...found];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ScanStickersModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("idle");
  const [detected, setDetected] = useState<DetectedSticker[]>([]);
  const { ownedSet, duplicates, bulkOwn, setDuplicates } = useCollection();

  // ── Reset on close ────────────────────────────────────────────────────────
  function handleClose() {
    setStep("idle");
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

      const ids = parseStickersFromOCR(ocrResult.text);
      console.log("[Scan] matched sticker IDs:", ids);

      if (ids.length === 0) {
        Alert.alert(t("scan.noDetected"), t("scan.noDetectedHint"), [
          { text: t("common.ok"), onPress: () => setStep("idle") },
        ]);
        return;
      }

      const items: DetectedSticker[] = ids.map((id) => ({
        id,
        selected: true,
        isOwned: ownedSet.has(id),
        duplicateCount: duplicates[id] ?? 0,
      }));

      setDetected(items);
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

  // ── Action: Add to collection ─────────────────────────────────────────────
  function handleAdd() {
    const selected = detected.filter((d) => d.selected);
    const newIds = selected.filter((d) => !d.isOwned).map((d) => d.id);
    const alreadyOwned = selected.filter((d) => d.isOwned);
    if (newIds.length > 0) bulkOwn(newIds);
    alreadyOwned.forEach((d) => setDuplicates(d.id, d.duplicateCount + 1));
    handleClose();
  }

  // ── Action: Mark as delivered ─────────────────────────────────────────────
  function handleMarkDelivered() {
    detected
      .filter((d) => d.selected && d.duplicateCount > 0)
      .forEach((d) => setDuplicates(d.id, d.duplicateCount - 1));
    handleClose();
  }

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
            <Text style={styles.confirmSubtitle}>
              {t("scan.detectedCount", { count: detected.length })}
            </Text>

            <FlatList
              data={detected}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const sticker = ALL_STICKERS_MAP.get(item.id);
                const flag = sticker ? ALBUM_SECTIONS_MAP.get(sticker.sectionId)?.emoji : undefined;
                return (
                  <TouchableOpacity
                    onPress={() => toggleSelected(item.id)}
                    style={[styles.stickerRow, !item.selected && styles.stickerRowUnselected]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, item.selected && styles.checkboxChecked]}>
                      {item.selected && (
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      )}
                    </View>
                    <View style={styles.stickerInfo}>
                      <Text style={styles.stickerCode}>
                        {flag ? `${flag}  ` : ""}{item.id}
                      </Text>
                    </View>
                    {item.isOwned ? (
                      <View style={styles.badgeDuplicate}>
                        <Text style={styles.badgeText}>
                          {item.duplicateCount > 0 ? `×${item.duplicateCount + 1}` : t("scan.owned")}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.badgeNew}>
                        <Text style={styles.badgeText}>{t("scan.new")}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {/* Review warning */}
            <View style={styles.reviewWarning}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={14} color="rgba(245,244,238,0.35)" />
              <Text style={styles.reviewWarningText}>{t("scan.reviewHint")}</Text>
            </View>

            {/* Scan again button */}
            <TouchableOpacity onPress={() => { setStep("idle"); setDetected([]); }} style={styles.scanAgainBtn}>
              <MaterialCommunityIcons name="camera-retake-outline" size={16} color="rgba(245,244,238,0.5)" />
              <Text style={styles.scanAgainText}>{t("scan.scanAgain")}</Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleMarkDelivered} style={styles.btnSecondary} activeOpacity={0.8}>
                <MaterialCommunityIcons name="send-outline" size={16} color="#F2853A" />
                <Text style={styles.btnSecondaryText}>{t("scan.markDelivered")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdd} style={styles.btnPrimary} activeOpacity={0.8}>
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>{t("scan.addToCollection")}</Text>
              </TouchableOpacity>
            </View>
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
  reviewWarning: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingTop: 4,
  },
  reviewWarningText: {
    flex: 1, color: "rgba(245,244,238,0.35)", fontSize: 12, lineHeight: 17,
  },

  // Processing
  processingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  processingText: { color: "rgba(245,244,238,0.6)", fontSize: 15 },

  // Confirm
  confirmContainer: { flex: 1 },
  confirmSubtitle: {
    color: "rgba(245,244,238,0.5)", fontSize: 13, fontWeight: "500",
    textAlign: "center", paddingVertical: 12,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 8 },
  stickerRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#15161B",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "rgba(245,244,238,0.08)", gap: 12,
  },
  stickerRowUnselected: { opacity: 0.4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: "rgba(245,244,238,0.25)", alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#F2853A", borderColor: "#F2853A" },
  stickerInfo: { flex: 1 },
  stickerCode: { color: "#F5F4EE", fontSize: 14, fontWeight: "700" },
  badgeNew: { backgroundColor: "#16A34A", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeDuplicate: { backgroundColor: "#2B6FE3", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  scanAgainBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8,
  },
  scanAgainText: { color: "rgba(245,244,238,0.5)", fontSize: 13 },

  // Actions
  actionRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: "rgba(245,244,238,0.08)",
  },
  btnPrimary: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#F2853A", borderRadius: 14, paddingVertical: 14, gap: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnSecondary: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(242,133,58,0.12)", borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: "rgba(242,133,58,0.3)", gap: 8,
  },
  btnSecondaryText: { color: "#F2853A", fontWeight: "700", fontSize: 14 },
});
