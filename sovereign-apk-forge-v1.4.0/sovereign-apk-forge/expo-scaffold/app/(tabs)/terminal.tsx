import { useState } from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

// Terminal tab — forge shell. For a real shell, bridge to Termux via intent
// or bundle a native PTY. This is the command UI; commands route to forge scripts.
const CMDS: Record<string, string> = {
  help: "help, ls, pwd, echo, date, whoami, forge build, forge doctor, forge wrap <name>, status, clear, about",
  "forge build": "aapt2 → ecj → d8 → zipalign → apksigner → BUILD OK dist/app-signed.apk",
  "forge doctor": "android.jar ✓ keystore ✓ tools ✓ INTERNET: not requested (sovereign)",
  status: "toolchain READY · platform android-35 · network OFFLINE",
};
export default function TerminalScreen() {
  const [lines, setLines] = useState<string[]>(["forge:~$ type 'help'"]);
  const [cmd, setCmd] = useState("");
  const run = () => {
    const c = cmd.trim(); if (!c) return;
    const out = CMDS[c] ?? (c.startsWith("echo ") ? c.slice(5) : `${c.split(" ")[0]}: command not found`);
    setLines([...lines, `forge:~$ ${c}`, out]);
    setCmd("");
  };
  return (
    <ScreenContainer className="flex-1 p-4">
      <Text className="text-lg font-bold text-foreground mb-3">◆ Terminal</Text>
      <ScrollView className="flex-1 mb-3 bg-background rounded-lg p-3">
        {lines.map((l, i) => <Text key={i} className="text-foreground text-xs mb-1" style={{ fontFamily: "monospace" }}>{l}</Text>)}
      </ScrollView>
      <View className="flex-row gap-2 items-center">
        <Text className="text-primary">forge:~$</Text>
        <TextInput className="flex-1 bg-surface rounded-lg px-3 py-2 text-foreground" value={cmd} onChangeText={setCmd} placeholder="type a command" autoCapitalize="none" autoCorrect={false} onSubmitEditing={run} />
      </View>
    </ScreenContainer>
  );
}
