import { useState } from "react";
import { Tabs, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { View, Text, TouchableOpacity, Platform, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFriends } from "@/hooks/useFriends";
import { useStickerRequests } from "@/hooks/useStickerRequests";
import { useCollection } from "@/hooks/useCollection";
import { usePremium } from "@/hooks/usePremium";
import { ScanStickersModal } from "@/components/stickers/ScanStickersModal";
import { FEATURES } from "@/constants/featureFlags";

// ── Icons ─────────────────────────────────────────────────────────────
function TabIcon({
  name, focused, color,
}: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  focused: boolean;
  color: string;
}) {
  return <FontAwesome size={22} name={name} color={color} />;
}

function FriendsTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { pendingFrom } = useFriends();
  const { incoming } = useStickerRequests();
  const badgeCount = pendingFrom.length + incoming.length;

  return (
    <View>
      <FontAwesome size={22} name="users" color={color} />
      {badgeCount > 0 && (
        <View style={{
          position: "absolute", top: -4, right: -8,
          backgroundColor: "#ef4444", borderRadius: 8,
          minWidth: 16, height: 16, paddingHorizontal: 3,
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ color: "white", fontSize: 9, fontWeight: "700" }}>
            {badgeCount > 9 ? "9+" : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── FAB ───────────────────────────────────────────────────────────────
function SobreFAB() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isPremium, isTrialActive } = usePremium();
  const [showScan, setShowScan] = useState(false);
  const TAB_BAR_H = Platform.OS === "ios" ? 49 : 56;
  const bottom = TAB_BAR_H + insets.bottom + 12;

  const scanAvailable = FEATURES.SCAN_ENABLED && (isPremium || isTrialActive);
  // Trial expired and not premium — show lock nudge
  const scanLocked = FEATURES.SCAN_ENABLED && !isPremium && !isTrialActive;

  const label = scanAvailable ? t("scan.fab") : t("sobre.fab");
  const icon = scanAvailable ? "camera-outline" : "email-open-outline";
  const onPress = scanAvailable ? () => setShowScan(true) : () => router.push("/sobre");

  return (
    <>
      <View style={{
        position: "absolute", bottom, right: 16,
        flexDirection: "column", alignItems: "flex-end", gap: 8,
        pointerEvents: "box-none",
      }}>
        {/* Scanner lock nudge — only when trial expired */}
        {scanLocked && (
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/account")}
            activeOpacity={0.85}
            style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: "rgba(12,12,14,0.92)",
              borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
              borderWidth: 1, borderColor: "rgba(244,196,48,0.35)",
            }}
          >
            <MaterialCommunityIcons name="lock-outline" size={13} color="#F4C430" />
            <Text style={{ color: "#F4C430", fontWeight: "700", fontSize: 13 }}>
              Recuperar escáner →
            </Text>
          </TouchableOpacity>
        )}

        {/* FAB row */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Label chip */}
          <View style={{
            backgroundColor: "rgba(12,12,14,0.88)",
            borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
            marginRight: 10,
            borderWidth: 1, borderColor: "rgba(245,244,238,0.12)",
          }}>
            <Text style={{ color: "#F5F4EE", fontWeight: "600", fontSize: 14 }}>
              {label}
            </Text>
          </View>

          {/* Button */}
          <TouchableOpacity
            onPress={onPress}
            style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: "#F2853A",
              alignItems: "center", justifyContent: "center",
              shadowColor: "#F2853A", shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
            }}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name={icon} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {scanAvailable && (
        <ScanStickersModal visible={showScan} onClose={() => setShowScan(false)} />
      )}
    </>
  );
}

// ── Layout ────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { collectionLoaded } = useCollection();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#F4C430",
          tabBarInactiveTintColor: "rgba(245,244,238,0.38)",
          tabBarStyle: {
            backgroundColor: "#15161B",
            borderTopColor: "rgba(245,244,238,0.08)",
            borderTopWidth: 1,
            paddingBottom: insets.bottom,
            height: (Platform.OS === "ios" ? 49 : 56) + insets.bottom,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
        }}
      >
        {/* ── Resumen (home) ── */}
        <Tabs.Screen
          name="resumen"
          options={{
            title: t("tabs.resumen"),
            tabBarLabel: t("tabs.resumen"),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "star" : "star-o"} focused={focused} color={color} />
            ),
          }}
        />

        {/* ── Álbum ── */}
        <Tabs.Screen
          name="album/index"
          options={{
            title: t("tabs.album"),
            tabBarLabel: t("tabs.album"),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="book" focused={focused} color={color} />
            ),
          }}
        />

        {/* ── Amigos ── */}
        <Tabs.Screen
          name="friends"
          options={{
            title: t("tabs.friends"),
            tabBarLabel: t("tabs.friends"),
            tabBarIcon: ({ color, focused }) => (
              <FriendsTabIcon color={color} focused={focused} />
            ),
          }}
        />

        {/* ── Cuenta ── */}
        <Tabs.Screen
          name="account"
          options={{
            title: t("tabs.account"),
            tabBarLabel: t("tabs.account"),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "user" : "user-o"} focused={focused} color={color} />
            ),
          }}
        />

        {/* ── Hidden screens (keep routes alive, not in tab bar) ── */}
        <Tabs.Screen name="collection" options={{ href: null }} />
        <Tabs.Screen name="stats" options={{ href: null }} />
      </Tabs>

      {/* Global FAB — Abrir sobre */}
      <SobreFAB />

      {/* ── Loading overlay — hides zero-state while Firestore syncs ── */}
      {!collectionLoaded && (
        <View style={StyleSheet.flatten([
          StyleSheet.absoluteFill,
          { backgroundColor: "#0B0B0E", alignItems: "center", justifyContent: "center", zIndex: 999 },
        ])}>
          <ActivityIndicator size="large" color="#F4C430" />
        </View>
      )}
    </View>
  );
}
