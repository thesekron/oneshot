# OneShot — Implementation Log

Full record of every change made during this session, organised by phase.

---

## Phase 0 — Bug Fixes & Repo Cleanup

### CLI: infinite feedback loop (`packages/cli/src/index.ts`)

**Problem.**
When the CLI received a remote update it wrote the new scene to `workspace.json`.
That write triggered the `chokidar` watcher, which pushed the same data back to the remote, creating an endless loop.

**Fix.**
Added a module-level `suppressNextWatch` boolean flag.

```
onUpdate callback fires
  → set suppressNextWatch = true
  → write workspace.json

chokidar "change" fires
  → if suppressNextWatch: reset flag, return early  ✓
  → otherwise push to remote
```

---

### CLI: `touchSession` crash (`packages/cli/src/index.ts`)

**Problem.**
`touchSession` called `fs.writeFileSync` on `~/.oneshot/sessions.json` without first ensuring the directory existed. On a fresh machine this threw `ENOENT`.

**Fix.**
Added `fs.mkdirSync(path.dirname(SESSIONS_PATH), { recursive: true })` immediately before the write — mirroring the pattern already used in `saveSession`.

---

### App: CSS class typo (`app/App.tsx` line 907)

**Problem.**
`className="alertalert--warning"` — two class names merged without a space, so the warning banner had no styling.

**Fix.**
`className="alert alert--warning"`

---

### Repo: deleted dead files

| File | Reason |
|---|---|
| `HANDOFF.md` | Internal dev note, not useful to open-source contributors |
| `.env.production` | Contained Excalidraw Plus keys; irrelevant to OneShot |
| `.husky/pre-commit` | Husky hook referencing scripts that no longer existed |

---

### Repo: stripped Excalidraw leftovers

- **`.env.development`** — removed `VITE_APP_PLUS_EXPORT_PUBLIC_KEY` block, set `VITE_APP_ENABLE_TRACKING=false`
- **`package.json`** — removed `husky` devDependency and `"prepare": "husky install"` script
- **`.gitignore`** — added `.env.production` entry so keys can't be accidentally committed

---

### Repo: added `CONTRIBUTING.md`

New file documenting:
- Yarn workspace build order
- Local dev startup (`yarn dev` in `app/`, `yarn dev` in `packages/cli/`)
- How to run tests per package
- All supported env vars and their defaults

---

## Phase 1 — Supabase Snapshots (Session History)

### New `snapshots` table

Added SQL to `.env.example`:

```sql
create table snapshots (
  id          uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  elements    jsonb not null,
  app_state   jsonb not null default '{}',
  author      text not null default 'ai',
  agent_label text not null default 'AI',
  created_at  timestamptz not null default now()
);

-- RLS: public read, public insert (no auth required)
alter table snapshots enable row level security;
create policy "public read"   on snapshots for select using (true);
create policy "public insert" on snapshots for insert with check (true);

create index snapshots_workspace_created
  on snapshots (workspace_id, created_at desc);
```

---

### CLI: snapshot write on every push (`packages/cli/src/sync/supabase.ts`)

After the main workspace upsert, `push()` inserts a row into `snapshots`:

```ts
await supabase.from("snapshots").insert({
  workspace_id: this.workspaceId,
  elements: withCursor.elements,
  app_state:  { viewBackgroundColor: data.appState?.viewBackgroundColor },
  author:      this.agentId,
  agent_label: this.agentLabel,
})
```

The insert is **non-fatal** — errors are logged to stderr but never block the canvas update.

---

### Browser: human snapshot on save (`app/hooks/useCloudSync.ts`)

After the user's Supabase upsert, `useCloudSync` inserts a snapshot row with `author: "human"`.
Same non-fatal pattern.

---

## Phase 2 — Session Replay (Timeline Panel)

### New Jotai atoms (`app/oneshot-jotai.ts`)

```ts
export type Snapshot = {
  id: string
  elements: ExcalidrawElement[]
  appState: { viewBackgroundColor?: string }
  author: string
  agentLabel: string
  createdAt: string
}

export const snapshotsAtom    = atom<Snapshot[]>([])
export const replayIndexAtom  = atom<number>(-1)   // -1 = live mode
export const isReplayingAtom  = atom<boolean>(false)
export const replayPlayingAtom = atom<boolean>(false)
```

---

### New hook: `useReplay` (`app/hooks/useReplay.ts`)

Reads Supabase credentials from the URL hash (`#supabaseUrl=…&supabaseKey=…`) or from Vite env vars.

| Export | What it does |
|---|---|
| `loadSnapshots(workspaceId)` | Fetches all snapshot rows for the room, newest first |
| `seekTo(index)` | Sets `replayIndexAtom`, replaces canvas elements with that snapshot |
| `play()` | Auto-advances every 400 ms, stops at first snapshot |
| `pause()` | Stops auto-play |
| `exitReplay()` | Restores live mode (replayIndex = -1) |

`seekTo` never writes to `workspace.json` — it only calls `excalidrawAPI.updateScene()` so the canvas is purely in-memory during replay.

---

### New component: `TimelinePanel` (`app/components/TimelinePanel.tsx`)

Renders inside the sidebar "Timeline" tab:

- **Snapshot list** — newest first, each row shows agent label + colour dot + relative time
- **Scrubber** — a row of dots (one per snapshot) the user can click to jump directly
- **Controls** — Prev / Play▶ or Pause⏸ / Next buttons
- **Status chip** — green `LIVE` or amber `REPLAY` badge in the header

Agent colours in the panel:

| Author ID | Colour |
|---|---|
| claude | `#38bdf8` sky |
| cursor | `#fb923c` orange |
| aider | `#4ade80` green |
| windsurf | `#a78bfa` violet |
| human | `#f1f5f9` white |
| anything else | `#94a3b8` slate |

---

### Sidebar tab (`app/components/AppSidebar.tsx`)

Added a `⏱` trigger button and `<Sidebar.Tab tab="timeline">` wrapping `<TimelinePanel />`.

---

### Replay route (`app/pages/ReplayPage.tsx`, `app/index.tsx`)

- New page `ReplayPage` renders the same `<ExcalidrawApp />` as the main canvas
- Route: `/r/:roomId/replay`
- Registered in `app/index.tsx` alongside the existing canvas route

---

## Phase 3 — Human Annotation Loop

### "Add Note" button (`app/components/OneShotPanel.tsx`)

Drops a yellow sticky-note text element at the viewport centre with:

```ts
customData: {
  oneshot_type: "annotation",
  author:       "human",
  addressed:    false,
}
backgroundColor: "#fef08a"   // yellow
strokeColor:     "#ca8a04"
```

Immediately puts the element into edit mode so the user can start typing.

---

### Annotation Protocol — all skill files

Added a `## Annotation Protocol` section to every AI skill file:

> Before every canvas update, scan all non-deleted elements where
> `customData?.oneshot_type === "annotation"` and `customData?.addressed !== true`.
> For each one: read the text, draw a response node near it connected by an arrow,
> then set `customData.addressed = true` and `backgroundColor = "#bbf7d0"` (green).

Files updated: `claude-code.ts`, `cursor.ts`, `antigravity.ts`, `windsurf.ts`

---

## Phase 4 — AI Cursor / Presence

### CLI: cursor injection on push

Both `AblySync.push()` and `SupabaseSync.push()` now:

1. Build an ephemeral text element with `id: "__oneshot_cursor__"` and `customData.oneshot_type: "cursor"`
2. Include it in the canvas data sent to the remote
3. Schedule a follow-up publish/upsert 3 seconds later **without** the cursor element

```ts
const cursorElement = {
  id: "__oneshot_cursor__",
  type: "text",
  text: agentLabel,
  customData: { oneshot_type: "cursor", agentId, agentLabel, agentColor },
  ...
}
```

---

### Browser: cursor atom (`app/hooks/useCloudSync.ts`)

Added to `applyRemoteElements`:

```ts
const cursorEl   = remote.find(el => el.customData?.oneshot_type === "cursor")
const realElements = remote.filter(el => el.customData?.oneshot_type !== "cursor")

if (cursorEl) {
  appJotaiStore.set(oneShotCursorAtom, cursorEl)
  clearTimeout(cursorClearTimer)
  cursorClearTimer = setTimeout(
    () => appJotaiStore.set(oneShotCursorAtom, null),
    3500   // CURSOR_TTL_MS
  )
}
// reconcile only realElements — cursor never enters localStorage or snapshots
```

New atom in `oneshot-jotai.ts`:

```ts
export const oneShotCursorAtom = atom<ExcalidrawElement | null>(null)
```

---

### Browser: pulsing indicator (`app/components/OneShotPanel.tsx`)

When `oneShotCursorAtom` is non-null, a pulsing row appears at the top of the panel:

```
● Claude is drawing…
```

Colour matches the agent's `agentColor` field. Disappears automatically 3.5 s after the last push.

---

## Phase 5 — DSL Compiler

### New file: `packages/cli/src/compile.ts`

A typed compiler that converts a simple high-level format (`workspace.oneshot.json`) into a full Excalidraw scene.

**DSL schema:**

```ts
interface DslFile {
  oneshot: true
  version: 1
  intent?:  string          // recorded in snapshot.app_state
  add?:     DslNode[]       // new shapes
  connect?: DslEdge[]       // new arrows
  update?:  DslUpdate[]     // modify existing nodes by dsl_id
  delete?:  string[]        // set isDeleted on nodes by dsl_id
}
```

**Auto-layout:**
New nodes are placed to the right of the rightmost existing element. Every 3 nodes the column resets and the row advances by 160 px (3-column grid, 240 px horizontal gap).

**Arrow bindings:**
`connect` entries generate a full arrow element with `startBinding`/`endBinding` and update `boundElements` on both endpoints.

**`customData` stamping:**
Every generated element gets:
```ts
customData: {
  dsl_id:      dslNode.id,     // stable reference for future updates
  author:      agentId,
  authorColor: agentColor,
}
```

---

### CLI watcher update (`packages/cli/src/index.ts`)

```ts
const DSL_FILE = "workspace.oneshot.json"
const dslPath  = path.join(workDir, DSL_FILE)

watcher.add(dslPath)

watcher.on("change", async (changedPath) => {
  if (changedPath === dslPath) {
    const dsl   = JSON.parse(fs.readFileSync(dslPath, "utf8"))
    const scene = JSON.parse(fs.readFileSync(workspacePath, "utf8"))
    const { scene: compiled, intent } = compile(dsl, scene, agentId, agentColor)
    fs.writeFileSync(workspacePath, JSON.stringify(compiled, null, 2))
    fs.unlinkSync(dslPath)          // delete DSL file after compile
    // workspace.json change will trigger the normal push path
    return
  }
  // normal workspace.json push …
})
```

---

### DSL format documented in all skill files

Added `## DSL Format (Recommended)` section (before the raw format docs) to:

- `packages/cli/src/skills/claude-code.ts`
- `packages/cli/src/skills/cursor.ts`
- `packages/cli/src/skills/antigravity.ts`
- `packages/cli/src/skills/windsurf.ts`

Existing raw Excalidraw format docs renamed to `## Raw Format (Advanced)` — kept for reference but deprioritised.

---

### `AGENT.md` updated

Added two new sections at the end:

- **DSL Format (Recommended)** — full format reference with JSON example, shapes/colours tables, and a note on how `dsl_id` works for cross-referencing existing nodes
- **Annotation Protocol** — Python snippet to find unaddressed annotations, plus the full state-machine description (yellow → responded → green)

---

## Phase 6 — Multi-Agent Canvas

### Agent colour helper (`packages/cli/src/index.ts`)

```ts
export function getAgentColor(agentId: string): string {
  const known: Record<string, string> = {
    claude:      "#38bdf8",   // sky
    cursor:      "#fb923c",   // orange
    aider:       "#4ade80",   // green
    windsurf:    "#a78bfa",   // violet
    antigravity: "#f472b6",   // pink
    human:       "#f1f5f9",   // white
    ai:          "#38bdf8",
  }
  if (known[agentId.toLowerCase()]) return known[agentId.toLowerCase()]
  // deterministic hash for unknown IDs
  let h = 0
  for (const c of agentId) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  const hue = Math.abs(h) % 360
  return `hsl(${hue}, 70%, 65%)`
}
```

---

### `SupabaseSync` constructor (`packages/cli/src/sync/supabase.ts`)

Now accepts `agentId` and `agentLabel`:

```ts
constructor(
  private url: string,
  private key: string,
  private workspaceId: string,
  private agentId:    string = "ai",
  private agentLabel: string = "AI",
) {}
```

Both are stamped onto cursor elements and snapshot rows.

---

### Agent legend UI (`app/components/OneShotPanel.tsx`)

A `useMemo` hook derives the set of active agents from `excalidrawAPI.getSceneElements()` by reading `customData.author` and `customData.authorColor` on every non-deleted element. The list re-derives whenever `aiCursor` changes (i.e. every AI push), keeping it fresh without a separate subscription.

Rendered as a compact row directly below the header:

```
Active:  ● Claude   ● You
```

Each dot and label uses the agent's own `authorColor`. Hidden when no elements have agent metadata.

---

## File Map

| File | Status | What changed |
|---|---|---|
| `app/App.tsx` | modified | CSS typo fix |
| `app/components/AppSidebar.tsx` | modified | Timeline tab |
| `app/components/OneShotPanel.tsx` | modified | Cursor indicator, Add Note, Agent legend |
| `app/components/TimelinePanel.tsx` | **new** | Full replay UI |
| `app/hooks/useCloudSync.ts` | modified | Cursor filtering, human snapshots |
| `app/hooks/useReplay.ts` | **new** | Replay logic |
| `app/index.tsx` | modified | Replay route |
| `app/oneshot-jotai.ts` | modified | New atoms |
| `app/pages/ReplayPage.tsx` | **new** | Replay page shell |
| `packages/cli/src/compile.ts` | **new** | DSL compiler |
| `packages/cli/src/index.ts` | modified | suppressNextWatch, DSL watcher, getAgentColor |
| `packages/cli/src/skills/antigravity.ts` | modified | Annotation + DSL sections |
| `packages/cli/src/skills/claude-code.ts` | modified | Annotation + DSL sections |
| `packages/cli/src/skills/cursor.ts` | modified | Annotation + DSL sections |
| `packages/cli/src/skills/windsurf.ts` | **new** | Full Windsurf skill |
| `packages/cli/src/sync/ably.ts` | modified | Cursor injection |
| `packages/cli/src/sync/supabase.ts` | modified | Cursor injection, snapshots, agentId |
| `.env.development` | modified | Remove Plus keys, disable tracking |
| `.env.example` | modified | Snapshots SQL |
| `.env.production` | **deleted** | — |
| `.gitignore` | modified | `.env.production` entry |
| `.husky/pre-commit` | **deleted** | — |
| `AGENT.md` | modified | DSL + Annotation Protocol sections |
| `CONTRIBUTING.md` | **new** | Dev guide |
| `HANDOFF.md` | **deleted** | — |
| `package.json` | modified | Remove husky |
