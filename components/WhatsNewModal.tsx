import { useEffect, useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

// Bump this key whenever there's a new "What's new" to show
const WHATS_NEW_KEY = "whatsNew_v3";

const BG      = "#0B0B0E";
const SURFACE = "#15161B";
const INK     = "#F5F4EE";
const DIM     = "rgba(245,244,238,0.45)";
const DIM3    = "rgba(245,244,238,0.08)";
const BRAND   = "#F4C430";

const ITEMS = [
  {
    icon: "🔄",
    title: "Intercambio externo",
    badge: "PREMIUM",
    body: "Pegá la lista de repetidas de un amigo por WhatsApp y al instante sabés cuáles te sirven. Función Premium — los usuarios gratuitos tienen 3 pruebas gratis para probarlo.",
  },
  {
    icon: "🔒",
    title: "Sin pedidos duplicados",
    badge: null,
    body: "Las postales que ya pediste aparecen marcadas como \"EN PEDIDO\" para que no las solicites dos veces por error.",
  },
  {
    icon: "👥",
    title: "Amigos mejorado",
    badge: null,
    body: "Solicitudes ordenadas por fecha y pestañas separadas para amigos y solicitudes.",
  },
];

export function WhatsNewModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WHATS_NEW_KEY).then((seen) => {
      if (!seen) setVisible(true);
    });
  }, []);

  async function dismiss() {
    await AsyncStorage.setItem(WHATS_NEW_KEY, "seen");
    setVisible(false);
  }

  async function handleTryNow() {
    await AsyncStorage.setItem(WHATS_NEW_KEY, "seen");
    setVisible(false);
    router.push("/(tabs)/friends/external-list");
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
          {/* Close button */}
          <TouchableOpacity onPress={dismiss} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={{ color: DIM, fontSize: 18, fontWeight: "600" }}>✕</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>¿Qué hay nuevo? 🎉</Text>
          <Text style={styles.subtitle}>Versión más reciente</Text>

          {/* Items */}
          <View style={styles.divider} />
          {ITEMS.map((item, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.badge && (
                    <View style={{
                      backgroundColor: "rgba(244,196,48,0.15)",
                      borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2,
                      borderWidth: 1, borderColor: "rgba(244,196,48,0.4)",
                    }}>
                      <Text style={{ color: BRAND, fontSize: 8, fontWeight: "800", letterSpacing: 0.5 }}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.itemBody}>{item.body}</Text>
              </View>
            </View>
          ))}
          <View style={styles.divider} />

          {/* CTA */}
          <TouchableOpacity onPress={handleTryNow} style={styles.cta} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Probar Intercambio Externo 🔄</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={dismiss} activeOpacity={0.7} style={{ marginTop: 10, alignItems: "center" }}>
            <Text style={{ color: DIM, fontSize: 13 }}>Cerrar</Text>
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
  title: {
    color: INK,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
    marginTop: 4,
  },
  subtitle: {
    color: DIM,
    fontSize: 13,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: DIM3,
    marginVertical: 16,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 14,
  },
  itemIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  itemTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: "700",
  },
  itemBody: {
    color: DIM,
    fontSize: 13,
    lineHeight: 19,
  },
  cta: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  ctaText: {
    color: BG,
    fontSize: 15,
    fontWeight: "800",
  },
});
