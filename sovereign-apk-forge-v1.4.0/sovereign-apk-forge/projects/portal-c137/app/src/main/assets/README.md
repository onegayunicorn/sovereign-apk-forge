# Portal C-137 — PWA Package

Rick C-137 Twin Portal Interface, packaged as an installable Progressive Web App with offline support.

## Files

```
/
├── index.html            # App shell (HUD + WebGL vortex + WebAudio)
├── manifest.webmanifest  # PWA manifest (name, icons, theme)
├── sw.js                 # Service worker (cache-first, offline)
├── icon-192.png          # 192x192 app icon (maskable)
└── icon-512.png          # 512x512 app icon (maskable)
```

## Run locally

Serve the folder over HTTP (service workers require http(s), not `file://`):

```bash
cd portal-c137-pwa
python3 -m http.server 28392
# open http://127.0.0.1:28392/
```

## Verify

1. `http://127.0.0.1:28392/manifest.webmanifest` and `/sw.js` both return HTTP 200.
2. Chrome DevTools (F12) → **Application** tab:
   - **Manifest**: name, start_url, icons recognized with no errors.
   - **Service Workers**: `sw.js` shows active and running.
3. Install: use the browser omnibox install button, or the in-app **INSTALL** banner (triggers on `beforeinstallprompt`).

## Notes

- The service worker registration in `index.html` allows `localhost` and `127.0.0.1` in addition to HTTPS, so it activates during local testing.
- Cache version is `portal-c137-v1` in `sw.js` — bump it (and the filename constant) after any change to force clients to refresh.
