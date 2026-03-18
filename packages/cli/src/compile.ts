/**
 * compile.ts
 *
 * Compiles a high-level OneShot DSL file (workspace.oneshot.json) into a
 * full Excalidraw scene by merging with the existing workspace.json.
 *
 * DSL format:
 * {
 *   "oneshot": true,
 *   "version": 1,
 *   "intent": "optional description for snapshot message",
 *   "add": [
 *     { "id": "gateway", "shape": "rect", "label": "API Gateway", "color": "default" }
 *   ],
 *   "connect": [
 *     { "from": "gateway", "to": "db", "label": "read/write" }
 *   ],
 *   "update": [
 *     { "id": "gateway", "label": "API Gateway v2" }
 *   ],
 *   "delete": ["old-element-id"]
 * }
 *
 * Shapes: "rect" | "ellipse" | "diamond" | "frame"
 * Colors: "default" | "blue" | "green" | "orange" | "red" | "cyan" | "purple"
 */

import { randomBytes } from "crypto"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DslNode {
  id: string
  shape?: "rect" | "ellipse" | "diamond" | "frame"
  label: string
  color?: string
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface DslEdge {
  from: string
  to: string
  label?: string
}

export interface DslUpdate {
  id: string
  label?: string
  color?: string
}

export interface DslFile {
  oneshot: true
  version: 1
  intent?: string
  add?: DslNode[]
  connect?: DslEdge[]
  update?: DslUpdate[]
  delete?: string[]
}

export interface ExcalidrawScene {
  type: "excalidraw"
  version: 2
  elements: any[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
}

// ── Color palette ─────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { stroke: string; fill: string }> = {
  default: { stroke: "#e2e8f0", fill: "#1e293b" },
  blue:    { stroke: "#38bdf8", fill: "#0c4a6e" },
  green:   { stroke: "#4ade80", fill: "#14532d" },
  orange:  { stroke: "#fb923c", fill: "#7c2d12" },
  red:     { stroke: "#f87171", fill: "#7f1d1d" },
  cyan:    { stroke: "#67e8f9", fill: "#164e63" },
  purple:  { stroke: "#a78bfa", fill: "#3b0764" },
}

function getColors(color?: string) {
  return COLOR_MAP[color?.toLowerCase() ?? "default"] ?? COLOR_MAP.default
}

// ── ID helpers ────────────────────────────────────────────────────────────────

function uid(): string {
  return randomBytes(6).toString("hex")
}

function nonce(): number {
  return Math.floor(Math.random() * 1_000_000)
}

// ── Shape dimensions ─────────────────────────────────────────────────────────

function shapeDimensions(shape: DslNode["shape"]): { w: number; h: number } {
  switch (shape) {
    case "ellipse":  return { w: 200, h: 100 }
    case "diamond":  return { w: 180, h: 100 }
    case "frame":    return { w: 400, h: 300 }
    default:         return { w: 200, h: 80 }
  }
}

// ── Auto-layout ───────────────────────────────────────────────────────────────
// Places new nodes to the right of the rightmost existing element.
// Wraps down every 3 nodes.

function autoLayout(
  newNodes: DslNode[],
  existingElements: any[],
): Array<{ x: number; y: number }> {
  const nonDeleted = existingElements.filter((e: any) => !e.isDeleted)

  let startX = 100
  let startY = 100

  if (nonDeleted.length > 0) {
    const maxX = Math.max(...nonDeleted.map((e: any) => (e.x ?? 0) + (e.width ?? 0)))
    const minY = Math.min(...nonDeleted.map((e: any) => e.y ?? 0))
    startX = maxX + 240
    startY = minY
  }

  const COLS = 3
  const COL_GAP = 240
  const ROW_GAP = 160

  return newNodes.map((_, i) => ({
    x: startX + (i % COLS) * COL_GAP,
    y: startY + Math.floor(i / COLS) * ROW_GAP,
  }))
}

// ── Build Excalidraw element from DSL node ────────────────────────────────────

function buildShapeElement(
  node: DslNode,
  pos: { x: number; y: number },
  agentId: string,
  agentColor: string,
): { shape: any; text: any } {
  const { w, h } = shapeDimensions(node.shape)
  const { stroke, fill } = getColors(node.color)
  const x = node.x ?? pos.x
  const y = node.y ?? pos.y
  const width = node.width ?? w
  const height = node.height ?? h

  const shapeExcaId = uid()
  const textExcaId = uid()

  const shape: any = {
    id: shapeExcaId,
    type: node.shape === "ellipse" ? "ellipse" : node.shape === "diamond" ? "diamond" : "rectangle",
    x, y, width, height,
    angle: 0,
    strokeColor: stroke,
    backgroundColor: fill,
    fillStyle: "solid",
    strokeWidth: 2,
    roughness: 0,
    opacity: 100,
    roundness: node.shape === "rect" || !node.shape ? { type: 3, value: 8 } : null,
    version: 1,
    versionNonce: nonce(),
    isDeleted: false,
    groupIds: [],
    boundElements: [{ id: textExcaId, type: "text" }],
    updated: Date.now(),
    link: null,
    locked: false,
    customData: {
      dsl_id: node.id,
      author: agentId,
      authorColor: agentColor,
    },
  }

  // Frame type override
  if (node.shape === "frame") {
    shape.type = "frame"
    shape.name = node.label
    shape.boundElements = []
    delete shape.roundness
    return { shape, text: null }
  }

  const text: any = {
    id: textExcaId,
    type: "text",
    x,
    y: y + height / 2 - 12,
    width,
    height: 24,
    angle: 0,
    strokeColor: stroke,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    roughness: 0,
    opacity: 100,
    text: node.label,
    fontSize: 16,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: shapeExcaId,
    originalText: node.label,
    autoResize: true,
    lineHeight: 1.25,
    version: 1,
    versionNonce: nonce(),
    isDeleted: false,
    groupIds: [],
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false,
    customData: { dsl_id: node.id, author: agentId },
  }

  return { shape, text }
}

// ── Build arrow element ───────────────────────────────────────────────────────

function buildArrowElement(
  fromEl: any,
  toEl: any,
  label: string | undefined,
  agentId: string,
  agentColor: string,
): { arrow: any; arrowLabel: any | null } {
  const arrowId = uid()

  const fromCX = (fromEl.x ?? 0) + (fromEl.width ?? 0) / 2
  const fromCY = (fromEl.y ?? 0) + (fromEl.height ?? 0) / 2
  const toCX = (toEl.x ?? 0) + (toEl.width ?? 0) / 2
  const toCY = (toEl.y ?? 0) + (toEl.height ?? 0) / 2

  const dx = toCX - fromCX
  const dy = toCY - fromCY

  const arrow: any = {
    id: arrowId,
    type: "arrow",
    x: fromCX,
    y: fromCY,
    width: Math.abs(dx),
    height: Math.abs(dy),
    angle: 0,
    strokeColor: "#94a3b8",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    roughness: 0,
    opacity: 100,
    points: [[0, 0], [dx, dy]],
    startBinding: {
      elementId: fromEl.id,
      focus: 0,
      gap: 8,
    },
    endBinding: {
      elementId: toEl.id,
      focus: 0,
      gap: 8,
    },
    arrowType: "elbow",
    version: 1,
    versionNonce: nonce(),
    isDeleted: false,
    groupIds: [],
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false,
    customData: { author: agentId, authorColor: agentColor },
  }

  let arrowLabel: any | null = null
  if (label) {
    const labelId = uid()
    arrowLabel = {
      id: labelId,
      type: "text",
      x: fromCX + dx / 2 - 50,
      y: fromCY + dy / 2 - 12,
      width: 100,
      height: 24,
      angle: 0,
      strokeColor: "#94a3b8",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      roughness: 0,
      opacity: 100,
      text: label,
      fontSize: 12,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: arrowId,
      originalText: label,
      autoResize: true,
      lineHeight: 1.25,
      version: 1,
      versionNonce: nonce(),
      isDeleted: false,
      groupIds: [],
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    }
    arrow.boundElements = [{ id: labelId, type: "text" }]
  }

  return { arrow, arrowLabel }
}

// ── Main compile function ─────────────────────────────────────────────────────

export function compile(
  dsl: DslFile,
  scene: ExcalidrawScene,
  agentId: string = "ai",
  agentColor: string = "#38bdf8",
): { scene: ExcalidrawScene; intent?: string } {
  const elements = [...scene.elements]

  // Map of dsl_id → excalidraw element (for connecting arrows)
  // Also checks existing elements from previous runs
  function findByDslId(dslId: string): any | null {
    return elements.find(
      (el) => !el.isDeleted && el.customData?.dsl_id === dslId,
    ) ?? null
  }

  // ── DELETE ──────────────────────────────────────────────────────────────
  for (const delId of dsl.delete ?? []) {
    const el = elements.find((e) => e.id === delId || e.customData?.dsl_id === delId)
    if (el) {
      el.isDeleted = true
      el.version = (el.version ?? 1) + 1
      el.versionNonce = nonce()
    }
  }

  // ── ADD ──────────────────────────────────────────────────────────────────
  const positions = autoLayout(dsl.add ?? [], elements)

  for (let i = 0; i < (dsl.add ?? []).length; i++) {
    const node = dsl.add![i]
    const pos = positions[i]
    const { shape, text } = buildShapeElement(node, pos, agentId, agentColor)
    elements.push(shape)
    if (text) elements.push(text)
  }

  // ── CONNECT ──────────────────────────────────────────────────────────────
  for (const edge of dsl.connect ?? []) {
    const fromEl = findByDslId(edge.from)
    const toEl = findByDslId(edge.to)

    if (!fromEl || !toEl) {
      process.stderr.write(
        `[oneshot] connect: could not find "${edge.from}" or "${edge.to}" — skipping\n`,
      )
      continue
    }

    const { arrow, arrowLabel } = buildArrowElement(fromEl, toEl, edge.label, agentId, agentColor)
    elements.push(arrow)
    if (arrowLabel) elements.push(arrowLabel)

    // Update boundElements on both endpoints
    if (!fromEl.boundElements) fromEl.boundElements = []
    if (!toEl.boundElements) toEl.boundElements = []
    fromEl.boundElements.push({ id: arrow.id, type: "arrow" })
    toEl.boundElements.push({ id: arrow.id, type: "arrow" })
    fromEl.version = (fromEl.version ?? 1) + 1
    fromEl.versionNonce = nonce()
    toEl.version = (toEl.version ?? 1) + 1
    toEl.versionNonce = nonce()
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────
  for (const upd of dsl.update ?? []) {
    const el = findByDslId(upd.id) ?? elements.find((e) => e.id === upd.id)
    if (!el) continue

    if (upd.label !== undefined) {
      el.text = upd.label
      el.originalText = upd.label
      // Also update the bound text child if it exists
      const textChild = elements.find(
        (e) => e.containerId === el.id && e.type === "text" && !e.isDeleted,
      )
      if (textChild) {
        textChild.text = upd.label
        textChild.originalText = upd.label
        textChild.version = (textChild.version ?? 1) + 1
        textChild.versionNonce = nonce()
      }
    }

    if (upd.color !== undefined) {
      const { stroke, fill } = getColors(upd.color)
      el.strokeColor = stroke
      el.backgroundColor = fill
    }

    el.version = (el.version ?? 1) + 1
    el.versionNonce = nonce()
    el.updated = Date.now()
  }

  return {
    scene: { ...scene, elements },
    intent: dsl.intent,
  }
}
