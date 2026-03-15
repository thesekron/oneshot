import type { AppState, BinaryFiles } from "@oneshot/excalidraw/types";
import type { OrderedExcalidrawElement } from "@oneshot/element/types";

import { atom } from "app/app-jotai";

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
