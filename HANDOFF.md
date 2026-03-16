# OneShot — Handoff Prompt for New Claude Agent

> Copy-paste this entire document as context for the new agent session.

---

## Project Overview

**OneShot** is an AI-powered collaborative whiteboard that lets AI agents (Claude Code, Cursor, etc.) draw on a shared canvas in real-time while humans watch and interact. It is a fork of [Excalidraw](https://github.com/excalidraw/excalidraw) rebranded and extended with:

- A **CLI tool** (`npx oneshot-app`) that watches a local `workspace.json` file and syncs changes to the web canvas via Ably (WebSocket pub/sub) or Supabase (persistent database)
- A **web app** deployed on Vercel at `oneshot.app` that renders the canvas and receives live updates
- **AI agent skills** that teach Claude Code / Cursor how to write Excalidraw JSON to `workspace.json`

**GitHub repo**: `thesekron/oneshot`
**Owner**: sekron (masa1doff12@gmail.com)

---

## Repository Structure

```
oneshot/
├── app/                          # Vite + React web application (Excalidraw fork)
│   ├── index.html                # Entry HTML — has overflow:hidden on body/html (intentional for canvas)
│   ├── index.tsx                 # React Router: /, /r/:roomId, /docs
│   ├── App.tsx                   # Main Excalidraw canvas component
│   ├── vite.config.mts           # Vite config with PWA manifest (rebranded to OneShot)
│   ├── app_constants.ts          # App constants (FIREBASE_STORAGE_PREFIXES, etc.)
│   ├── app-jotai.ts              # Jotai store
│   ├── index.scss                # App styles
│   ├── pages/
│   │   ├── Landing.tsx           # Landing page at /
│   │   ├── Docs.tsx              # Documentation page at /docs (sticky sidebar + nav)
│   │   └── Canvas.tsx            # Canvas wrapper at /r/:roomId → renders ExcalidrawApp
│   ├── collab/                   # Real-time collaboration (Excalidraw's collab system)
│   │   ├── Collab.tsx            # Main collaboration class
│   │   └── Portal.tsx            # WebSocket portal
│   └── data/                     # Firebase/storage helpers
├── packages/
│   ├── cli/                      # The `npx oneshot-app` CLI tool
│   │   ├── package.json          # name: "oneshot", version: 0.1.0
│   │   └── src/
│   │       ├── index.ts          # CLI entry: install, start, sessions commands
│   │       ├── logo.ts           # ASCII logo
│   │       ├── updater.ts        # Version check
│   │       ├── skills/
│   │       │   ├── claude-code.ts  # Installs skill for Claude Code
│   │       │   └── cursor.ts      # Installs skill for Cursor
│   │       └── sync/
│   │           ├── ably.ts       # Ably WebSocket sync adapter
│   │           ├── supabase.ts   # Supabase Realtime sync adapter
│   │           └── types.ts      # SyncAdapter interface
│   ├── excalidraw/               # Core Excalidraw drawing engine (forked, @oneshot/excalidraw)
│   ├── common/                   # Shared utilities (@oneshot/common)
│   ├── math/                     # Math utilities (@oneshot/math)
│   ├── element/                  # Element manipulation (@oneshot/element)
│   └── utils/                    # Export utilities
├── AGENT.md                      # Instructions for AI agents on how to draw on the canvas
├── README.md                     # Project README
├── vercel.json                   # Vercel config: outputDirectory "build", rewrites
├── .env.example                  # Template for sync config (Ably/Supabase)
├── .env.development              # Dev env (still has many Excalidraw URLs)
├── .env.production               # Prod env (still has many Excalidraw URLs)
└── .github/workflows/
    ├── deploy-app.yml            # Deploys web app to Vercel on push to main
    ├── publish-cli.yml           # Publishes CLI to npm on GitHub Release
    ├── test.yml                  # Runs tests
    └── lint.yml                  # Runs linter
```

---

## What Has Been Built

### Completed
1. **Excalidraw fork rebranded to OneShot** — package names changed to `@oneshot/*`, UI text updated, PWA manifest rebranded
2. **CLI tool** (`packages/cli/`) — full implementation with `install`, `start`, `sessions` commands, Ably and Supabase sync adapters, skill installation for Claude Code and Cursor
3. **Landing page** (`app/pages/Landing.tsx`) — marketing page at `/`
4. **Docs page** (`app/pages/Docs.tsx`) — documentation with sticky sidebar, covers installation, CLI usage, configuration
5. **Canvas page** (`app/pages/Canvas.tsx`) — renders Excalidraw at `/r/:roomId`
6. **AGENT.md** — comprehensive guide for AI agents on how to write Excalidraw JSON
7. **CI/CD** — GitHub Actions for Vercel deployment and npm publishing
8. **Vercel deployment** — configured and building successfully
9. **Scroll fix** — Landing and Docs pages override the global `overflow:hidden` so users can scroll

### Build Fixes Applied (this session)
- Added missing `FIREBASE_STORAGE_PREFIXES` constant to `app_constants.ts`
- Fixed `vercel.json` `outputDirectory` from `"app/build"` to `"build"` (Vercel project root is `app/`)
- Fixed scrolling on Landing/Docs pages (global `overflow:hidden` override)
- Rebranded PWA manifest from Excalidraw to OneShot
- Made Docs nav and sidebar sticky

---

## What Still Needs Work

### High Priority — Remaining Excalidraw References
The `.env.development` and `.env.production` files still reference Excalidraw services:
- `VITE_APP_BACKEND_V2_GET_URL` / `POST_URL` → `json.excalidraw.com` (JSON storage backend)
- `VITE_APP_LIBRARY_URL` → `libraries.excalidraw.com`
- `VITE_APP_LIBRARY_BACKEND` → Excalidraw's Firebase Cloud Functions
- `VITE_APP_WS_SERVER_URL` → needs a real OneShot relay server
- `VITE_APP_PLUS_LP` / `VITE_APP_PLUS_APP` → `excalidraw.com` (no longer relevant)
- `VITE_APP_AI_BACKEND` → `oss-ai.excalidraw.com`
- `VITE_APP_FIREBASE_CONFIG` → Excalidraw's Firebase project

**Decision needed**: Which of these services should OneShot self-host vs. disable vs. replace?

### High Priority — Real-Time Sync Integration
The `useCloudSync` hook (`app/hooks/useCloudSync.ts`, 342 lines) already exists and handles:
1. Reading `#sync=ably&key=...` or `#sync=supabase&url=...&anonkey=...` from the URL hash
2. Connecting to Ably or Supabase
3. Anti-loop strategy (ignores own echoes via `source`/`updated_by` tags)
4. Element reconciliation with Excalidraw's state

**Status**: The hook is implemented but needs end-to-end testing with the CLI daemon to verify the full flow works: CLI writes `workspace.json` → sync adapter → web canvas renders update.

Additional key files in the sync chain:
- `app/components/OneShotSync.tsx` — React component that triggers the hook
- `app/hooks/useCloudSync.ts` — The universal sync hook
- `server/src/index.ts` — Optional Socket.io relay server (alternative to Ably/Supabase)

### Medium Priority — CLI Publishing
- The CLI is at version `0.1.0` and has never been published to npm
- The `publish-cli.yml` workflow needs `NPM_TOKEN` secret set in GitHub
- Need to test the full `npx oneshot-app` flow end-to-end

### Medium Priority — AI Generation
- There's a Gemini/OpenRouter AI generation feature in the codebase (from earlier commits) — its current state and integration needs review
- The AI generation panel was configured to open by default on load

### Medium Priority — Branding Cleanup
- Some code still references "Excalidraw" in collab files, data helpers, etc.
- The favicon files in `public/` need verification (SVG is custom, but PNGs may still be Excalidraw icons)
- The file handlers in the PWA manifest still reference `.excalidraw` file extension (intentional since the format IS excalidraw)

### Low Priority — Infrastructure
- Need a relay/WebSocket server for the `VITE_APP_WS_SERVER_URL` (the old Excalidraw room server won't work for OneShot-specific features)
- Firebase config in env files is still pointing to Excalidraw's project
- `.github/FUNDING.yml` has `github: [thesekron]` — may want to add more funding options

### Low Priority — Testing
- Tests exist but haven't been verified with the rebrand
- `yarn test:typecheck` may have issues due to package renames

---

## Architecture: How the Sync Flow Works

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   AI Agent       │     │  CLI Daemon       │     │  Web Canvas        │
│  (Claude Code)   │     │  (npx oneshot-app)    │     │  (oneshot.app)     │
│                  │     │                   │     │                    │
│  Writes to       │────▶│  chokidar watches │────▶│  Ably/Supabase     │
│  workspace.json  │     │  workspace.json   │     │  Realtime listener │
│                  │     │                   │     │                    │
│                  │     │  Pushes via       │     │  Renders Excalidraw│
│                  │     │  Ably/Supabase    │     │  canvas            │
└─────────────────┘     └──────────────────┘     └────────────────────┘
```

The URL hash encodes credentials: `/r/abc123#sync=ably&key=xxx`
- Hash is never sent to the server (browser-only)
- The web app reads hash params and connects directly to user's Ably/Supabase
- No data passes through OneShot servers

---

## Key Technical Decisions

1. **Monorepo with Yarn Workspaces** — root package.json defines workspaces: `app`, `packages/*`
2. **Build order matters**: common → math → element → excalidraw → app
3. **Vite 5** with React plugin, PWA plugin, EJS plugin
4. **The web app root is `app/` in Vercel** — build command: `cd .. && yarn build:packages && yarn --cwd app build:app`
5. **`overflow: hidden` on body/html** is global for the canvas — pages that need scrolling must override it via `useEffect`
6. **Jotai for state management** — `app-jotai.ts` exports the store

---

## Commands

```bash
# Development
yarn install                  # Install all deps
yarn start                    # Dev server (port 3001)
yarn build:packages           # Build all packages in order
yarn build                    # Build the web app

# Testing
yarn test:typecheck           # TypeScript check
yarn test:app                 # Run tests
yarn test:code                # ESLint
yarn fix                      # Auto-fix lint + format

# CLI development
cd packages/cli
npm run dev                   # Run CLI in dev mode
npm run build                 # Build CLI
```

---

## Important Files to Read First

1. `packages/cli/src/index.ts` — the full CLI implementation
2. `app/index.tsx` — routing setup
3. `app/App.tsx` — main canvas component
4. `AGENT.md` — how AI agents interact with the canvas
5. `.env.example` — sync configuration template
6. `app/vite.config.mts` — build and PWA configuration
