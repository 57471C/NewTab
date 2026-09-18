# NewTab

Chromium MV3 new-tab extension. Local-first bookmark grid plus streaming chat against Grok, Gemini, Claude, and OpenAI. Keys live in `chrome.storage.local`. Chat history lives in Dexie / IndexedDB. Nothing of yours is sent to a backend we run.

## Load unpacked

Works in Brave / Chrome / Edge. Always load **`dist/`**, not the repo root.

```bash
npm install
npm run build
```

Then `brave://extensions` (or `chrome://extensions`) → Developer mode → Load unpacked → select `dist`.

After a pull:

```bash
git pull
npm install
npm run build
```

Reload the card. If the toolbar icon or new-tab page looks stale, Remove + Load unpacked again.

### Machines

| Machine | Clone |
| --- | --- |
| Mac | `/Users/leanstudio/src/NewTab` |
| Windows | `C:\Scripts\new-tab` |

PowerShell (Windows) does not accept `if exist`. Use `Remove-Item path -ErrorAction SilentlyContinue` if you need to delete a leftover file.

If chat throws `DatabaseClosedError` after a schema bump, DevTools → Application → IndexedDB → delete `NewTabDatabase` → reload. API keys survive that; they are not in Dexie.

## What it does

- 8-slot grid with favicon fallbacks and same-tab / new-tab from Settings
- Search or URL in the same box; Ctrl/Cmd+Enter forces chat
- Streaming chat with markdown, code copy, image attach, stop
- Hide unused models under Settings → API keys
- Toolbar icon toggles a per-tab invert dark mode (http/https pages only)

## Scripts

| Script | Why |
| --- | --- |
| `npm run build` | `tsc` + Vite. `prebuild` writes default toolbar PNGs from `public/generate-icons.js` |
| `npm run dev` | Vite only. The extension still needs a `dist` build to load in the browser |
| `npm test` | Token parser tests |
| `npm run lint` / `npm run format` | Biome |

The service worker paints the live toolbar icon. The PNG prebuild is only the fallback tile shown before the worker runs.
