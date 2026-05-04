import { Tabs } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

function Icon(props: { name: React.ComponentProps<typeof FontAwesome>["name"]; color: string }) {
  return <FontAwesome size={24} {...props} />;
}

export default function TabLayout() {
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
        name="album"
        options={{
          title: "Álbum",
          tabBarIcon: ({ color }) => <Icon name="book" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: "Mi Colección",
          tabBarIcon: ({ color }) => <Icon name="star" color={color} />,
        }}
      />
      <Tabs.Screen
        name="trades"
        options={{
          title: "Intercambios",
          tabBarIcon: ({ color }) => <Icon name="exchange" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Estadísticas",
          tabBarIcon: ({ color }) => <Icon name="bar-chart" color={color} />,
        }}
      />
    </Tabs>
  );
}
