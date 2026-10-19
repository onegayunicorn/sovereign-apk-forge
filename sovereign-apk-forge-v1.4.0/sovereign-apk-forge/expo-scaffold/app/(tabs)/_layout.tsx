import { Tabs } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

// AI Forge Mobile — 5 tabs. Drop into app/(tabs)/ of the lumen-ai-chat-mobile template.
export default function TabLayout() {
  const colors = useColors();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#00FF88", tabBarStyle: { backgroundColor: "#06160D", borderTopColor: "#0A2A18" } }}>
      <Tabs.Screen name="forge" options={{ title: "Forge", tabBarIcon: ({ color }) => <IconSymbol size={24} name="sparkles" color={color} /> }} />
      <Tabs.Screen name="projects" options={{ title: "Projects", tabBarIcon: ({ color }) => <IconSymbol size={24} name="folder" color={color} /> }} />
      <Tabs.Screen name="terminal" options={{ title: "Terminal", tabBarIcon: ({ color }) => <IconSymbol size={24} name="terminal" color={color} /> }} />
      <Tabs.Screen name="mesh" options={{ title: "Mesh", tabBarIcon: ({ color }) => <IconSymbol size={24} name="network" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <IconSymbol size={24} name="gear" color={color} /> }} />
    </Tabs>
  );
}
