import { Tabs } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";

function Icon(props: { name: React.ComponentProps<typeof FontAwesome>["name"]; color: string }) {
  return <FontAwesome size={24} {...props} />;
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
        name="trades/index"
        options={{
          title: t("tabs.trades"),
          tabBarLabel: t("tabs.trades"),
          tabBarIcon: ({ color }) => <Icon name="retweet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="trades/create"
        options={{ href: null }}
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
