/**
 * promptExporter.ts
 *
 * Converts OneShot canvas elements into a structured, machine-ready prompt.
 * The prompt is designed to be sent alongside a visual export of the diagram
 * (PNG/SVG) so that it can reference specific elements visible in the image.
 */

import type { ExcalidrawElement } from "@oneshot/element/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedNode {
  id: string;
  type: "rectangle" | "ellipse" | "diamond";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frameId: string | null;
}

interface ParsedArrow {
  id: string;
  fromId: string | null;
  toId: string | null;
  label: string;
}

interface ParsedFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ParsedFreeText {
  id: string;
  text: string;
  x: number;
  y: number;
}

interface ParsedCanvas {
  nodes: ParsedNode[];
  arrows: ParsedArrow[];
  frames: ParsedFrame[];
  freeTexts: ParsedFreeText[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNode(el: ExcalidrawElement): el is ExcalidrawElement & {
  type: "rectangle" | "ellipse" | "diamond";
} {
  return (
    !el.isDeleted &&
    (el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond")
  );
}

function isArrow(el: ExcalidrawElement): boolean {
  return !el.isDeleted && el.type === "arrow";
}

function isText(el: ExcalidrawElement): boolean {
  return !el.isDeleted && el.type === "text";
}

function isFrame(el: ExcalidrawElement): boolean {
  return !el.isDeleted && (el.type === "frame" || el.type === "magicframe");
}

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Returns short label for a node: first non-empty text bound to it, or positional fallback. */
function labelFor(nodeId: string, textElements: ExcalidrawElement[]): string {
  const text = textElements.find(
    (el) => el.type === "text" && (el as any).containerId === nodeId,
  );
  if (text && (text as any).text) {
    return cleanText((text as any).text);
  }
  return `[unnamed]`;
}

function labelForArrow(
  arrowId: string,
  textElements: ExcalidrawElement[],
): string {
  const text = textElements.find(
    (el) => el.type === "text" && (el as any).containerId === arrowId,
  );
  if (text && (text as any).text) {
    return cleanText((text as any).text);
  }
  return "";
}

// ─── Canvas Parser ────────────────────────────────────────────────────────────

export function parseCanvas(
  elements: readonly ExcalidrawElement[],
): ParsedCanvas {
  const textEls = elements.filter(isText);

  // Nodes
  const nodes: ParsedNode[] = elements.filter(isNode).map((el) => ({
    id: el.id,
    type: el.type as "rectangle" | "ellipse" | "diamond",
    label: labelFor(el.id, textEls),
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    frameId: el.frameId,
  }));

  // Arrows
  const arrows: ParsedArrow[] = elements.filter(isArrow).map((el) => {
    const a = el as any;
    return {
      id: el.id,
      fromId: a.startBinding?.elementId ?? null,
      toId: a.endBinding?.elementId ?? null,
      label: labelForArrow(el.id, textEls),
    };
  });

  // Frames
  const frames: ParsedFrame[] = elements.filter(isFrame).map((el) => {
    const f = el as any;
    return {
      id: el.id,
      name: f.name || "Unnamed Section",
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
    };
  });

  // Free-floating text (not bound to any container)
  const freeTexts: ParsedFreeText[] = textEls
    .filter((el) => !(el as any).containerId)
    .map((el) => ({
      id: el.id,
      text: cleanText((el as any).text || ""),
      x: el.x,
      y: el.y,
    }));

  return { nodes, arrows, frames, freeTexts };
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * Generates a structured implementation prompt from canvas elements.
 *
 * The prompt uses prompt-engineering best practices:
 * - Explicit role assignment
 * - Structured reference to diagram elements (with labels matching the visual)
 * - Chain-of-thought setup (architecture → components → relationships → requirements)
 * - Numbered references that correspond to labelled nodes in the exported image
 */
export function exportCanvasToPrompt(
  elements: readonly ExcalidrawElement[],
): string {
  const { nodes, arrows, frames, freeTexts } = parseCanvas(elements);

  if (nodes.length === 0 && freeTexts.length === 0) {
    return "The canvas is empty. Draw your architecture, user flow, or idea, then generate the prompt.";
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // ── Sections from frames ──────────────────────────────────────────────────

  const frameSections: string[] = frames.map((frame) => {
    const children = nodes.filter((n) => {
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      return (
        cx >= frame.x &&
        cx <= frame.x + frame.width &&
        cy >= frame.y &&
        cy <= frame.y + frame.height
      );
    });
    const childLines = children
      .map((n) => `  - **${n.label}** (${n.type})`)
      .join("\n");
    return (
      `#### Section: "${frame.name}"\n` +
      (childLines || "  *(no components)*")
    );
  });

  // ── Connections ───────────────────────────────────────────────────────────

  const connectionLines = arrows
    .filter((a) => a.fromId && a.toId)
    .map((a) => {
      const from = nodeById.get(a.fromId!)?.label ?? a.fromId;
      const to = nodeById.get(a.toId!)?.label ?? a.toId;
      const label = a.label ? ` — *${a.label}*` : "";
      return `  - **${from}** → **${to}**${label}`;
    });

  // ── Free text (overview notes) ────────────────────────────────────────────

  const notes = freeTexts
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((t) => `> ${t.text}`)
    .join("\n");

  // ── Component list ────────────────────────────────────────────────────────

  const componentLines = nodes
    .map((n, i) => {
      const shapeLabel =
        n.type === "diamond"
          ? "decision/gateway"
          : n.type === "ellipse"
          ? "process/actor"
          : "component/module";
      return `  ${i + 1}. **${n.label}** — ${shapeLabel}`;
    })
    .join("\n");

  // ── Synthesised implementation paragraph ─────────────────────────────────

  const topLevelNodes = nodes.filter((n) => !n.frameId);
  const topLevelNames = topLevelNodes.map((n) => `**${n.label}**`);
  const synthComponents =
    topLevelNames.length > 0
      ? topLevelNames.slice(0, -1).join(", ") +
        (topLevelNames.length > 1
          ? ` and ${topLevelNames.at(-1)}`
          : topLevelNames[0])
      : "the components shown in the diagram";

  // ── Prompt assembly ───────────────────────────────────────────────────────

  const parts: string[] = [];

  parts.push(
    `# OneShot Implementation Prompt`,
    ``,
    `> **Note for AI:** This prompt was generated from a OneShot whiteboard. ` +
      `A visual export of the diagram (PNG/SVG) is attached — use it as the ` +
      `primary reference. Every component label below corresponds to a named ` +
      `shape visible in that image.`,
    ``,
  );

  parts.push(
    `## Role`,
    `You are an expert software architect and full-stack engineer. ` +
      `Your task is to implement the system described in this prompt and ` +
      `illustrated in the attached diagram. Follow the structure exactly as drawn.`,
    ``,
  );

  if (notes) {
    parts.push(`## Overview / Design Notes`, notes, ``);
  }

  if (frames.length > 0) {
    parts.push(`## Architecture Sections`, ...frameSections, ``);
  }

  if (nodes.length > 0) {
    parts.push(
      `## Components`,
      `The diagram contains ${nodes.length} component(s). ` +
        `Each label below matches a shape in the attached visual:`,
      componentLines,
      ``,
    );
  }

  if (connectionLines.length > 0) {
    parts.push(
      `## Data Flow & Relationships`,
      `The following connections are drawn in the diagram (arrows):`,
      connectionLines.join("\n"),
      ``,
    );
  }

  parts.push(
    `## Implementation Requirements`,
    ``,
    `Build the system comprising ${synthComponents}.`,
    ``,
    `Work through the implementation in this order:`,
    `1. **Define interfaces and data contracts** between components`,
    `2. **Implement each component** in isolation, following its shape type:`,
    `   - Rectangle → module/class/service`,
    `   - Diamond   → router/decision logic/conditional branch`,
    `   - Ellipse   → actor/external service/user-facing endpoint`,
    `3. **Wire the connections** as shown by the arrows in the diagram`,
    `4. **Write tests** for each component and each connection`,
    `5. **Document** the public API for every component`,
    ``,
    `Provide complete, production-ready code. Do not use placeholders or stubs.`,
  );

  return parts.join("\n");
}
