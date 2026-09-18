# NewTab

Chromium MV3 new-tab extension (v1.0.9). Local-first bookmark grid plus streaming chat against Grok, Gemini, Claude, OpenAI, and optional Ollama. Keys live in `chrome.storage.local`. Chat history and the grid live in Dexie / IndexedDB. Nothing of yours is sent to a backend we run.

## Load unpacked

Works in Brave / Chrome / Edge. Always load **`dist/`**, not the repo root.

```bash
npm install
npm run build
```

Then `brave://extensions` (or `chrome://extensions`) → Developer mode → Load unpacked → select `dist`.

After a pull:

```bash
git stash push -- package.json
git pull
npm install
npm run build
```

`package.json` on the working copy often blocks the pull. Stash that file only; the stash is throwaway.

Reload the card. If the toolbar icon or new-tab page looks stale, Remove + Load unpacked again.

### Machines

| Machine | Clone |
| --- | --- |
| Mac | `/Users/leanstudio/src/NewTab` |
| Windows | `C:\Scripts\new-tab` |

PowerShell does not accept `if exist`. Use `Remove-Item path -ErrorAction SilentlyContinue` if you need to delete a leftover file.

If chat or grid Save throws `DatabaseClosedError` / `DataError`, DevTools → Application → IndexedDB → delete `NewTabDatabase` → reload. API keys survive that; they are not in Dexie.

## What it does

- 8-slot grid with favicon fallbacks. Empty tile opens Settings on that row.
- Same-tab or new-tab for grid clicks (Settings → Grid).
- Keys **1–8** open those slots. Ignored while the chat box or a form field is focused.
- Search or URL in the same box; Ctrl/Cmd+Enter forces chat.
- Streaming chat with markdown, code copy, image attach, stop.
- Hide unused models under Settings → API keys. Ollama stays hidden until you save a local host.
- Rename threads from the sidebar (pencil or double-click).
- Provider 401/404/503 land as short lines, not JSON blobs.
- Toolbar icon toggles a per-tab invert dark mode (http/https pages only).

## Scripts

| Script | Why |
| --- | --- |
| `npm run build` | `tsc` + Vite. `prebuild` writes default toolbar PNGs from `public/generate-icons.js` |
| `npm run dev` | Vite only. The extension still needs a `dist` build to load in the browser |
| `npm test` | Stream token parser + friendly API error mapping |
| `npm run lint` / `npm run format` | Biome |

The service worker paints the live toolbar icon. The PNG prebuild is only the fallback tile shown before the worker runs.
