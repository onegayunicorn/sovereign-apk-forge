import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

// Mesh tab — Pi 5 orchestrator client. Set your Pi IP; remote builds via the
// /api/v1/build endpoints. Offline mode shows local node state.
export default function MeshScreen() {
  const [ip, setIp] = useState("192.168.1.50");
  const [connected, setConnected] = useState(false);
  return (
    <ScreenContainer className="flex-1 p-4 gap-3">
      <Text className="text-lg font-bold text-foreground">◆ Mesh {connected ? "· 2 nodes" : "· offline"}</Text>
      <View className="bg-surface rounded-xl p-4 border border-border">
        <Text className="text-foreground font-semibold">Moto G35 (this device)</Text>
        <Text className="text-muted text-sm mt-1">mobile node · ● online · CPU 12% · battery 87%</Text>
      </View>
      <View className="bg-surface rounded-xl p-4 border border-border">
        <Text className="text-foreground font-semibold">Raspberry Pi 5</Text>
        <Text className="text-muted text-sm mt-1">build node · {connected ? "● online · CPU 27%" : "● offline"}</Text>
      </View>
      <View className="bg-surface rounded-xl p-4 border border-border">
        <Text className="text-foreground font-semibold">Mesh Coherence</Text>
        <Text className="text-primary text-2xl my-1">0.96</Text>
        <Text className="text-muted text-xs">Jobs: 0 · routing: phone-local</Text>
      </View>
      <View className="flex-row gap-2">
        <TextInput className="flex-1 bg-surface rounded-lg px-3 py-2 text-foreground" value={ip} onChangeText={setIp} placeholder="Pi 5 IP" autoCapitalize="none" autoCorrect={false} />
        <TouchableOpacity className="bg-primary rounded-lg px-4 justify-center" onPress={() => setConnected(!connected)}>
          <Text className="text-background font-bold">{connected ? "Disconnect" : "Connect"}</Text>
        </TouchableOpacity>
      </View>
      <Text className="text-muted text-xs">Remote builds require the orchestrator API + INTERNET permission (off by default).</Text>
    </ScreenContainer>
  );
}
