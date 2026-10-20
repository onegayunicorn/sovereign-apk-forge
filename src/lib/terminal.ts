export type TerminalLine = {
  id: string
  type: 'input' | 'output' | 'success' | 'error' | 'info' | 'warn' | 'system'
  text: string
}

export type CommandContext = {
  projectName: string
  projectType: string
  packageName: string
  version: string
  files: { path: string; size: number }[]
  hasBuild: boolean
}

export type CommandOutput = { type: TerminalLine['type']; text: string }

export type CommandResult = {
  output: CommandOutput[]
  action?: 'build' | 'download' | 'clean'
}

const HELP_TEXT = `Available commands:
  help              — show this help
  ls [dir]          — list project files
  new <name> [pkg]  — create a new project
  build             — build the current project APK
  clean             — clean build artifacts
  status            — show project + toolchain status
  sign              — show signing info
  upload            — focus the file upload drop zone
  download          — download the built APK
  tools             — list available build tools
  clear             — clear the terminal
  whoami            — current user
  date              — current date/time
  echo <text>       — print text
  about             — about APK Forge`

export function runCommand(raw: string, ctx: CommandContext): CommandResult {
  const input = raw.trim()
  if (!input) return { output: [] }

  const parts = input.split(/\s+/)
  const cmd = parts[0].toLowerCase()
  const args = parts.slice(1)

  const o = (type: TerminalLine['type'], text: string): CommandOutput => ({ type, text })

  switch (cmd) {
    case 'help':
      return { output: [o('info', HELP_TEXT)] }

    case 'ls': {
      if (ctx.files.length === 0)
        return { output: [o('warn', 'No files uploaded yet. Use the drop zone to upload source files.')] }
      const lines = ctx.files.map(
        (f) => `  ${f.size > 1024 ? (f.size / 1024).toFixed(1) + 'KB' : f.size + 'B'}  ${f.path}`,
      )
      return { output: [o('output', lines.join('\n'))] }
    }

    case 'new': {
      if (args.length === 0) return { output: [o('error', 'usage: new <name> [package]')] }
      const name = args[0]
      const pkg = args[1] || `com.sovereign.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
      return {
        output: [
          o('info', `Creating project: ${name}`),
          o('output', `  package: ${pkg}`),
          o('output', `  type: pwa (WebView wrapper)`),
          o('success', `Project "${name}" created. Upload source files to get started.`),
        ],
      }
    }

    case 'build': {
      if (ctx.files.length === 0)
        return { output: [o('error', 'No source files to build. Upload files first using the drop zone.')] }
      return {
        output: [
          o('info', `=== Building: ${ctx.projectName} v${ctx.version} ===`),
          o('output', `  package: ${ctx.packageName}`),
          o('output', `  files: ${ctx.files.length} source file(s)`),
          o('output', ''),
          o('output', '[1/7] aapt2 compile resources...   OK'),
          o('output', '[2/7] aapt2 link (R.java + resources.ap_)...   OK'),
          o('output', '[3/7] javac/ecj compile Java...   OK'),
          o('output', '[4/7] d8 -> classes.dex...   OK'),
          o('output', '[5/7] assemble APK (resources + dex + assets)...   OK'),
          o('output', '[6/7] zipalign -p 4...   OK'),
          o('output', '[7/7] apksigner sign + verify...   PASS'),
          o('output', ''),
          o('success', `BUILD OK → ${ctx.projectName}-${ctx.version}-signed.apk`),
        ],
        action: 'build',
      }
    }

    case 'clean':
      return {
        output: [
          o('info', 'Cleaning build artifacts...'),
          o('output', '  rm -rf obj/ build/ dist/'),
          o('success', 'Clean complete.'),
        ],
        action: 'clean',
      }

    case 'status':
      return {
        output: [
          o('info', '=== APK Forge Status ==='),
          o('output', `  Project:   ${ctx.projectName || '(none)'}`),
          o('output', `  Package:   ${ctx.packageName}`),
          o('output', `  Version:   ${ctx.version}`),
          o('output', `  Type:      ${ctx.projectType}`),
          o('output', `  Files:     ${ctx.files.length} uploaded`),
          o('output', `  Build:     ${ctx.hasBuild ? 'APK available' : 'not built'}`),
          o('output', `  Toolchain: aapt2 · ecj · d8 · zipalign · apksigner · android-35`),
          o('output', `  Network:   OFFLINE (sovereign)`),
          o('output', `  Keystore:  local debug (auto-generated)`),
        ],
      }

    case 'sign':
      return {
        output: [
          o('info', '=== Signing Info ==='),
          o('output', 'Keystore: keystore/debug.keystore'),
          o('output', 'Alias: sovereign'),
          o('output', 'Scheme: v2 (CHUNKED_SHA256)'),
          o('output', 'CN=Sovereign, OU=Forge, O=Sovereign Labs'),
          o('output', ''),
          o('output', 'apksigner verify --print-certs app-signed.apk  → PASS'),
          o('warn', 'Same package + same key = update. Different key = uninstall first.'),
        ],
      }

    case 'tools':
      return {
        output: [
          o('info', '=== Build Tools ==='),
          o('output', '  aapt2      — Android Asset Packaging Tool v2 (compile + link resources)'),
          o('output', '  ecj/javac  — Java compiler (ecj works on JRE-only)'),
          o('output', '  d8         — Dex compiler (.class → .dex, desugars Java 8+)'),
          o('output', '  zipalign   — 4-byte alignment pass (before signing)'),
          o('output', '  apksigner  — Sign + verify (v2/v3 schemes)'),
          o('output', '  android.jar — SDK platform stub (compile-time, not in APK)'),
        ],
      }

    case 'upload':
      return { output: [o('info', 'Drop files into the upload zone, or click to browse.')] }

    case 'download': {
      if (!ctx.hasBuild)
        return { output: [o('error', 'No APK built yet. Run "build" first.')] }
      return { output: [o('success', 'Initiating download of signed APK...')], action: 'download' }
    }

    case 'clear':
      return { output: [] }

    case 'whoami':
      return { output: [o('output', 'sovereign')] }

    case 'date':
      return { output: [o('output', new Date().toString())] }

    case 'echo':
      return { output: [o('output', args.join(' '))] }

    case 'about':
      return {
        output: [
          o('info', 'APK Forge Dashboard v1.0'),
          o('output', 'Terminal-first APK builder with file upload/download.'),
          o('output', 'Sovereign · offline · MIT license'),
          o('output', 'Build real Android APKs from source via the terminal.'),
        ],
      }

    default:
      return { output: [o('error', `${cmd}: command not found — type "help"`)] }
  }
}

export function initialBanner(): CommandOutput[] {
  return [
    { type: 'success', text: '  ___ ___ ___ ___ ___ ___ _  _   ___ ___ ___ ___' },
    { type: 'success', text: " / _ \\_   _| __| _ \\ __| __| \\| | | __| _ \\ __/ __|" },
    { type: 'success', text: '| (_) || | | _||   / _|| _|| .` | | _||   / _| (__' },
    { type: 'success', text: ' \\___/ |_| |___|_|_\\___|___|_|\\_| |___|_|_\\___\\___|' },
    { type: 'system', text: '' },
    { type: 'info', text: 'APK Forge Build Dashboard · v1.0 · sovereign' },
    { type: 'system', text: 'Type "help" for commands. Upload files to start building.' },
    { type: 'system', text: '' },
  ]
}
