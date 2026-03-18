/**
 * OneShotPanel.tsx
 *
 * Sidebar panel for OneShot:
 *  - OpenRouter-powered AI prompt generation (vision + element structure)
 *  - API key + model name management (stored in localStorage)
 *  - Prompt textarea with copy button
 *  - Multi-format canvas export (PNG, SVG, WebP, .excalidraw JSON, PDF)
 */

import {
  exportToBlob,
  exportToSvg,
  MIME_TYPES,
  useExcalidrawAPI,
} from "@oneshot/excalidraw";
import { getNonDeletedElements } from "@oneshot/element";
import { useAtomValue } from "../app-jotai";
import { useState, useCallback, useRef, useMemo } from "react";

import { parseCanvas } from "../lib/promptExporter";
import { generatePromptWithOpenRouter } from "../lib/openrouterClient";
import { oneShotSyncStatusAtom, oneShotCursorAtom } from "../oneshot-jotai";

import type { SyncStatus } from "../oneshot-jotai";

// ─── Icons ────────────────────────────────────────────────────────────────────

const SparklesIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d="M12 3l1.912 5.813L19 10.5l-5.088 1.687L12 18l-1.912-5.813L5 10.5l5.088-1.687z" />
    <path d="M5 3l.874 2.626L8 6.5l-2.126.874L5 10l-.874-2.626L2 6.5l2.126-.874z" />
    <path d="M19 14l.874 2.626L22 17.5l-2.126.874L19 21l-.874-2.626L16 17.5l2.126-.874z" />
  </svg>
);

const KeyIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="M21 2l-9.6 9.6" />
    <path d="M15.5 7.5l3 3" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportFormat = "png" | "svg" | "webp" | "excalidraw" | "pdf";

interface FormatOption {
  id: ExportFormat;
  label: string;
  description: string;
  emoji: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: "png",
    label: "PNG",
    description: "Best for sharing with AI vision models",
    emoji: "🖼",
  },
  {
    id: "svg",
    label: "SVG",
    description: "Vector — scales to any size without blur",
    emoji: "📐",
  },
  {
    id: "webp",
    label: "WebP",
    description: "Smaller file, good quality raster",
    emoji: "🗜",
  },
  {
    id: "excalidraw",
    label: ".excalidraw",
    description: "Native JSON — AI can read element structure",
    emoji: "📄",
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Print or attach to a document",
    emoji: "📑",
  },
];

const STORAGE_KEY_API = "oneshot_openrouter_api_key";
const STORAGE_KEY_MODEL = "oneshot_openrouter_model";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function syncStatusLabel(status: SyncStatus): { text: string; color: string } {
  switch (status) {
    case "saving":
      return { text: "Saving…", color: "#f59e0b" };
    case "loading":
      return { text: "Loading…", color: "#60a5fa" };
    case "error":
      return { text: "Sync error", color: "#f87171" };
    default:
      return { text: "Synced", color: "#4ade80" };
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "5px 8px",
  borderRadius: "5px",
  border: "1px solid var(--color-surface-mid)",
  background: "var(--color-surface)",
  color: "var(--color-on-surface)",
  fontSize: "12px",
  fontFamily: "monospace",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const OneShotPanel = () => {
  const excalidrawAPI = useExcalidrawAPI();
  const syncStatus = useAtomValue(oneShotSyncStatusAtom);
  const { text: statusText, color: statusColor } = syncStatusLabel(syncStatus);
  const aiCursor = useAtomValue(oneShotCursorAtom);

  // Persisted settings
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_API) ?? "",
  );
  const [model, setModel] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_MODEL) ?? DEFAULT_MODEL,
  );
  const [showSettings, setShowSettings] = useState(false);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Generation state
  const [prompt, setPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  // ── Settings management ──────────────────────────────────────────────────

  const handleSaveSettings = useCallback((key: string, mdl: string) => {
    const trimmedKey = key.trim();
    const trimmedModel = mdl.trim() || DEFAULT_MODEL;
    setApiKey(trimmedKey);
    setModel(trimmedModel);
    localStorage.setItem(STORAGE_KEY_API, trimmedKey);
    localStorage.setItem(STORAGE_KEY_MODEL, trimmedModel);
    if (trimmedKey) {
      setShowSettings(false);
    }
  }, []);

  const handleSettingsToggle = useCallback(() => {
    setShowSettings((v) => !v);
    setTimeout(() => keyInputRef.current?.focus(), 50);
  }, []);

  // ── AI Prompt Generation ─────────────────────────────────────────────────

  const handleGeneratePrompt = useCallback(async () => {
    if (!excalidrawAPI) return;

    if (!apiKey) {
      setShowSettings(true);
      setTimeout(() => keyInputRef.current?.focus(), 50);
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportBackground: true },
        files,
        mimeType: MIME_TYPES.png,
      });
      const imageBase64 = await blobToBase64(blob);

      const nonDeleted = getNonDeletedElements(elements);
      const parsed = parseCanvas(nonDeleted);
      const elementStructure = JSON.stringify(parsed, null, 2);

      const result = await generatePromptWithOpenRouter({
        apiKey,
        model,
        imageBase64,
        elementStructure,
      });
      setPrompt(result);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Unknown error occurred.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [excalidrawAPI, apiKey, model]);

  // ── Active Agents (derived from scene customData) ────────────────────────
  // Reads unique author+authorColor pairs from all non-deleted elements.
  // Re-derives whenever aiCursor changes (i.e. every AI push) so the list
  // stays up to date without a separate subscription.
  const activeAgents = useMemo(() => {
    if (!excalidrawAPI) return []
    const seen = new Map<string, string>()
    for (const el of excalidrawAPI.getSceneElements()) {
      const cd = (el as any).customData
      if (!el.isDeleted && cd?.author && cd?.authorColor) {
        seen.set(cd.author, cd.authorColor)
      }
    }
    return Array.from(seen.entries()).map(([author, color]) => ({ author, color }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excalidrawAPI, aiCursor])

  // ── Add Annotation Note ─────────────────────────────────────────────────
  // Drops a yellow sticky-note text element at the canvas viewport center.
  // The AI is taught (via skill files) to detect and respond to these.

  const handleAddNote = useCallback(() => {
    if (!excalidrawAPI) return;

    const appState = excalidrawAPI.getAppState();
    const existingElements = excalidrawAPI.getSceneElements();

    // Place note at viewport center
    const x = appState.scrollX
      ? -appState.scrollX + appState.width / 2 - 100
      : 200;
    const y = appState.scrollY
      ? -appState.scrollY + appState.height / 2 - 30
      : 200;

    const noteId = `annotation-${Date.now()}`;
    const note = {
      id: noteId,
      type: "text" as const,
      x,
      y,
      width: 200,
      height: 60,
      angle: 0,
      strokeColor: "#ca8a04",
      backgroundColor: "#fef08a",
      fillStyle: "solid" as const,
      strokeWidth: 1,
      roughness: 0,
      opacity: 100,
      text: "💬 Note for AI",
      fontSize: 14,
      fontFamily: 1,
      textAlign: "left" as const,
      verticalAlign: "top" as const,
      containerId: null,
      originalText: "💬 Note for AI",
      autoResize: true,
      lineHeight: 1.25,
      version: 1,
      versionNonce: Math.floor(Math.random() * 1000000),
      isDeleted: false,
      groupIds: [],
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      customData: {
        oneshot_type: "annotation",
        author: "human",
        addressed: false,
      },
    };

    excalidrawAPI.updateScene({
      elements: [...existingElements, note],
    });

    // Put the element in edit mode so the user can type immediately
    excalidrawAPI.updateScene({
      appState: {
        editingTextElement: note as any,
      },
    });
  }, [excalidrawAPI]);

  // ── Copy to Clipboard ───────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  // ── Export Canvas ───────────────────────────────────────────────────────

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!excalidrawAPI) return;
      setExportingFormat(format);
      try {
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const files = excalidrawAPI.getFiles();
        const exportAppState = {
          ...appState,
          exportBackground: true,
          viewBackgroundColor: appState.viewBackgroundColor,
        };

        switch (format) {
          case "png": {
            const blob = await exportToBlob({
              elements,
              appState: exportAppState,
              files,
              mimeType: MIME_TYPES.png,
            });
            downloadBlob(blob, "oneshot-canvas.png");
            break;
          }
          case "svg": {
            const svgEl = await exportToSvg({
              elements,
              appState: exportAppState,
              files,
            });
            const svgStr = new XMLSerializer().serializeToString(svgEl);
            const blob = new Blob([svgStr], { type: "image/svg+xml" });
            downloadBlob(blob, "oneshot-canvas.svg");
            break;
          }
          case "webp": {
            const blob = await exportToBlob({
              elements,
              appState: exportAppState,
              files,
              mimeType: MIME_TYPES.webp,
            });
            downloadBlob(blob, "oneshot-canvas.webp");
            break;
          }
          case "excalidraw": {
            const data = {
              type: "excalidraw",
              version: 2,
              source: "oneshot",
              elements: elements.filter((el) => !el.isDeleted),
              appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
                gridSize: appState.gridSize ?? null,
              },
              files: {},
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], {
              type: "application/json",
            });
            downloadBlob(blob, "oneshot-canvas.excalidraw");
            break;
          }
          case "pdf": {
            const svgEl = await exportToSvg({
              elements,
              appState: exportAppState,
              files,
            });
            const svgStr = new XMLSerializer().serializeToString(svgEl);
            const printWindow = window.open("", "_blank");
            if (!printWindow) break;
            const svgWidth = svgEl.getAttribute("width") || "100%";
            const svgHeight = svgEl.getAttribute("height") || "100%";
            printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>OneShot Canvas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; align-items: center; justify-content: center; }
    svg { max-width: 100vw; max-height: 100vh; }
    @media print {
      @page { size: ${svgWidth}px ${svgHeight}px; margin: 0; }
    }
  </style>
</head>
<body>
${svgStr}
<script>window.onload = () => { window.print(); window.close(); }</script>
</body>
</html>`);
            printWindow.document.close();
            break;
          }
        }
      } catch (err) {
        console.error("[OneShotPanel] Export failed:", err);
      } finally {
        setExportingFormat(null);
      }
    },
    [excalidrawAPI],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  const hasKey = Boolean(apiKey);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "12px",
        height: "100%",
        overflow: "auto",
        fontFamily: "var(--ui-font)",
        fontSize: "13px",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "14px" }}>⚡ OneShot</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={handleSettingsToggle}
            title={hasKey ? "OpenRouter key set — click to change" : "Set OpenRouter API key"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 7px",
              borderRadius: "5px",
              border: `1px solid ${hasKey ? "#4ade8044" : "#f8717144"}`,
              background: "transparent",
              cursor: "pointer",
              fontSize: "10px",
              color: hasKey ? "#4ade80" : "#f87171",
              fontWeight: 500,
            }}
          >
            <KeyIcon />
            {hasKey ? "Key set" : "Add key"}
          </button>
          <span
            style={{
              fontSize: "11px",
              color: statusColor,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: statusColor,
                display: "inline-block",
              }}
            />
            {statusText}
          </span>
        </div>
      </div>

      {/* ── AI Cursor indicator ──────────────────────────────────────────── */}
      {aiCursor && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 10px",
            borderRadius: "6px",
            background: "#38bdf815",
            border: "1px solid #38bdf830",
            fontSize: "12px",
            color: "#38bdf8",
            animation: "oneshot-cursor-pulse 1.4s ease-in-out infinite",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#38bdf8",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {(aiCursor as any).text ?? "AI is drawing…"}
          <style>{`
            @keyframes oneshot-cursor-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>
      )}

      {/* ── Active Agents Legend ─────────────────────────────────────────── */}
      {activeAgents.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            padding: "5px 10px",
            borderRadius: "6px",
            background: "var(--color-surface-low)",
            border: "1px solid var(--color-surface-mid)",
            fontSize: "11px",
          }}
        >
          <span style={{ color: "var(--color-on-surface-low)", fontWeight: 600, flexShrink: 0 }}>
            Active:
          </span>
          {activeAgents.map(({ author, color }) => (
            <span
              key={author}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {author.charAt(0).toUpperCase() + author.slice(1)}
            </span>
          ))}
        </div>
      )}

      {/* ── Settings Panel (collapsible) ─────────────────────────────────── */}
      {showSettings && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid var(--color-surface-mid)",
            background: "var(--color-surface-low)",
          }}
        >
          {/* API Key */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-on-surface-low)" }}>
              OpenRouter API Key
            </label>
            <input
              ref={keyInputRef}
              type="password"
              placeholder="sk-or-v1-…"
              defaultValue={apiKey}
              id="or-key-input"
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowSettings(false);
              }}
              style={inputStyle}
            />
          </div>

          {/* Model */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-on-surface-low)" }}>
              Model
            </label>
            <input
              type="text"
              placeholder={DEFAULT_MODEL}
              defaultValue={model}
              id="or-model-input"
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowSettings(false);
              }}
              style={inputStyle}
            />
            <span style={{ fontSize: "10px", color: "var(--color-on-surface-low)", lineHeight: 1.4 }}>
              Paste any vision model ID from{" "}
              <a
                href="https://openrouter.ai/models?modality=image%2Btext"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#818cf8" }}
              >
                openrouter.ai/models
              </a>
              . Good free options:{" "}
              <code style={{ fontSize: "10px", background: "var(--color-surface-mid)", padding: "1px 3px", borderRadius: "3px" }}>
                google/gemini-2.0-flash-001
              </code>
              {" · "}
              <code style={{ fontSize: "10px", background: "var(--color-surface-mid)", padding: "1px 3px", borderRadius: "3px" }}>
                meta-llama/llama-3.2-90b-vision-instruct
              </code>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const keyEl = document.getElementById("or-key-input") as HTMLInputElement;
              const modelEl = document.getElementById("or-model-input") as HTMLInputElement;
              handleSaveSettings(keyEl.value, modelEl.value);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "5px",
              border: "none",
              background: "#6366f1",
              color: "#fff",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              alignSelf: "flex-end",
            }}
          >
            Save
          </button>

          <span style={{ fontSize: "10px", color: "var(--color-on-surface-low)" }}>
            Get a free key at{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#818cf8" }}
            >
              openrouter.ai/keys
            </a>
            . Stored only in your browser.
          </span>
        </div>
      )}

      <hr style={{ border: "none", borderTop: "1px solid var(--color-surface-mid)" }} />

      {/* ── Primary Action: AI Generate ─────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontWeight: 600 }}>AI Prompt Generator</div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--color-on-surface-low)",
            lineHeight: 1.4,
          }}
        >
          Reads your entire canvas — visually and structurally — via{" "}
          <strong style={{ color: "var(--color-on-surface)" }}>
            {model || DEFAULT_MODEL}
          </strong>{" "}
          and writes a detailed, production-ready implementation prompt.
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGeneratePrompt}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "none",
            background: isGenerating
              ? "var(--color-surface-mid)"
              : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: isGenerating ? "var(--color-on-surface-low)" : "#fff",
            fontWeight: 700,
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontSize: "13px",
            letterSpacing: "0.01em",
            boxShadow: isGenerating ? "none" : "0 2px 8px #6366f140",
            transition: "opacity 0.15s",
          }}
        >
          {isGenerating ? (
            <>
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "oneshot-spin 0.7s linear infinite",
                }}
              />
              Analysing canvas…
            </>
          ) : (
            <>
              <SparklesIcon />
              Generate with AI
            </>
          )}
        </button>

        <style>{`@keyframes oneshot-spin { to { transform: rotate(360deg); } }`}</style>

        {generateError && (
          <div
            style={{
              padding: "8px 10px",
              borderRadius: "6px",
              background: "#f8717115",
              border: "1px solid #f8717144",
              color: "#f87171",
              fontSize: "11px",
              lineHeight: 1.4,
              wordBreak: "break-word",
            }}
          >
            <strong>Error:</strong> {generateError}
          </div>
        )}

        {prompt && (
          <>
            <textarea
              readOnly
              value={prompt}
              style={{
                width: "100%",
                minHeight: "220px",
                resize: "vertical",
                fontSize: "11px",
                fontFamily: "var(--ui-font-code, monospace)",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--color-surface-mid)",
                background: "var(--color-surface-low)",
                color: "var(--color-on-surface)",
                lineHeight: 1.5,
              }}
            />
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: "5px 10px",
                borderRadius: "6px",
                border: "1px solid var(--color-surface-mid)",
                background: "transparent",
                cursor: "pointer",
                fontSize: "11px",
                color: copied ? "#4ade80" : "var(--color-on-surface)",
              }}
            >
              {copied ? "✓ Copied!" : "Copy to Clipboard"}
            </button>
          </>
        )}
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--color-surface-mid)" }} />

      {/* ── Annotation ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ fontWeight: 600 }}>Leave a Note for the AI</div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--color-on-surface-low)",
            lineHeight: 1.4,
          }}
        >
          Drop a yellow sticky note on the canvas. The AI will read it on its
          next turn, respond with a connected node, and mark the note green.
        </div>
        <button
          type="button"
          onClick={handleAddNote}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 12px",
            borderRadius: "6px",
            border: "1px solid #ca8a0444",
            background: "#fef08a18",
            cursor: "pointer",
            color: "#ca8a04",
            fontWeight: 600,
            fontSize: "12px",
          }}
        >
          💬 Add Note
        </button>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--color-surface-mid)" }} />

      {/* ── Export section ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontWeight: 600 }}>Export Visualization</div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--color-on-surface-low)",
            lineHeight: 1.4,
          }}
        >
          Download the canvas to attach alongside the prompt.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {FORMAT_OPTIONS.map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              disabled={exportingFormat !== null}
              onClick={() => handleExport(fmt.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "7px 10px",
                borderRadius: "6px",
                border: "1px solid var(--color-surface-mid)",
                background:
                  exportingFormat === fmt.id
                    ? "var(--color-surface-mid)"
                    : "transparent",
                cursor: exportingFormat !== null ? "not-allowed" : "pointer",
                textAlign: "left",
                color: "var(--color-on-surface)",
                opacity:
                  exportingFormat !== null && exportingFormat !== fmt.id
                    ? 0.5
                    : 1,
              }}
            >
              <span style={{ fontSize: "16px", flexShrink: 0 }}>{fmt.emoji}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                <span style={{ fontWeight: 600, fontSize: "12px" }}>
                  {exportingFormat === fmt.id ? "Exporting…" : fmt.label}
                </span>
                <span style={{ fontSize: "10px", color: "var(--color-on-surface-low)" }}>
                  {fmt.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--color-surface-mid)" }} />

      {/* ── How it works ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ fontWeight: 600 }}>How it works</div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--color-on-surface-low)",
            lineHeight: 1.6,
          }}
        >
          <p>
            An AI agent (Claude Code, Aider, etc.) can read and write the canvas by editing{" "}
            <code
              style={{
                background: "var(--color-surface-mid)",
                padding: "1px 3px",
                borderRadius: "3px",
              }}
            >
              canvas.excalidraw.json
            </code>{" "}
            directly — no API needed.
          </p>
          <br />
          <p>
            Changes appear here in real time. See{" "}
            <code
              style={{
                background: "var(--color-surface-mid)",
                padding: "1px 3px",
                borderRadius: "3px",
              }}
            >
              AGENT.md
            </code>{" "}
            in the project root for the full AI guide.
          </p>
        </div>
      </div>
    </div>
  );
};
