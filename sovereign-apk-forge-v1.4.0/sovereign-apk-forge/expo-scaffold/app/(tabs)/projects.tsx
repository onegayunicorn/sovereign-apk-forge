import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

const PROJECTS = [
  { name: "Portal C-137", type: "PWA → APK", pkg: "com.sovereign.portal137" },
  { name: "AI Forge", type: "Native WebView", pkg: "com.sovereign.aiforge" },
  { name: "Sample Hello", type: "Native Java", pkg: "com.example.hello" },
];
export default function ProjectsScreen() {
  return (
    <ScreenContainer className="flex-1 p-4">
      <Text className="text-lg font-bold text-foreground mb-3">◆ Projects</Text>
      <FlatList data={PROJECTS} keyExtractor={(p) => p.pkg} renderItem={({ item }) => (
        <TouchableOpacity className="bg-surface rounded-xl p-4 mb-3 border border-border">
          <Text className="text-foreground font-semibold">{item.name}</Text>
          <Text className="text-muted text-sm mt-1">{item.type} · {item.pkg}</Text>
          <Text className="text-primary text-xs mt-2">$ cd projects/{item.name.toLowerCase().replace(/\s+/g, "-")} && ./build.sh</Text>
        </TouchableOpacity>
      )} />
    </ScreenContainer>
  );
}
