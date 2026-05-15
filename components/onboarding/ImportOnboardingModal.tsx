import { useEffect, useState } from "react";
import {
  View, Text, Modal, TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@clerk/clerk-expo";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCollection } from "@/hooks/useCollection";
import { ImportModal } from "@/components/import/ImportModal";

// ── Design tokens ─────────────────────────────────────────────────────
const BG      = "#0B0B0E";
const SURFACE = "#15161B";
const INK     = "#F5F4EE";
const DIM     = "rgba(245,244,238,0.38)";
const DIM3    = "rgba(245,244,238,0.08)";
const BRAND   = "#F4C430";

const STORAGE_KEY = (userId: string) => `import_onboarding_shown_${userId}`;

/**
 * Shows a one-time "import your collection" prompt right after the user
 * creates their account for the first time (detected via AsyncStorage flag).
 * Disappears permanently once dismissed or confirmed.
 */
export function ImportOnboardingModal() {
  const { user } = useUser();
  const { collectionLoaded } = useCollection();
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Check once per user session whether to show the prompt
  useEffect(() => {
    if (!user?.id || !collectionLoaded) return;
    let cancelled = false;

    async function check() {
      const key = STORAGE_KEY(user!.id);
      const seen = await AsyncStorage.getItem(key);
      if (!cancelled && !seen) {
        setVisible(true);
        await AsyncStorage.setItem(key, "1");
      }
    }

    check().catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, collectionLoaded]);

  function handleDismiss() {
    setVisible(false);
  }

  function handleImport() {
    setVisible(false);
    // Small delay so the first modal closes cleanly before ImportModal opens
    setTimeout(() => setImportOpen(true), 350);
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "flex-end",
        }}>
          <View style={{
            backgroundColor: SURFACE,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingTop: 20,
            paddingBottom: Math.max(insets.bottom + 20, 36),
          }}>
            {/* X button */}
            <TouchableOpacity
              onPress={handleDismiss}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ alignSelf: "flex-end", marginBottom: 12 }}
            >
              <FontAwesome name="times" size={18} color={DIM} />
            </TouchableOpacity>

            {/* Icon */}
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: "rgba(244,196,48,0.15)",
              alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              <FontAwesome name="magic" size={28} color={BRAND} />
            </View>

            {/* Title */}
            <Text style={{
              color: INK, fontSize: 22, fontWeight: "800",
              lineHeight: 28, marginBottom: 10,
            }}>
              ¿Ya tenés postales?
            </Text>

            {/* Body */}
            <Text style={{
              color: DIM, fontSize: 15, lineHeight: 22, marginBottom: 28,
            }}>
              Cargá tu colección actual en segundos con nuestra herramienta de importación inteligente. Pegá tu lista y la IA hace el resto.
            </Text>

            {/* CTA button */}
            <TouchableOpacity
              onPress={handleImport}
              activeOpacity={0.85}
              style={{
                borderRadius: 14, paddingVertical: 16,
                alignItems: "center", backgroundColor: BRAND,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: BG, fontSize: 16, fontWeight: "800" }}>
                Importar mi colección
              </Text>
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity
              onPress={handleDismiss}
              activeOpacity={0.7}
              style={{
                borderRadius: 14, paddingVertical: 14,
                alignItems: "center", backgroundColor: DIM3,
              }}
            >
              <Text style={{ color: DIM, fontSize: 15, fontWeight: "600" }}>
                Continuar sin importar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Import tool — opened after onboarding prompt */}
      <ImportModal visible={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
