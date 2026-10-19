# Sovereign APK Forge — v1.3.0 (Neural Offline AI)

## What's new
- **projects/ai-forge/ now bundles a real offline neural AI**: MiniLM-L6-v2
  (Q4 ONNX, 22 MB) + onnxruntime-web WASM (10 MB) + BERT WordPiece tokenizer,
  all in `assets/ai/`. Questions are matched by meaning (semantic embedding +
  cosine similarity over the knowledge base), not just keywords.
- `file://` fetch polyfill (XHR-based) so WASM + model load reliably in the
  WebView with no network permission.
- Keyword engine retained as automatic fallback (before neural loads, or if
  WASM is unavailable). `neural` command shows engine status.
- Signing uses v2 scheme only (v3 CHUNKED_SHA256 is unreliable on large
  asset APKs) — verified with `apksigner verify`.

## Built artifacts (dist-built/)
| APK | Package | Size | SHA256 (first 16) |
|-----|---------|------|-------------------|
| AIForge-1.3.0-signed.apk | com.sovereign.aiforge | 19 MB | 1bc0b363fae03534 |
| PortalC137-1.0.0-signed.apk | com.sovereign.portal137 | 133 KB | f617b33b247f6545 |

Both: apksigner verify PASS, no INTERNET permission (fully offline).

## Note on the uploaded onnxlm-pixel-builds.zip
- `minilm-l6-v2-q4.onnx` (22 MB) — used as the neural embedding model above. ✅
- `pixel-builds-universal-v1.1-5` — a Python/React devops scaffold (agent /
  edge / messaging engines, k8s/helm/terraform). Not bundled; it's server-side
  scaffolding, not APK-relevant. The `libs/algorithms` (rate limiter, envelope
  crypto, resilience) could be ported to the app if wanted — say the word.
