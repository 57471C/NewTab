# NewTab Assistant

A minimalist, high-performance, privacy-first Chromium browser extension designed to replace your default New Tab page. Built with a "local-first" architecture, this application functions completely client-side—eliminating external server, database networking, and connection pooler dependencies.

## Key Features

- **Bookmark Grid:** A clean 4x2 grid display container for pinning high-priority shortcut links.
- **Unified Search Bar:** Regionalized web engine query box (respects parameters like `.com.au`) with an option to hot-swap target platforms (Google, Bing, DuckDuckGo, etc.).
- **Immersive AI Chat:** A central Perplexity/Grok-inspired minimalist text field that smoothly expands fluidly to a full-screen chat interface on active input.
- **Multi-Model Support:** Directly interface with Grok, Gemini, Claude, and local LLM runtime ports through direct client-to-API architecture.
- **Absolute Privacy:** Sensitive variables such as personal AI keys and preferences reside strictly within the client browser sandbox using `chrome.storage.local`.

## Tech Stack

- **Framework:** [Vite](https://vite.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (Static SPA bundle export)
- **Styling:** [Tailwind CSS v4.0](https://tailwindcss.com/) (Native utility layout)
- **Local Database:** [Dexie.js](https://dexie.org/) (Relational wrapper wrapping browser IndexedDB storage)
- **LLM Streaming:** [Vercel AI SDK](https://sdk.vercel.ai/docs) (Client-directed streaming execution layers)
- **Iconography:** [Lucide React](https://lucide.dev/)
- **Toolchain / Code Quality:** [Biome v2.4.15](https://biomejs.dev/) (Unified, blazing fast linting and formatting)

---

## Workspace Enforcement & Architecture Rules

This workspace operates under strict structural constraints. Any contributing developer or AI agent **must** respect the core guidelines declared in the root `.cursorrules` blueprint:

1. **No External Backends:** Never suggest cloud-scale environments, backend instances, hosted microservices, or cloud-synced databases (such as Supabase or hosted Postgres instances).
2. **The Machine Is The User:** There is no authentication wall, token validation server, or Row-Level Security (RLS) system. The current browser profile session implies data ownership.
3. **Strict Linting Standards:** Biome handles code execution standards and style configurations natively. Legacy toolchains like ESLint, Prettier, or associated package rule extensions are prohibited.

---

## Project structure
```plaintext
├── .cursorrules          # Codebase governance & Agent prompt restrictions
├── biome.json            # Unified linter/formatter structural layout definitions
├── package.json          # Dependency mappings (Private package safety configuration)
├── vite.config.ts        # Bundle pipeline asset configuration definitions
├── src/
│   ├── lib/
│   │   └── db.ts         # Dexie DB Local-First schemas (IndexedDB)
│   ├── components/       # LinkGrid, SearchBox, and Chat UI layers
│   ├── App.tsx           # Layout viewport mounting base
│   └── main.tsx          # React application bootstrapping root
```
