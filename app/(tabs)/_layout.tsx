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
        name="collection"
        options={{
          title: "Colección",
          tabBarLabel: "Colección",
          tabBarIcon: ({ color }) => <Icon name="star" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Estadísticas",
          tabBarLabel: "Estadísticas",
          tabBarIcon: ({ color }) => <Icon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="album/index"
        options={{
          title: "Álbum",
          tabBarLabel: "Álbum",
          tabBarIcon: ({ color }) => <Icon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="trades/index"
        options={{
          title: "Intercambios",
          tabBarLabel: "Intercambios",
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
          title: "Mi Cuenta",
          tabBarLabel: "Cuenta",
          tabBarIcon: ({ color }) => <Icon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
