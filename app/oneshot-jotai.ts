import type { AppState, BinaryFiles } from "@oneshot/excalidraw/types";
import type { ExcalidrawElement, OrderedExcalidrawElement } from "@oneshot/element/types";

import { atom } from "./app-jotai";

/**
 * Holds the debounced save function registered by OneShotSync.
 * App.tsx's onChange handler calls this to persist canvas changes to disk.
 */
export const oneShotSaveFnAtom = atom<
  | ((
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => void)
  | null
>(null);

/** Sync status shown in the OneShotPanel header */
export type SyncStatus = "idle" | "saving" | "loading" | "error";
export const oneShotSyncStatusAtom = atom<SyncStatus>("idle");

// ── Session Replay ──────────────────────────────────────────────────────────

export type Snapshot = {
  id: string;
  elements: ExcalidrawElement[];
  appState: { viewBackgroundColor: string; gridSize: number | null };
  author: string;
  agentLabel: string;
  createdAt: string;
};

/** All snapshots for the current workspace, ordered oldest → newest */
export const snapshotsAtom = atom<Snapshot[]>([]);

/**
 * Index into snapshotsAtom for the frame currently shown in replay mode.
 * -1 means live mode (not replaying).
 */
export const replayIndexAtom = atom<number>(-1);

/** True while the timeline panel is in replay mode (canvas is read-only) */
export const isReplayingAtom = atom<boolean>(false);

/** True while auto-play is running */
export const replayPlayingAtom = atom<boolean>(false);

// ── AI Cursor / Presence ─────────────────────────────────────────────────────

/**
 * The ephemeral cursor element published by the CLI while it's actively
 * drawing. Null means the AI is idle. The browser renders this as a floating
 * label; it is never saved to localStorage or snapshots.
 */
export const oneShotCursorAtom = atom<ExcalidrawElement | null>(null);
