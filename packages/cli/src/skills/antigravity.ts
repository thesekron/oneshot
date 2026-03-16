import fs from "fs"
import path from "path"
import os from "os"
import pc from "picocolors"

const SKILL_CONTENT = `# OneShot – Visual Thinking Partner

## Overview

You are a visual thinking partner with a live shared canvas (\`workspace.json\`). You start every thinking session by opening the canvas, ask questions one at a time, and draw each answer as a node connected to the existing graph. **The canvas is the thinking process — not a deliverable produced at the end.**

---

## Session Start

Every time this skill activates, run the following steps **before** saying anything to the user:

### 1. Check config

\`\`\`bash
cat ~/.oneshot/config.json 2>/dev/null || echo "NOT_FOUND"
\`\`\`

If output is \`NOT_FOUND\` → go to **First-Time Setup** below.

### 2. Check for saved sessions

\`\`\`bash
npx oneshot-app sessions
\`\`\`

- If **sessions is empty** → skip to step 3 (new session).
- If **sessions exist** → ask the user which to resume or start fresh.

### 3. Start the sync daemon

\`\`\`bash
npx oneshot-app start &                       # new session
npx oneshot-app start --resume <roomId> &     # resume existing
\`\`\`

Read the first JSON line it prints:
- Success: \`{"ready":true,"roomUrl":"...","workspaceFile":"..."}\`
- Error: \`{"error":"not_configured",...}\`

If error → go to **First-Time Setup**.

### 4. Show the user their canvas

Say:
> "Your canvas is ready: **<roomUrl>** — open it in a browser tab, then let's begin."

---

## First-Time Setup

If \`~/.oneshot/config.json\` is missing:

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

export async function setupAntigravitySkill() {
  // Antigravity reads workspace skills from .agent/skills/
  const workspaceSkillsDir = path.join(process.cwd(), ".agent", "skills", "oneshot")
  // Also install globally at ~/.gemini/antigravity/skills/
  const globalSkillsDir = path.join(os.homedir(), ".gemini", "antigravity", "skills", "oneshot")

  const errors: string[] = []

  // Install workspace skill
  try {
    fs.mkdirSync(workspaceSkillsDir, { recursive: true })
    const skillPath = path.join(workspaceSkillsDir, "SKILL.md")
    fs.writeFileSync(skillPath, SKILL_CONTENT)
    console.log(pc.green(`  ✔ OneShot skill installed for Antigravity (workspace)`))
    console.log(pc.dim(`    Location: ${skillPath}`))
  } catch (err) {
    errors.push(`workspace: ${(err as Error).message}`)
  }

  // Install global skill
  try {
    fs.mkdirSync(globalSkillsDir, { recursive: true })
    const skillPath = path.join(globalSkillsDir, "SKILL.md")
    fs.writeFileSync(skillPath, SKILL_CONTENT)
    console.log(pc.green(`  ✔ OneShot skill installed for Antigravity (global)`))
    console.log(pc.dim(`    Location: ${skillPath}`))
  } catch (err) {
    errors.push(`global: ${(err as Error).message}`)
  }

  if (errors.length === 2) {
    throw new Error(`Could not install Antigravity skill: ${errors.join("; ")}`)
  }
}
