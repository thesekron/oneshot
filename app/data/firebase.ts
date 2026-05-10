import { ExcalidrawError } from "@oneshot/excalidraw/errors";

import type { RemoteExcalidrawElement } from "@oneshot/excalidraw/data/reconcile";
import type {
  ExcalidrawElement,
  FileId,
  OrderedExcalidrawElement,
} from "@oneshot/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFileMetadata,
  DataURL,
} from "@oneshot/excalidraw/types";

// Firebase features are not supported in OneShot.
// This module provides stubbed versions of the APIs to not break Collab.tsx and App.tsx.

export const isSavedToFirebase = (
  portal: any,
  elements: readonly ExcalidrawElement[],
): boolean => {
  return true;
};

export const saveToFirebase = async (
  portal: any,
  elements: readonly ExcalidrawElement[],
  appState: AppState,
) => {
  return false;
};

export const loadFromFirebase = async (
  roomId: string,
  roomKey: string,
  socket: any,
): Promise<{
  elements: readonly OrderedExcalidrawElement[];
  appState: AppState | null;
} | null> => {
  return null;
};

export const loadFilesFromFirebase = async (
  prefix: string,
  decryptionKey: string,
  filesIds: readonly FileId[],
) => {
  return {
    loadedFiles: [],
    erroredFiles: new Map(),
  };
};

export const saveFilesToFirebase = async ({
  prefix,
  files,
}: {
  prefix: string;
  files: { id: FileId; buffer: Uint8Array }[];
}) => {
  return {
    savedFiles: new Map(),
    erroredFiles: new Map(),
  };
};
