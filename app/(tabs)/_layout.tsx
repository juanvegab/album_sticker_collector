import { Tabs } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import { View, Text } from "react-native";
import { useFriends } from "@/hooks/useFriends";
import { useStickerRequests } from "@/hooks/useStickerRequests";

function Icon(props: { name: React.ComponentProps<typeof FontAwesome>["name"]; color: string }) {
  return <FontAwesome size={24} {...props} />;
}

function FriendsTabIcon({ color }: { color: string }) {
  const { pendingFrom } = useFriends();
  const { incoming } = useStickerRequests();
  const badgeCount = pendingFrom.length + incoming.length;

  return (
    <View>
      <Icon name="users" color={color} />
      {badgeCount > 0 && (
        <View
          style={{
            position: "absolute", top: -4, right: -8,
            backgroundColor: "#ef4444", borderRadius: 8,
            minWidth: 16, height: 16, paddingHorizontal: 3,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 9, fontWeight: "700" }}>
            {badgeCount > 9 ? "9+" : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { borderTopColor: "#f3f4f6" },
        headerStyle: { backgroundColor: "#fff" },
        headerTitleStyle: { fontWeight: "700", color: "#111827" },
      }}
    >
      <Tabs.Screen
        name="collection"
        options={{
          title: t("tabs.collection"),
          tabBarLabel: t("tabs.collection"),
          tabBarIcon: ({ color }) => <Icon name="star" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t("tabs.stats"),
          tabBarLabel: t("tabs.stats"),
          tabBarIcon: ({ color }) => <Icon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="album/index"
        options={{
          title: t("tabs.album"),
          tabBarLabel: t("tabs.album"),
          tabBarIcon: ({ color }) => <Icon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: t("tabs.friends"),
          tabBarLabel: t("tabs.friends"),
          tabBarIcon: ({ color }) => <FriendsTabIcon color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("tabs.account"),
          tabBarLabel: t("tabs.account"),
          tabBarIcon: ({ color }) => <Icon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
