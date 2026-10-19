# Expo 5-Tab Scaffold — AI Forge Mobile

Drop-in replacement for `app/(tabs)/` in the `lumen-ai-chat-mobile` Expo template.

## Install
1. Copy `app/(tabs)/_layout.tsx` + `forge.tsx` + `projects.tsx` + `terminal.tsx` + `mesh.tsx` + `settings.tsx` into your Expo project's `app/(tabs)/`.
2. Remove the old `index.tsx` / `chat.tsx` (or keep chat and add it as a 6th tab).
3. Add icon mappings in `components/ui/icon-symbol.tsx` for: sparkles, folder, terminal, network, gear.
4. `pnpm install && npx expo prebuild && npx expo run:android` (or EAS build).

## Tabs
- **Forge** — offline AI chat (MiniLM via WebView/onnxruntime-web; keyword fallback)
- **Projects** — bundled project list + build commands
- **Terminal** — forge shell UI (bridge to Termux/native PTY for real shell)
- **Mesh** — Pi 5 orchestrator client (node status, remote build routing)
- **Settings** — engine info, keystore, permissions

## Note
The real, installable APK built in this session is the WebView-hybrid `AIForgeMobile`
(same 5-tab UX, includes the MiniLM neural engine, verified signed). This Expo
scaffold is the React Native route for EAS/Play Store builds.
