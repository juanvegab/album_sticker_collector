import { useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { purchaseNoAds } from "@/lib/purchases";
import { usePremiumStore } from "@/store/premiumStore";

const BG      = "#0B0B0E";
const SURFACE = "#15161B";
const INK     = "#F5F4EE";
const DIM     = "rgba(245,244,238,0.45)";
const DIM3    = "rgba(245,244,238,0.08)";
const BRAND   = "#F4C430";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function TrialExpiredModal({ visible, onClose }: Props) {
  const { user } = useUser();
  const { setIsPremium, isPurchasing, setIsPurchasing } = usePremiumStore();
  const [purchased, setPurchased] = useState(false);

  async function handlePurchase() {
    setIsPurchasing(true);
    try {
      const success = await purchaseNoAds();
      if (success) {
        setIsPremium(true);
        setPurchased(true);
        if (user) {
          await setDoc(
            doc(db, "users", user.id, "profile", "premium"),
            { isPremium: true },
            { merge: true }
          );
        }
        onClose();
        Alert.alert("¡Compra exitosa!", "Ya tenés acceso ilimitado a Lista Externa y todas las funciones premium.");
      }
    } catch (err: any) {
      if (err?.code !== 1 && err?.message !== "no_package") {
        Alert.alert("Error", "No se pudo completar la compra. Intenta de nuevo.");
      }
    } finally {
      setIsPurchasing(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={{ color: DIM, fontSize: 18, fontWeight: "600" }}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.emoji}>🚫</Text>
          <Text style={styles.title}>Agotaste tus 3 usos gratuitos</Text>
          <Text style={styles.body}>
            Ya usaste tus 3 pruebas de Lista Externa. Comprá premium una sola vez para seguir usándola sin límite — además de eliminar los anuncios de la app.
          </Text>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Premium</Text>
            <Text style={styles.price}>$2.99 único</Text>
          </View>
          <Text style={styles.priceNote}>Sin suscripciones · Pago de por vida</Text>

          <TouchableOpacity
            onPress={handlePurchase}
            disabled={isPurchasing}
            style={styles.cta}
            activeOpacity={0.85}
          >
            {isPurchasing ? (
              <ActivityIndicator color={BG} size="small" />
            ) : (
              <Text style={styles.ctaText}>Comprar Premium — $2.99</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ marginTop: 12, alignItems: "center" }}>
            <Text style={{ color: DIM, fontSize: 13 }}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 48,
    marginTop: 8,
    marginBottom: 12,
  },
  title: {
    color: INK,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    color: DIM,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: DIM3,
    width: "100%",
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  priceLabel: {
    color: INK,
    fontSize: 16,
    fontWeight: "700",
  },
  price: {
    color: BRAND,
    fontSize: 16,
    fontWeight: "800",
  },
  priceNote: {
    color: DIM,
    fontSize: 12,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  cta: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    width: "100%",
  },
  ctaText: {
    color: BG,
    fontSize: 15,
    fontWeight: "800",
  },
});
