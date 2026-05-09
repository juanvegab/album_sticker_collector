import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";

// Placeholder screen — full implementation in PR-7
export default function SobreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0E",
      paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 15 }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ color: "#F5F4EE", fontSize: 18, fontWeight: "700", flex: 1 }}>
          {t("sobre.title")}
        </Text>
      </View>

      {/* Coming soon */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <FontAwesome name="envelope-o" size={56} color="#F2853A" style={{ marginBottom: 20 }} />
        <Text style={{ color: "#F5F4EE", fontSize: 22, fontWeight: "800", marginBottom: 10, textAlign: "center" }}>
          {t("sobre.comingSoon")}
        </Text>
        <Text style={{ color: "rgba(245,244,238,0.55)", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
          {t("sobre.comingSoonDesc")}
        </Text>
      </View>
    </View>
  );
}
