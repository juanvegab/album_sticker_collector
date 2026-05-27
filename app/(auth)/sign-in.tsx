import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WORLD_CUP_2026 } from "@/lib/data/world-cup-2026";

WebBrowser.maybeCompleteAuthSession();

// ── Grid constants ───────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const COLS = 5;
const ROWS = 4;
const H_PAD = 14;
const CARD_GAP = 8;
const CARD_W = (SCREEN_W - H_PAD * 2 - CARD_GAP * (COLS - 1)) / COLS;
const CARD_H = CARD_W * 1.25; // bottom of row 4 lands mid-way between headline lines

// Colored positions matching the mockup (row-col → color)
const CARD_COLORS: Record<string, string> = {
  "0-2": "#E2453C",
  "0-4": "#2B6FE3",
  "1-2": "#1FA7A0",
  "2-1": "#5847C4",
  "2-4": "#E2453C",
  "3-3": "#F2853A",
};

const ICON_TOP = Platform.OS === "ios" ? 58 : 38;
const GRID_TOP = ICON_TOP + 90 + 12; // icon height + gap

export default function SignInScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: "oauth_apple" });
  const router = useRouter();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => { WebBrowser.coolDownAsync(); };
  }, []);

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startGoogleFlow({
        redirectUrl: Linking.createURL("oauth-native-callback", { scheme: "controldepostales" }),
      });
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
    } catch (err: any) {
      Alert.alert(t("common.error"), err.errors?.[0]?.message ?? t("auth.errorGoogle"));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleApple() {
    setAppleLoading(true);
    try {
      const { createdSessionId, setActive } = await startAppleFlow({
        redirectUrl: Linking.createURL("oauth-native-callback", { scheme: "controldepostales" }),
      });
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
    } catch (err: any) {
      Alert.alert(t("common.error"), err.errors?.[0]?.message ?? t("auth.errorApple"));
    } finally {
      setAppleLoading(false);
    }
  }

  const anyLoading = googleLoading || appleLoading;
  const totalStickers = WORLD_CUP_2026.totalStickers;
  const totalSections = WORLD_CUP_2026.sections.length;

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0E" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      {/* ── App icon ── */}
      <Image
        source={require("../../assets/icon.png")}
        style={{
          position: "absolute",
          top: ICON_TOP,
          left: 20,
          width: 80,
          height: 80,
          borderRadius: 18,
        }}
      />

      {/* ── Sticker grid hero ── */}
      <View style={{ position: "absolute", top: GRID_TOP, left: H_PAD, right: H_PAD }}>
        {Array.from({ length: ROWS }).map((_, row) => (
          <View key={row} style={{ flexDirection: "row", marginBottom: CARD_GAP }}>
            {Array.from({ length: COLS }).map((_, col) => {
              const color = CARD_COLORS[`${row}-${col}`];
              return (
                <View
                  key={col}
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    marginRight: col < COLS - 1 ? CARD_GAP : 0,
                    borderRadius: 12,
                    backgroundColor: color ?? "#1C1D24",
                    ...(color
                      ? {}
                      : {
                          borderWidth: 1,
                          borderStyle: Platform.OS === "ios" ? "dashed" : "solid",
                          borderColor: "rgba(245,244,238,0.18)",
                        }),
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* ── Bottom content (transparent so grid shows through) ── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 22,
          paddingBottom: Math.max(insets.bottom + 16, Platform.OS === "ios" ? 50 : 28),
        }}
      >
        {/* Headline */}
        <Text
          style={{
            color: "#F5F4EE",
            fontSize: 36,
            fontWeight: "800",
            lineHeight: 42,
            marginBottom: 10,
          }}
        >
          {"Tu álbum de\nstickers 2026,\n"}
          <Text style={{ color: "#F4C430" }}>{"siempre contigo."}</Text>
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            color: "rgba(245,244,238,0.55)",
            fontSize: 13,
            lineHeight: 18,
            marginBottom: 28,
          }}
        >
          {`${totalStickers} postales · ${totalSections} selecciones. Marca lo que tienes, intercambia repetidas, completa tu colección.`}
        </Text>

        {/* Apple */}
        <TouchableOpacity
          onPress={handleApple}
          disabled={anyLoading}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 999,
            height: 54,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
          activeOpacity={0.85}
        >
          {appleLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <FontAwesome name="apple" size={21} color="#000000" />
              <Text
                style={{
                  color: "#000000",
                  fontWeight: "700",
                  fontSize: 17,
                  marginLeft: 10,
                }}
              >
                {t("auth.continueApple")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Google */}
        <TouchableOpacity
          onPress={handleGoogle}
          disabled={anyLoading}
          style={{
            backgroundColor: "#15161B",
            borderRadius: 999,
            height: 54,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "rgba(245,244,238,0.18)",
          }}
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator color="#F5F4EE" />
          ) : (
            <>
              <FontAwesome name="google" size={18} color="#F5F4EE" />
              <Text
                style={{
                  color: "#F5F4EE",
                  fontWeight: "700",
                  fontSize: 17,
                  marginLeft: 10,
                }}
              >
                {t("auth.continueGoogle")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Email y contraseña */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/sign-up")}
          disabled={anyLoading}
          style={{
            borderRadius: 999,
            height: 54,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(245,244,238,0.28)",
          }}
          activeOpacity={0.85}
        >
          <Text
            style={{
              color: "rgba(245,244,238,0.62)",
              fontWeight: "600",
              fontSize: 17,
            }}
          >
            {t("auth.emailPassword")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
