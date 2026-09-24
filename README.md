# NewTab

Chromium MV3 new-tab extension. Local-first bookmark grid plus streaming chat via Grok, Gemini, Claude, OpenAI, and optional Ollama.
API keys live in `chrome.storage.local`. Chat history and the grid live in Dexie / IndexedDB in this browser. Nothing is stored on a remote server we run.

## Install

You do not need Node or Git. Works in Brave, Chrome, and Edge.

1. Open the [latest Release](https://github.com/57471C/NewTab/releases/latest) and download `NewTab-v*.zip`.
2. Unzip it. You should have a `NewTab` folder that contains `manifest.json`.
3. Go to `brave://extensions` (or `chrome://extensions` / `edge://extensions`).
4. Turn on **Developer mode** (top right).
5. **Load unpacked** → select that `NewTab` folder. Do not select the zip, and do not select a repo checkout.

Add your own API keys in Settings → API keys. Keys stay on this machine.

To update later, download the newer zip, unzip over the same folder (or load the new folder), then click **Reload** on the extension card. If the toolbar icon or new-tab page looks stale, Remove the extension and Load unpacked again.

Pin the toolbar icon (puzzle piece → pin NewTab Assistant) if you want the site dark-mode toggle in reach.

## What it does

- 8-slot grid with favicon fallbacks. Empty tile opens Settings on that row.
- Same-tab or new-tab for grid clicks (Settings → Grid).
- Keys **1–8** open those slots. Ignored while the chat box or a form field is focused.
- Search or URL in the same box; Ctrl/Cmd+Enter forces chat.
- Streaming chat with markdown, code copy, image attach, stop.
- Hide unused models under Settings → API keys. Tick Ollama there to show it; host defaults to localhost:11434.
- Rename threads from the sidebar (pencil or double-click).
- Provider 401/404/503 land as short lines, not JSON blobs.

## Force dark mode on other sites

The new-tab page has its own light/dark switch in the sidebar. Separate from that, the toolbar icon forces a dark invert on the site in the current tab. Handy when a page has no dark theme, or a poor one.

- Click the toolbar icon (or Alt+Shift+D; on Mac, Control+Shift+D) to toggle that tab only.
- Images, video, and similar media are inverted back so they do not look like film negatives.
- It only runs on `http` / `https` pages. Browser settings pages (`chrome://`, `brave://`, and the like) are skipped.
- Other tabs are left alone. Closing the tab clears the toggle.

This is independent of the new-tab theme. You can keep NewTab in light mode and still darken a blinding article.

## Develop

Load **`dist/`**, not the repo root.

```bash
git clone https://github.com/57471C/NewTab.git
cd NewTab
npm install
npm run build
```

Then Developer mode → Load unpacked → select `dist`.

After a pull:

```bash
git stash push -- package.json
git pull
npm install
npm run build
```

`package.json` on the working copy often blocks the pull. Stash that file only; the stash is throwaway.

Reload the card after each build. PowerShell does not accept `if exist`. Use `Remove-Item path -ErrorAction SilentlyContinue` if you need to delete a leftover file.

If chat or grid Save throws `DatabaseClosedError` / `DataError`, DevTools → Application → IndexedDB → delete `NewTabDatabase` → reload. API keys survive that; they are not in Dexie.

### Share a build

Friends do not need Node. Tag a version from `main`:

```bash
git checkout main
git pull
git tag v1.0.10
git push origin v1.0.10
```

GitHub Actions builds `dist`, zips it, and attaches `NewTab-v1.0.10.zip` to the Release.

### Scripts

| Script | Why |
| --- | --- |
| `npm run build` | `tsc` + Vite. `prebuild` writes default toolbar PNGs from `public/generate-icons.js` |
| `npm run dev` | Vite only. The extension still needs a `dist` build to load in the browser |
| `npm test` | Stream token parser + friendly API error mapping |
| `npm run lint` / `npm run format` | Biome |

The service worker paints the live toolbar icon. The PNG prebuild is only the fallback tile shown before the worker runs.
