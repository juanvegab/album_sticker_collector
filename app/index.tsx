import { View, ActivityIndicator } from "react-native";

// Navigation is handled by the auth guard in _layout.tsx (AppRoot).
// This screen shows briefly while Clerk loads.
export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
