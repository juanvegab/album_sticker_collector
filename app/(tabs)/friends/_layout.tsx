import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function FriendsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTitleStyle: { fontWeight: "700", color: "#111827" },
      }}
    >
      <Stack.Screen name="index" options={{ title: t("tabs.friends") }} />
      <Stack.Screen name="[friendId]" options={{ title: "" }} />
    </Stack>
  );
}
