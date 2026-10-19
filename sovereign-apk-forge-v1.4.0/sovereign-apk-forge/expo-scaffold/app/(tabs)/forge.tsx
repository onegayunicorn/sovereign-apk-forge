import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

// Forge tab — offline AI chat. MiniLM runs via onnxruntime-web in a WebView,
// or call your bundled native inference. Keyword fallback is instant.
const KB: Record<string, string> = {
  pipeline: "aapt2 compile → link → javac → d8 → zip → zipalign → apksigner",
  sign: "keytool -genkeypair … then apksigner sign --ks debug.keystore",
  errors: "INSTALL_FAILED_NO_MATCHING_ABIS → add lib/<arch>/.so; signature mismatch → uninstall old",
  termux: "pkg install aapt aapt2 apksigner dx d8 ecj zipalign",
  pwa: "./scripts/wrap-pwa.sh ./pwa-folder 'My App' com.yourapp",
};
export default function ForgeScreen() {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const ask = () => {
    if (!msg.trim()) return;
    const q = msg.toLowerCase();
    const a = Object.entries(KB).find(([k]) => q.includes(k))?.[1] ?? "Ask: pipeline / sign / errors / termux / pwa";
    setChat([...chat, { q: msg, a }]);
    setMsg("");
  };
  return (
    <ScreenContainer className="flex-1 p-4">
      <Text className="text-lg font-bold text-foreground mb-3">◆ AI Forge</Text>
      <ScrollView className="flex-1 mb-3">
        {chat.map((c, i) => (
          <View key={i} className="mb-3">
            <Text className="text-primary">{"> " + c.q}</Text>
            <Text className="text-foreground border-l-2 border-primary pl-2">{c.a}</Text>
          </View>
        ))}
      </ScrollView>
      <View className="flex-row gap-2">
        <TextInput className="flex-1 bg-surface rounded-lg px-3 py-2 text-foreground" value={msg} onChangeText={setMsg} placeholder="Ask about APK building…" onSubmitEditing={ask} />
        <TouchableOpacity className="bg-primary rounded-lg px-4 justify-center" onPress={ask}><Text className="text-background font-bold">▶</Text></TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
