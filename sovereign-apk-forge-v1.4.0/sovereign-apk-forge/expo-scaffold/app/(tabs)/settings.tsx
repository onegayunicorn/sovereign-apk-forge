import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

const ROWS: [string, string][] = [
  ["App", "AI Forge Mobile v1.0"],
  ["AI Engine", "MiniLM-L6-v2 (Q4 ONNX) + onnxruntime-web · semantic retrieval"],
  ["Fallback", "Keyword intent engine (instant)"],
  ["Keystore", "Local debug · never leaves device"],
  ["Network", "No INTERNET permission · fully offline"],
  ["Build tools", "aapt2 · ecj · d8 · zipalign · apksigner · android-35"],
  ["License", "MIT · evidence: DEMONSTRATED"],
];
export default function SettingsScreen() {
  return (
    <ScreenContainer className="flex-1 p-4">
      <Text className="text-lg font-bold text-foreground mb-3">◆ Settings</Text>
      <ScrollView>
        {ROWS.map(([k, v]) => (
          <View key={k} className="bg-surface rounded-xl p-4 mb-3 border border-border">
            <Text className="text-primary font-semibold">{k}</Text>
            <Text className="text-foreground text-sm mt-1">{v}</Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
