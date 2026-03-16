import fs from "fs"
import path from "path"
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

### 2. Start the sync daemon

\`\`\`bash
npx oneshot-app start &
\`\`\`

Read the first JSON line from stdout:
- Success: \`{"ready":true,"roomUrl":"...","workspaceFile":"..."}\`
- Error: \`{"error":"not_configured",...}\`

### 3. Show canvas URL

Say to the user:
> "Your canvas is ready: **<roomUrl>** — open it in a browser tab, then let's begin."

---

## First-Time Setup

If config is missing:

1. Ask: Ably (fast, free) or Supabase (persistent)?
2. Ask for API credentials
3. Write \`~/.oneshot/config.json\`:
   - Ably: \`{"sync":"ably","apiKey":"<key>"}\`
   - Supabase: \`{"sync":"supabase","supabaseUrl":"<url>","supabaseKey":"<key>"}\`
4. Return to Session Start step 2

---

## Rules

1. **Read** \`workspace.json\` before every canvas update
2. **Draw before talking** — update canvas first, then explain
3. **One question → one canvas update**
4. **Connect new nodes to existing ones** via arrows — never leave orphan nodes
5. **One question at a time**

## Graph Awareness

On every new user input:
1. Parse all existing nodes in \`workspace.json\`
2. Find the closest related existing node
3. Place new node near it (200–300 px away)
4. Connect with arrow + label if relationship is non-obvious
5. Never duplicate an existing node

## Visual Style

\`\`\`
Background: #0f172a  |  Fill: #1e293b  |  Stroke: #e2e8f0
Cyan #38bdf8 = highlight  |  Orange #fb923c = risk  |  Green #4ade80 = good
strokeWidth: 2, roughness: 0, roundness: {type:3, value:8}
\`\`\`

## Shape Semantics

rectangle = system/service | ellipse = actor/user | diamond = decision | frame = group

## workspace.json format

\`\`\`json
{
  "type": "excalidraw", "version": 2,
  "elements": [...],
  "appState": { "viewBackgroundColor": "#0f172a" },
  "files": {}
}
\`\`\`

Every element needs: id, type, x, y, width, height, angle, strokeColor, backgroundColor,
fillStyle, strokeWidth, roughness, opacity, version, versionNonce, isDeleted, groupIds, boundElements.

Text inside shape: set \`containerId\` to parent id.
Arrow: \`startBinding\`/\`endBinding\` with elementId + add arrow id to both endpoints' \`boundElements\`.
`

export async function setupCursorSkill() {
  const localRulesDir = path.join(process.cwd(), ".cursor", "rules")

  try {
    fs.mkdirSync(localRulesDir, { recursive: true })
    const rulePath = path.join(localRulesDir, "oneshot.mdc")
    fs.writeFileSync(rulePath, RULE_CONTENT)
    console.log(pc.green(`  ✔ OneShot rule installed for Cursor`))
    console.log(pc.dim(`    Location: ${rulePath}`))
  } catch (err) {
    throw new Error(`Could not install Cursor rule: ${(err as Error).message}`)
  }
}
