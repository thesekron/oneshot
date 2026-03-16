import fs from "fs"
import path from "path"
import os from "os"
import pc from "picocolors"

const SKILL_CONTENT = `---
name: oneshot
description: Use when user wants to brainstorm, plan a feature, map architecture, visualize systems, think through any idea visually, or continue an existing visual session on a shared canvas.
---

# OneShot – Visual Thinking Partner

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

Output:
\`\`\`json
{"sessions":[{"id":"a1b2c3d4","createdAt":"...","lastUsedAt":"...","sync":"supabase","workspaceFile":"..."}]}
\`\`\`

- If **sessions is empty** → skip to step 3 (new session).
- If **sessions exist** → ask the user (one message, nothing else yet):

  > "I found your previous canvas sessions:
  > 1. Last used **<lastUsedAt formatted as e.g. "yesterday at 14:30">** (id: \`<id>\`)
  > *(up to 3 most recent)*
  >
  > Resume a previous session or start fresh?"

  Wait for answer, then:
  - **Resume** → use \`--resume <id>\` in step 3
  - **New** → proceed normally

  > **Note for Ably users:** Ably is ephemeral — resuming reconnects the channel but canvas data is only preserved if your browser tab stayed open. Supabase saves everything.

### 3. Start the sync daemon

\`\`\`bash
npx oneshot-app start &                       # new session
npx oneshot-app start --resume <roomId> &     # resume existing
\`\`\`

Read the first JSON line it prints:

**Success:**
\`\`\`json
{"ready":true,"roomUrl":"https://oneshot.app/#sync=...","roomId":"abc123","resumed":false,"workspaceFile":"/path/to/workspace.json"}
\`\`\`

**Error:**
\`\`\`json
{"error":"not_configured","message":"...","configPath":"..."}
\`\`\`

If error → go to **First-Time Setup**.

### 4. Show the user their canvas

Say (and nothing more yet):

> "Your canvas is ready: **<roomUrl>** — open it in a browser tab, then let's begin."

If \`resumed === true\`, append: *"Your previous session is loaded."*

Wait for the user to acknowledge before asking the first question.

---

## First-Time Setup

Run this flow **once** if \`~/.oneshot/config.json\` is missing:

1. Ask: "Which sync service do you want to use?"
   - **Ably** — fast relay, free plan, no persistence between sessions
   - **Supabase** — database-backed, canvas saved between sessions

2. Based on choice, ask for credentials:
   - **Ably**: "Paste your Ably API key (get one free at ably.com → Apps → API Keys)"
   - **Supabase**: ask for Project URL, then anon public key (supabase.com → Project Settings → API)

3. Write the config file:

\`\`\`bash
mkdir -p ~/.oneshot
\`\`\`

For Ably:
\`\`\`json
{"sync":"ably","apiKey":"<paste key here>"}
\`\`\`

For Supabase:
\`\`\`json
{"sync":"supabase","supabaseUrl":"<url>","supabaseKey":"<key>"}
\`\`\`

Write to: \`~/.oneshot/config.json\`

4. Then go back to **Session Start → step 2**.

---

## Mandatory Rules

**YOU MUST follow these. No exceptions.**

1. **Read first** — always read \`workspace.json\` before adding anything
2. **Draw before talking** — update canvas, then explain in words
3. **One question → one canvas update** — reflect each user answer immediately
4. **Connect, never orphan** — every new element connects to existing nodes via arrows
5. **One question at a time** — never ask two questions in one message

---

## Canvas Protocol

Parse existing elements by their \`text\` field and understand relationships via arrow \`startBinding\`/\`endBinding\`. Identify clusters and gaps before adding anything.

**When adding new content:**
1. Find the most related existing node by content
2. Place the new node spatially near it (within 200–300 px)
3. Add an arrow connecting them; add a label when the relationship needs clarification
4. Update \`boundElements\` on both the new node and the existing node

**Preserve all existing elements.** To remove: set \`"isDeleted": true\`. To modify: increment \`version\`.

---

## Graph Awareness (CRITICAL)

When the user says something new or continues a conversation:

1. Parse entire canvas — identify all non-deleted nodes and arrows
2. Map the user's input to the closest matching existing node(s)
3. Create the new node near the related cluster
4. Connect with a labeled arrow when the relationship is non-obvious
5. **Never duplicate an existing node** — modify or extend it instead

This makes the canvas a living graph that grows with the conversation.

---

## Shape Semantics

| Shape | Meaning |
|-------|---------|
| \`rectangle\` | System, component, service, concept |
| \`ellipse\` | Actor, user, external entity |
| \`diamond\` | Decision point, fork, question |
| \`text\` | Label, annotation, open question |
| \`frame\` | Logical group / section boundary |

---

## Visual Style

\`\`\`
Background:   #0f172a
Shape fill:   #1e293b
Stroke:       #e2e8f0   (default)
Cyan:         #38bdf8   (active / highlight)
Orange:       #fb923c   (risk / warning)
Green:        #4ade80   (resolved / confirmed)
Red:          #f87171   (danger / must-fix)
strokeWidth:  2,  roughness: 0
roundness:    { "type": 3, "value": 8 }
Grid:         multiples of 80 px
\`\`\`

---

## Element Reference

**Shape (rectangle / ellipse / diamond):**
\`\`\`json
{
  "id": "<unique-string>",
  "type": "rectangle",
  "x": 160, "y": 160,
  "width": 200, "height": 80,
  "angle": 0,
  "strokeColor": "#e2e8f0",
  "backgroundColor": "#1e293b",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 0,
  "opacity": 100,
  "version": 1,
  "versionNonce": 1,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": [],
  "roundness": { "type": 3, "value": 8 }
}
\`\`\`

**Text label (set containerId to parent shape id):**
\`\`\`json
{
  "id": "<unique-string>",
  "type": "text",
  "x": 160, "y": 180,
  "width": 200, "height": 40,
  "angle": 0,
  "strokeColor": "#e2e8f0",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "opacity": 100,
  "text": "My Service",
  "fontSize": 18,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "<parent-shape-id>",
  "version": 1,
  "versionNonce": 2,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": []
}
\`\`\`

**Arrow connecting two nodes:**
\`\`\`json
{
  "id": "<unique-string>",
  "type": "arrow",
  "x": 0, "y": 0,
  "width": 0, "height": 0,
  "angle": 0,
  "strokeColor": "#94a3b8",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 0,
  "opacity": 100,
  "points": [[0,0],[160,0]],
  "startBinding": { "elementId": "<source-id>", "focus": 0, "gap": 8 },
  "endBinding":   { "elementId": "<target-id>",  "focus": 0, "gap": 8 },
  "arrowType": "elbow",
  "version": 1,
  "versionNonce": 3,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": []
}
\`\`\`

Add arrow id to \`boundElements\` on both endpoint shapes:
\`\`\`json
"boundElements": [{ "id": "<arrow-id>", "type": "arrow" }]
\`\`\`

**workspace.json wrapper:**
\`\`\`json
{
  "type": "excalidraw",
  "version": 2,
  "elements": [],
  "appState": { "viewBackgroundColor": "#0f172a" },
  "files": {}
}
\`\`\`

---

## Anti-Patterns

| Violation | Why it fails |
|-----------|--------------|
| Drawing only at session end | Canvas is the process, not the output |
| Adding nodes without arrows | Creates an unreadable scatter plot |
| Asking two questions at once | User answer cannot map to a single node |
| Overwriting existing elements | Destroys collaborative context |
| Starting from blank without reading | Creates duplicates, ignores prior thinking |
| Duplicating an existing node | Splits the graph, breaks connections |
| Explaining before drawing | Words without visual anchor get forgotten |
`

export async function setupClaudeCodeSkill() {
  const skillDir = path.join(os.homedir(), ".claude", "skills", "oneshot")

  try {
    fs.mkdirSync(skillDir, { recursive: true })
    const skillPath = path.join(skillDir, "SKILL.md")
    fs.writeFileSync(skillPath, SKILL_CONTENT)
    // Clean up old flat-file format if it exists
    const oldPath = path.join(os.homedir(), ".claude", "skills", "oneshot.md")
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    console.log(pc.green(`  ✔ OneShot skill installed for Claude Code`))
    console.log(pc.dim(`    Location: ${skillPath}`))
  } catch (err) {
    throw new Error(`Could not install skill: ${(err as Error).message}`)
  }
}
