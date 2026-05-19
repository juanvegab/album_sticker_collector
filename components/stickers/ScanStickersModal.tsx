import { useState, useRef, useCallback } from "react";
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
import { CameraView, useCameraPermissions } from "expo-camera";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ALL_STICKERS_MAP, ALBUM_SECTIONS_MAP } from "@/lib/data/world-cup-2026";
import { useCollection } from "@/hooks/useCollection";

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = "camera" | "processing" | "confirm";

interface DetectedSticker {
  id: string;
  selected: boolean;
  isOwned: boolean;      // already in collection
  duplicateCount: number; // current duplicate count
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ── OCR Parser ─────────────────────────────────────────────────────────────────

function parseStickersFromOCR(rawText: string): string[] {
  // Matches "NOR 13", "IRQ 1", "FWC 0" — with or without space between letters and number
  const regex = /\b([A-Z]{2,3})\s?(\d{1,2})\b/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const id = `${match[1]}${parseInt(match[2], 10)}`; // "NOR13" — no leading zero
    if (ALL_STICKERS_MAP.has(id)) {
      found.add(id);
    }
  }
  return [...found];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ScanStickersModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>("camera");
  const [detected, setDetected] = useState<DetectedSticker[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const { ownedSet, duplicates, bulkOwn, setDuplicates } = useCollection();

  // ── Reset on close ──────────────────────────────────────────────────────────
  function handleClose() {
    setStep("camera");
    setDetected([]);
    onClose();
  }

  // ── Capture & OCR ───────────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    setStep("processing");

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.85,
      });
      if (!photo) throw new Error("no photo");

      const result = await TextRecognition.recognize(photo.uri);
      const ids = parseStickersFromOCR(result.text);

      if (ids.length === 0) {
        Alert.alert(
          t("scan.noDetected"),
          t("scan.noDetectedHint"),
          [{ text: t("common.ok"), onPress: () => setStep("camera") }]
        );
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
      console.error("[ScanStickersModal] OCR error:", err);
      Alert.alert(t("common.error"), t("scan.ocrError"), [
        { text: t("common.ok"), onPress: () => setStep("camera") },
      ]);
    }
  }, [ownedSet, duplicates, t]);

  // ── Toggle selection ────────────────────────────────────────────────────────
  function toggleSelected(id: string) {
    setDetected((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  }

  // ── Action: Add to collection ───────────────────────────────────────────────
  function handleAdd() {
    const selected = detected.filter((d) => d.selected);
    const newIds = selected.filter((d) => !d.isOwned).map((d) => d.id);
    const alreadyOwned = selected.filter((d) => d.isOwned);

    if (newIds.length > 0) {
      bulkOwn(newIds);
    }
    alreadyOwned.forEach((d) => {
      setDuplicates(d.id, d.duplicateCount + 1);
    });

    handleClose();
  }

  // ── Action: Mark as delivered (reduce duplicates) ───────────────────────────
  function handleMarkDelivered() {
    const selected = detected.filter((d) => d.selected);
    selected.forEach((d) => {
      if (d.duplicateCount > 0) {
        setDuplicates(d.id, d.duplicateCount - 1);
      }
    });
    handleClose();
  }

  // ── Render ──────────────────────────────────────────────────────────────────
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

        {/* Step: Camera */}
        {step === "camera" && (
          <View style={styles.cameraWrapper}>
            {!permission?.granted ? (
              /* No permission — show prompt instead of camera */
              <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>{t("friends.cameraPermission")}</Text>
                <TouchableOpacity
                  onPress={requestPermission}
                  style={styles.permissionBtn}
                >
                  <Text style={styles.permissionBtnText}>{t("friends.allowCamera")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* CameraView with NO children — required by expo-camera */}
                <CameraView ref={cameraRef} style={styles.camera} />

                {/* Overlay hint — sibling, absolute positioned */}
                <View style={styles.cameraOverlay} pointerEvents="none">
                  <Text style={styles.cameraHint}>{t("scan.cameraHint")}</Text>
                </View>

                {/* Capture button — sibling, absolute positioned at bottom */}
                <View style={styles.captureRow}>
                  <TouchableOpacity
                    onPress={handleCapture}
                    style={styles.captureBtn}
                    activeOpacity={0.8}
                  >
                    <View style={styles.captureBtnInner} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#F2853A" />
            <Text style={styles.processingText}>{t("scan.processing")}</Text>
          </View>
        )}

        {/* Step: Confirm */}
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
                const sticker = ALL_STICKERS_MAP.get(item.id)!;
                const section = ALBUM_SECTIONS_MAP.get(sticker.sectionId);
                return (
                  <TouchableOpacity
                    onPress={() => toggleSelected(item.id)}
                    style={[styles.stickerRow, !item.selected && styles.stickerRowUnselected]}
                    activeOpacity={0.7}
                  >
                    {/* Checkbox */}
                    <View style={[styles.checkbox, item.selected && styles.checkboxChecked]}>
                      {item.selected && (
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      )}
                    </View>

                    {/* Sticker info */}
                    <View style={styles.stickerInfo}>
                      <Text style={styles.stickerCode}>
                        {section?.emoji} {sticker.sectionId} {sticker.number}
                      </Text>
                      <Text style={styles.stickerName} numberOfLines={1}>
                        {sticker.name}
                      </Text>
                    </View>

                    {/* Status badge */}
                    {item.isOwned ? (
                      <View style={styles.badgeDuplicate}>
                        <Text style={styles.badgeText}>
                          {item.duplicateCount > 0
                            ? `×${item.duplicateCount + 1}`
                            : t("scan.owned")}
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

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleMarkDelivered}
                style={styles.btnSecondary}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="send-outline" size={16} color="#F2853A" />
                <Text style={styles.btnSecondaryText}>{t("scan.markDelivered")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAdd}
                style={styles.btnPrimary}
                activeOpacity={0.8}
              >
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

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0E",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,244,238,0.08)",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#F5F4EE",
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: "#F2853A",
    fontWeight: "600",
    fontSize: 15,
  },

  // Camera
  cameraWrapper: {
    flex: 1,
    overflow: "hidden",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOverlay: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  cameraHint: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  captureRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 40,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
  },

  // Permission
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#0B0B0E",
  },
  permissionText: {
    color: "#F5F4EE",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
    opacity: 0.7,
  },
  permissionBtn: {
    backgroundColor: "#F2853A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  permissionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  // Processing
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  processingText: {
    color: "rgba(245,244,238,0.6)",
    fontSize: 15,
  },

  // Confirm
  confirmContainer: {
    flex: 1,
  },
  confirmSubtitle: {
    color: "rgba(245,244,238,0.5)",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
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
  stickerRowUnselected: {
    opacity: 0.4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(245,244,238,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#F2853A",
    borderColor: "#F2853A",
  },
  stickerInfo: {
    flex: 1,
  },
  stickerCode: {
    color: "#F5F4EE",
    fontSize: 14,
    fontWeight: "700",
  },
  stickerName: {
    color: "rgba(245,244,238,0.5)",
    fontSize: 12,
    marginTop: 2,
  },
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
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // Actions
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,244,238,0.08)",
  },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2853A",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,133,58,0.12)",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(242,133,58,0.3)",
    gap: 8,
  },
  btnSecondaryText: {
    color: "#F2853A",
    fontWeight: "700",
    fontSize: 14,
  },
});
