#!/usr/bin/env node
import * as p from "@clack/prompts"
import pc from "picocolors"
import { printLogo } from "./logo.js"
import { checkForUpdates } from "./updater.js"
import { setupClaudeCodeSkill } from "./skills/claude-code.js"
import { setupCursorSkill } from "./skills/cursor.js"
import { setupAntigravitySkill } from "./skills/antigravity.js"
import { AblySync } from "./sync/ably.js"
import { SupabaseSync } from "./sync/supabase.js"
import type { SyncAdapter } from "./sync/types.js"
import chokidar from "chokidar"
import fs from "fs"
import path from "path"
import os from "os"
import { randomBytes } from "crypto"

const VERSION = "0.1.0"
const WORKSPACE_FILE = "workspace.json"
const ONESHOT_APP_URL = "https://oneshot-release.vercel.app"
const CONFIG_PATH = path.join(os.homedir(), ".oneshot", "config.json")

const SESSIONS_PATH = path.join(os.homedir(), ".oneshot", "sessions.json")

// ── Session management ────────────────────────────────────────────────────────

interface Session {
  id: string
  createdAt: string
  lastUsedAt: string
  sync: string
  workspaceFile: string
}

function loadSessions(): Session[] {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_PATH, "utf-8"))
  } catch {
    return []
  }
}

function saveSession(session: Session) {
  const sessions = loadSessions().filter((s) => s.id !== session.id)
  sessions.unshift(session) // most recent first
  fs.mkdirSync(path.dirname(SESSIONS_PATH), { recursive: true })
  fs.writeFileSync(SESSIONS_PATH, JSON.stringify(sessions.slice(0, 20), null, 2))
}

function touchSession(id: string) {
  const sessions = loadSessions()
  const session = sessions.find((s) => s.id === id)
  if (session) {
    session.lastUsedAt = new Date().toISOString()
    fs.writeFileSync(SESSIONS_PATH, JSON.stringify(sessions, null, 2))
  }
}

// ── Entry point ─────────────────────────────────────────────────────────────

const command = process.argv[2]
const flags = process.argv.slice(3)

if (!command || command === "install") {
  runInstall()
} else if (command === "start") {
  // --resume <roomId>  — reuse an existing session
  const resumeIdx = flags.indexOf("--resume")
  const resumeId = resumeIdx !== -1 ? flags[resumeIdx + 1] : undefined
  runStart(resumeId)
} else if (command === "sessions") {
  // Print saved sessions as JSON for the agent to inspect.
  outputJSON({ sessions: loadSessions() })
} else {
  console.error(`Unknown command: ${command}`)
  console.error("Usage: npx oneshot-app [install|start [--resume <roomId>]|sessions]")
  process.exit(1)
}

// ── install ──────────────────────────────────────────────────────────────────
// Called by the user once: npx oneshot-app
// Installs the Claude Code / Cursor skill and exits.

async function runInstall() {
  printLogo(VERSION)
  checkForUpdates(VERSION).catch(() => {})

  p.intro(pc.bgCyan(pc.black(" oneshot ")))

  const agent = await p.select({
    message: "Which AI agent are you using?",
    options: [
      { value: "claude-code",   label: "Claude Code",   hint: "by Anthropic" },
      { value: "cursor",        label: "Cursor",        hint: "by Anysphere" },
      { value: "antigravity",   label: "Antigravity",   hint: "by Google" },
      { value: "windsurf",      label: "Windsurf",      hint: "by Codeium" },
      { value: "other",         label: "Other / None" },
    ],
  })

  if (p.isCancel(agent)) { p.cancel("Cancelled."); process.exit(0) }

  if (agent === "claude-code" || agent === "cursor" || agent === "antigravity") {
    const spinner = p.spinner()
    spinner.start("Installing skill…")

    try {
      if (agent === "claude-code")  await setupClaudeCodeSkill()
      if (agent === "cursor")       await setupCursorSkill()
      if (agent === "antigravity")  await setupAntigravitySkill()
      spinner.stop(pc.green("Skill installed"))
    } catch (err) {
      spinner.stop(pc.yellow(`Could not install skill: ${(err as Error).message}`))
    }
  }

  p.outro(
    [
      pc.green("✔") + " Done!",
      "",
      "  Now open your project in " +
        (agent === "claude-code" ? "Claude Code" : agent === "cursor" ? "Cursor" : agent === "antigravity" ? "Antigravity" : "your AI agent") +
        " and say:",
      pc.cyan('  "Let\'s brainstorm"') + "  or  " + pc.cyan("/oneshot"),
      "",
      pc.dim("  The agent will open your canvas and start the sync automatically."),
    ].join("\n"),
  )
}

// ── start ────────────────────────────────────────────────────────────────────
// Called by the AI agent (via the skill) to start the sync daemon.
// Outputs a single JSON line when ready, then runs silently until Ctrl-C.
//
// If ~/.oneshot/config.json is missing, outputs an error JSON and exits 1
// so the agent can guide the user through first-time setup.

async function runStart(resumeId?: string) {
  // ── Read config ────────────────────────────────────────────────────────────
  let config: Record<string, string>

  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"))
  } catch {
    outputJSON({
      error: "not_configured",
      message:
        "No config found. Please tell the user to follow the First-Time Setup steps in the skill instructions.",
      configPath: CONFIG_PATH,
    })
    process.exit(1)
  }

  // ── Resolve room ID ─────────────────────────────────────────────────────────
  // If resuming, reuse the existing roomId so the Supabase workspace row
  // (and thus all saved canvas data) is the same.
  const isResuming = Boolean(resumeId)
  const roomId = resumeId ?? randomBytes(4).toString("hex")
  const channelName = `oneshot-${roomId}`

  // ── Build sync adapter ─────────────────────────────────────────────────────
  let adapter: SyncAdapter

  try {
    if (config.sync === "ably") {
      adapter = new AblySync(config.apiKey, channelName)
    } else if (config.sync === "supabase") {
      adapter = new SupabaseSync(config.supabaseUrl, config.supabaseKey, roomId)
    } else {
      outputJSON({ error: "invalid_config", message: `Unknown sync type: ${config.sync}` })
      process.exit(1)
    }
  } catch (err) {
    outputJSON({ error: "adapter_init_failed", message: (err as Error).message })
    process.exit(1)
  }

  // ── Connect ────────────────────────────────────────────────────────────────
  try {
    await adapter!.connect()
  } catch (err) {
    outputJSON({ error: "connect_failed", message: (err as Error).message })
    process.exit(1)
  }

  // ── Workspace file ─────────────────────────────────────────────────────────
  const workspacePath = path.resolve(process.cwd(), WORKSPACE_FILE)

  if (!fs.existsSync(workspacePath)) {
    fs.writeFileSync(
      workspacePath,
      JSON.stringify(
        { type: "excalidraw", version: 2, elements: [], appState: { viewBackgroundColor: "#0f172a" }, files: {} },
        null,
        2,
      ),
    )
  }

  // ── Build room URL with credentials encoded in the hash fragment ───────────
  // Format: /r/:roomId#sync=<adapter>&key=<key>[&...]
  // The hash is NEVER sent to the server, so credentials stay in the browser.
  // The web app reads these params and connects directly to the user's own
  // Ably / Supabase account — no data ever passes through OneShot servers.
  let roomUrl: string
  if (config.sync === "ably") {
    const params = new URLSearchParams({
      sync: "ably",
      key: config.apiKey,
      // No "ch" param — the channel is derived from the path roomId on the client
    })
    roomUrl = `${ONESHOT_APP_URL}/r/${roomId}#${params.toString()}`
  } else {
    const params = new URLSearchParams({
      sync: "supabase",
      url: config.supabaseUrl,
      anonkey: config.supabaseKey,
      // No "workspace" param — derived from the path roomId on the client
    })
    roomUrl = `${ONESHOT_APP_URL}/r/${roomId}#${params.toString()}`
  }

  // ── Persist session ─────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  if (isResuming) {
    touchSession(roomId)
  } else {
    saveSession({
      id: roomId,
      createdAt: now,
      lastUsedAt: now,
      sync: config.sync,
      workspaceFile: workspacePath,
    })
  }

  // ── Ready — print startup line for the agent to read ──────────────────────
  outputJSON({ ready: true, roomUrl, roomId, resumed: isResuming, workspaceFile: workspacePath })

  // ── Sync daemon ────────────────────────────────────────────────────────────
  const watcher = chokidar.watch(workspacePath, { ignoreInitial: true })

  watcher.on("change", async () => {
    try {
      const content = fs.readFileSync(workspacePath, "utf-8")
      await adapter!.push(JSON.parse(content))
    } catch {
      // File mid-write — skip
    }
  })

  adapter!.onUpdate((data) => {
    fs.writeFileSync(workspacePath, JSON.stringify(data, null, 2))
  })

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await adapter!.disconnect()
    await watcher.close()
    process.exit(0)
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function outputJSON(obj: Record<string, unknown>) {
  process.stdout.write(JSON.stringify(obj) + "\n")
}
