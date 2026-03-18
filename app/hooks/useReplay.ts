/**
 * useReplay.ts
 *
 * Manages session replay state: loading snapshots from Supabase,
 * seeking to a specific frame, and auto-playing the timeline.
 *
 * Replay mode replaces the live canvas with a read-only historical view.
 * Exiting replay restores the live canvas state.
 */

import { useCallback, useEffect, useRef } from "react";
import { CaptureUpdateAction, useExcalidrawAPI } from "@oneshot/excalidraw";
import { restoreElements } from "@oneshot/excalidraw/data/restore";
import type { RemoteExcalidrawElement } from "@oneshot/excalidraw/data/reconcile";

import { appJotaiStore } from "../app-jotai";
import {
  snapshotsAtom,
  replayIndexAtom,
  isReplayingAtom,
  replayPlayingAtom,
  type Snapshot,
} from "../oneshot-jotai";

// ms between frames during auto-play
const PLAY_INTERVAL_MS = 400;

function resolveWorkspaceId(): string | null {
  const pathMatch = window.location.pathname.match(/^\/r\/([^/]+)/);
  if (pathMatch?.[1]) return pathMatch[1];

  const hash = window.location.hash.slice(1);
  const p = new URLSearchParams(hash);
  return p.get("workspace") ?? null;
}

function resolveSupabaseCredentials(): {
  url: string | null;
  anonKey: string | null;
} {
  const hash = window.location.hash.slice(1);
  const p = new URLSearchParams(hash);

  if (p.get("sync") === "supabase") {
    return {
      url: p.get("url"),
      anonKey: p.get("anonkey"),
    };
  }

  return {
    url: import.meta.env.VITE_APP_SUPABASE_URL ?? null,
    anonKey: import.meta.env.VITE_APP_SUPABASE_ANON_KEY ?? null,
  };
}

export function useReplay() {
  const excalidrawAPI = useExcalidrawAPI();
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load snapshots from Supabase ────────────────────────────────────────

  const loadSnapshots = useCallback(async () => {
    const workspaceId = resolveWorkspaceId();
    if (!workspaceId) return;

    const { url, anonKey } = resolveSupabaseCredentials();
    if (!url || !anonKey) return;

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, anonKey);

      const { data, error } = await supabase
        .from("snapshots")
        .select("id, elements, app_state, author, agent_label, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[OneShot] Failed to load snapshots:", error.message);
        return;
      }

      const snapshots: Snapshot[] = (data ?? []).map((row: any) => ({
        id: row.id,
        elements: row.elements ?? [],
        appState: row.app_state ?? { viewBackgroundColor: "#0f172a", gridSize: null },
        author: row.author ?? "ai",
        agentLabel: row.agent_label ?? "AI",
        createdAt: row.created_at,
      }));

      appJotaiStore.set(snapshotsAtom, snapshots);
    } catch (err) {
      console.warn("[OneShot] Snapshot load error:", err);
    }
  }, []);

  // ── Seek to a specific snapshot index ───────────────────────────────────

  const seekTo = useCallback(
    (index: number) => {
      if (!excalidrawAPI) return;

      const snapshots = appJotaiStore.get(snapshotsAtom);
      if (index < 0 || index >= snapshots.length) return;

      const snapshot = snapshots[index];

      const restored = restoreElements(
        snapshot.elements as RemoteExcalidrawElement[],
        null,
        { repairBindings: false, deleteInvisibleElements: false },
      );

      excalidrawAPI.updateScene({
        elements: restored,
        appState: {
          viewBackgroundColor: snapshot.appState.viewBackgroundColor,
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      });

      appJotaiStore.set(replayIndexAtom, index);
      appJotaiStore.set(isReplayingAtom, true);
    },
    [excalidrawAPI],
  );

  // ── Play / Pause ─────────────────────────────────────────────────────────

  const play = useCallback(() => {
    appJotaiStore.set(replayPlayingAtom, true);

    playTimerRef.current = setInterval(() => {
      const snapshots = appJotaiStore.get(snapshotsAtom);
      const current = appJotaiStore.get(replayIndexAtom);
      const next = current + 1;

      if (next >= snapshots.length) {
        // Reached the end — stop auto-play
        if (playTimerRef.current) clearInterval(playTimerRef.current);
        appJotaiStore.set(replayPlayingAtom, false);
        return;
      }

      seekTo(next);
    }, PLAY_INTERVAL_MS);
  }, [seekTo]);

  const pause = useCallback(() => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    appJotaiStore.set(replayPlayingAtom, false);
  }, []);

  // ── Exit replay — restore live canvas ────────────────────────────────────

  const exitReplay = useCallback(() => {
    pause();
    appJotaiStore.set(isReplayingAtom, false);
    appJotaiStore.set(replayIndexAtom, -1);
    appJotaiStore.set(replayPlayingAtom, false);
    // The live canvas will re-sync on the next onChange or remote update
  }, [pause]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  return { loadSnapshots, seekTo, play, pause, exitReplay };
}
