import fs from "fs"
import path from "path"
import os from "os"
import pc from "picocolors"

const RULE_CONTENT = `---
description: Use when user wants to brainstorm, plan a feature, map architecture, visualize systems, or think through any idea visually on a shared canvas.
---

# OneShot – Visual Thinking Partner

## Session Start

Every time this rule activates, run these steps **before** saying anything:

### 1. Check config

\`\`\`bash
cat ~/.oneshot/config.json 2>/dev/null || echo "NOT_FOUND"
\`\`\`

If \`NOT_FOUND\` → run **First-Time Setup** below.

### 2. Check for saved sessions

\`\`\`bash
npx oneshot-app sessions
\`\`\`

- If sessions exist → ask the user to resume or start fresh
- If empty → proceed to step 3

### 3. Start the sync daemon

\`\`\`bash
npx oneshot-app start &                       # new session
npx oneshot-app start --resume <roomId> &     # resume existing
\`\`\`

Read the first JSON line from stdout:
- Success: \`{"ready":true,"roomUrl":"...","roomId":"...","workspaceFile":"..."}\`
- Error: \`{"error":"not_configured",...}\` → go to First-Time Setup

### 4. Show canvas URL

Say to the user:
> "Your canvas is ready: **<roomUrl>** — open it in a browser tab, then let's begin."

Wait for acknowledgement before asking the first question.

---

## First-Time Setup

If config is missing:

1. Ask: "Which sync service?" — Supabase (recommended, persistent) or Ably (quick, no persistence)
2. Ask for credentials:
   - Supabase: Project URL + anon public key (supabase.com → Project Settings → API)
   - Ably: API key (ably.com → Apps → API Keys)
3. Write \`~/.oneshot/config.json\`:
   - Supabase: \`{"sync":"supabase","supabaseUrl":"<url>","supabaseKey":"<key>"}\`
   - Ably: \`{"sync":"ably","apiKey":"<key>"}\`
4. Return to Session Start step 2

---

## Mandatory Rules

1. **Read first** — always read \`workspace.json\` before any canvas update
2. **Draw before talking** — update canvas first, then explain in words
3. **One question → one canvas update** — reflect each answer immediately
4. **Connect, never orphan** — every new node connects via arrow to existing nodes
5. **One question at a time** — never ask two questions in one message

## Annotation Protocol

Before every canvas update, scan all non-deleted elements where
\`customData?.oneshot_type === "annotation"\` and \`customData?.addressed !== true\`.
For each one: read the text, draw a response node near it connected by arrow,
then set \`customData.addressed = true\` and \`backgroundColor = "#bbf7d0"\` on the annotation.

## Graph Awareness

On every new user input:
1. Parse all existing non-deleted nodes in \`workspace.json\`
2. Find the closest related existing node by content
3. Place new node near it (200–300 px away)
4. Connect with labeled arrow if relationship is non-obvious
5. Never duplicate an existing node — modify or extend it instead

## Visual Style

\`\`\`
Background: #0f172a  |  Fill: #1e293b  |  Stroke: #e2e8f0
Cyan #38bdf8 = highlight  |  Orange #fb923c = risk  |  Green #4ade80 = good  |  Red #f87171 = danger
strokeWidth: 2, roughness: 0, roundness: { type: 3, value: 8 }
\`\`\`

## Shape Semantics

rectangle = system/service | ellipse = actor/user | diamond = decision | frame = group/section

## DSL Format (Recommended)

Instead of editing \`workspace.json\` directly, write \`workspace.oneshot.json\` with this simpler format.
The CLI detects it, compiles it into \`workspace.json\`, and deletes it automatically.

\`\`\`json
{
  "oneshot": true,
  "version": 1,
  "intent": "What this update does (optional)",
  "add": [
    { "id": "gateway", "shape": "rect",    "label": "API Gateway", "color": "default" },
    { "id": "user",    "shape": "ellipse", "label": "User",        "color": "blue"    }
  ],
  "connect": [
    { "from": "user", "to": "gateway", "label": "HTTP" }
  ],
  "update": [
    { "id": "gateway", "label": "API Gateway v2", "color": "green" }
  ],
  "delete": ["old-element-id"]
}
\`\`\`

Shapes: \`rect\` | \`ellipse\` | \`diamond\` | \`frame\`
Colors: \`default\` | \`blue\` | \`green\` | \`orange\` | \`red\` | \`cyan\` | \`purple\`

Direct \`workspace.json\` edits still work — DSL is the preferred interface.

## Raw Format (Advanced)

\`\`\`json
{
  "type": "excalidraw", "version": 2,
  "elements": [],
  "appState": { "viewBackgroundColor": "#0f172a" },
  "files": {}
}
\`\`\`

Every element needs: id, type, x, y, width, height, angle, strokeColor, backgroundColor,
fillStyle, strokeWidth, roughness, opacity, version, versionNonce, isDeleted, groupIds, boundElements.

Text inside shape: set \`containerId\` to parent id.
Arrow: \`startBinding\`/\`endBinding\` with elementId + add arrow id to both endpoints' \`boundElements\`.
`

export async function setupWindsurfSkill() {
  // Windsurf reads rules from ~/.windsurf/rules/ (global) — same pattern as Claude Code skills
  const rulesDir = path.join(os.homedir(), ".windsurf", "rules")

  try {
    fs.mkdirSync(rulesDir, { recursive: true })
    const rulePath = path.join(rulesDir, "oneshot.md")
    fs.writeFileSync(rulePath, RULE_CONTENT)
    console.log(pc.green(`  ✔ OneShot rule installed for Windsurf`))
    console.log(pc.dim(`    Location: ${rulePath}`))
  } catch (err) {
    throw new Error(`Could not install Windsurf rule: ${(err as Error).message}`)
  }
}
