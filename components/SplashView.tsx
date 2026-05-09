import { View, Text, Image, Dimensions, StatusBar } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

const COLS = 5;
const GAP = 8;
const H_PAD = 14;
const CARD_W = (W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;
const CARD_H = CARD_W * 1.25;
const ROWS = Math.ceil((H + GAP) / (CARD_H + GAP)) + 1;

// Cycle through section colors to tile the grid
const TILE_COLORS = [
  "#1FA7A0", "#E2453C", "#7FB832", "#2B6FE3", "#5847C4",
  "#F2853A", "#D9457A", "#5BB3D6", "#3B8C5B", "#E55D4C",
  "#9333EA", "#0EA5E9", "#F4C430", "#1FA7A0", "#E2453C",
  "#7FB832", "#2B6FE3", "#5847C4", "#F2853A", "#D9457A",
  "#5BB3D6", "#3B8C5B", "#E55D4C", "#9333EA", "#0EA5E9",
];

export function SplashView() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0E" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      {/* ── Tiled grid background ── */}
      <View style={{ position: "absolute", top: 0, left: H_PAD, right: H_PAD }}>
        {Array.from({ length: ROWS }).map((_, r) => (
          <View
            key={r}
            style={{ flexDirection: "row", gap: GAP, marginBottom: GAP }}
          >
            {Array.from({ length: COLS }).map((_, c) => (
              <View
                key={c}
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  borderRadius: 10,
                  backgroundColor: TILE_COLORS[(r * COLS + c) % TILE_COLORS.length],
                  opacity: 0.09,
                }}
              />
            ))}
          </View>
        ))}
      </View>

      {/* ── Center: icon + wordmark ── */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Image
          source={require("../assets/icon.png")}
          style={{ width: 112, height: 112, borderRadius: 24, marginBottom: 20 }}
        />
        <Text style={{ fontSize: 30, fontWeight: "800", color: "#F5F4EE", letterSpacing: -0.5 }}>
          {"el álbum"}
          <Text style={{ color: "#F4C430" }}>{"2026"}</Text>
        </Text>
      </View>

      {/* ── Bottom tagline ── */}
      <View style={{ paddingBottom: 52, alignItems: "center" }}>
        <Text style={{
          color: "rgba(245,244,238,0.35)",
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.8,
          textAlign: "center",
          textTransform: "uppercase",
          lineHeight: 18,
        }}>
          {"Que no te falte,\nni te sobre ninguna"}
        </Text>
      </View>
    </View>
  );
}
