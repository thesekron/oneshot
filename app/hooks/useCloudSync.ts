/**
 * useCloudSync.ts
 *
 * Universal React hook that abstracts the active cloud-sync strategy.
 *
 * Credential resolution order (highest priority first):
 *   1. URL hash params  — set by `npx oneshot start`, e.g.
 *        /#sync=ably&key=<key>&ch=oneshot-<roomId>
 *        /#sync=supabase&url=<url>&anonkey=<key>&workspace=<roomId>
 *      The hash is never sent to the server, so credentials are browser-only.
 *   2. Build-time VITE env vars — for hosted / shared deployments.
 *
 * This lets every user bring their own Ably / Supabase account while keeping
 * all canvas data off OneShot servers (privacy by design).
 *
 * Modes
 *   relay    – Ably Realtime pub/sub  (ephemeral)
 *   database – Supabase Realtime+PG   (persistent)
 *
 * Anti-loop strategy
 *   relay    – each message carries a "source" tag; the hook ignores messages
 *              where source === "frontend" (its own publishes echoed back).
 *   database – the hook only reacts to rows where updated_by === "watcher";
 *              its own upserts use updated_by === "frontend".
 */

import { useCallback, useEffect, useRef } from "react";
import {
  CaptureUpdateAction,
  reconcileElements,
  useExcalidrawAPI,
} from "@oneshot/excalidraw";
import {
  bumpElementVersions,
  restoreElements,
} from "@oneshot/excalidraw/data/restore";
import { debounce } from "@oneshot/common";
import type { AppState, BinaryFiles } from "@oneshot/excalidraw/types";
import type { OrderedExcalidrawElement } from "@oneshot/element/types";
import type { RemoteExcalidrawElement } from "@oneshot/excalidraw/data/reconcile";

import { appJotaiStore } from "app/app-jotai";
import { oneShotSyncStatusAtom } from "../oneshot-jotai";

// ── Credential resolution ──────────────────────────────────────────────────
// Supports two URL formats (both keep credentials in the hash, off the server):
//
//   New (path-based):  /r/:roomId#sync=ably&key=<key>
//   Legacy (hash):     /#sync=ably&key=<key>&ch=oneshot-<roomId>
//
// Called once per hook mount (via useRef) so SPA navigation to a new room
// gets fresh config on remount.

function resolveConfig() {
  const hash =
    typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  const p = new URLSearchParams(hash);

  // Extract roomId from path /r/:roomId (new format)
  const pathMatch =
    typeof window !== "undefined"
      ? window.location.pathname.match(/^\/r\/([^/]+)/)
      : null;
  const roomIdFromPath = pathMatch?.[1];

  const syncFromHash = p.get("sync") ?? undefined;

  if (syncFromHash === "ably") {
    // New format: ch derived from path roomId; legacy: ch from hash param
    const ch =
      p.get("ch") ??
      (roomIdFromPath ? `oneshot-${roomIdFromPath}` : "oneshot-canvas");
    return {
      SYNC_MODE: "relay" as const,
      ABLY_KEY: p.get("key") ?? undefined,
      ABLY_CHANNEL: ch,
      SB_URL: undefined,
      SB_ANON: undefined,
      SB_WORKSPACE: undefined,
    };
  }

  if (syncFromHash === "supabase") {
    // New format: workspace from path roomId; legacy: workspace from hash param
    return {
      SYNC_MODE: "database" as const,
      ABLY_KEY: undefined,
      ABLY_CHANNEL: undefined,
      SB_URL: p.get("url") ?? undefined,
      SB_ANON: p.get("anonkey") ?? undefined,
      SB_WORKSPACE: p.get("workspace") ?? roomIdFromPath ?? "default",
    };
  }

  // Fall back to build-time env vars for hosted / shared deployments.
  return {
    SYNC_MODE: import.meta.env.VITE_APP_SYNC_MODE as string | undefined,
    ABLY_KEY: import.meta.env.VITE_APP_ABLY_API_KEY as string | undefined,
    ABLY_CHANNEL:
      (import.meta.env.VITE_APP_ABLY_CHANNEL as string | undefined) ??
      "oneshot-canvas",
    SB_URL: import.meta.env.VITE_APP_SUPABASE_URL as string | undefined,
    SB_ANON: import.meta.env.VITE_APP_SUPABASE_ANON_KEY as string | undefined,
    SB_WORKSPACE:
      (import.meta.env.VITE_APP_SUPABASE_WORKSPACE_ID as string | undefined) ??
      "default",
  };
}

const DEBOUNCE_MS = 600;
const ANTI_LOOP_MS = 400;

export type SaveFn = (
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
) => void;

// ── Shared: reconcile + apply remote elements ──────────────────────────────

function applyRemoteElements(
  api: NonNullable<ReturnType<typeof useExcalidrawAPI>>,
  remote: RemoteExcalidrawElement[],
  lastExternal: React.MutableRefObject<number>,
): void {
  if (!remote.length) return;

  const appState = api.getAppState();
  const local =
    api.getSceneElementsIncludingDeleted() as OrderedExcalidrawElement[];

  const restored = restoreElements(
    remote,
    local,
  ) as RemoteExcalidrawElement[];
  const reconciled = reconcileElements(local, restored, appState);
  const bumped = bumpElementVersions(reconciled, local);

  lastExternal.current = Date.now();
  api.updateScene({ elements: bumped, captureUpdate: CaptureUpdateAction.NEVER });
  appJotaiStore.set(oneShotSyncStatusAtom, "idle");
}

// ── Main hook ──────────────────────────────────────────────────────────────

export function useCloudSync(): SaveFn {
  const excalidrawAPI = useExcalidrawAPI();
  const lastExternalUpdateTime = useRef(0);

  // Resolve config once per mount so navigating to a new room gets fresh creds.
  const { SYNC_MODE, ABLY_KEY, ABLY_CHANNEL, SB_URL, SB_ANON, SB_WORKSPACE } =
    useRef(resolveConfig()).current;

  // Refs for the live connection objects so the save callback can reuse them
  // without recreating clients on every render.
  const ablyChannelRef = useRef<import("ably").RealtimeChannel | null>(null);
  const supabaseRef = useRef<
    import("@supabase/supabase-js").SupabaseClient | null
  >(null);

  // ── Relay mode (Ably) ──────────────────────────────────────────────────
  useEffect(() => {
    if (SYNC_MODE !== "relay" || !ABLY_KEY || !excalidrawAPI) return;

    let ablyClient: import("ably").Realtime | null = null;

    (async () => {
      appJotaiStore.set(oneShotSyncStatusAtom, "loading");

      const Ably = (await import("ably")).default;
      ablyClient = new Ably.Realtime({ key: ABLY_KEY, clientId: "frontend" });

      const channel = ablyClient.channels.get(ABLY_CHANNEL, {
        // Rewind delivers the last published message on subscribe so the
        // canvas is populated immediately without a separate fetch.
        params: { rewind: "1" },
      });

      ablyChannelRef.current = channel;

      await channel.subscribe("canvas-update", (msg) => {
        // Ignore our own publishes echoed back from Ably
        if ((msg.data as { source?: string } | null)?.source !== "watcher") {
          return;
        }

        const payload = (
          msg.data as { payload?: { elements?: RemoteExcalidrawElement[] } }
        )?.payload;
        if (!payload?.elements) return;

        appJotaiStore.set(oneShotSyncStatusAtom, "loading");
        applyRemoteElements(excalidrawAPI, payload.elements, lastExternalUpdateTime);
      });

      ablyClient.connection.on("connected", () => {
        console.log("[OneShot] Ably connected");
        appJotaiStore.set(oneShotSyncStatusAtom, "idle");
      });
      ablyClient.connection.on("failed", () => {
        appJotaiStore.set(oneShotSyncStatusAtom, "error");
      });
    })();

    return () => {
      ablyChannelRef.current = null;
      ablyClient?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!excalidrawAPI]);

  // ── Database mode (Supabase) ───────────────────────────────────────────
  useEffect(() => {
    if (SYNC_MODE !== "database" || !SB_URL || !SB_ANON || !excalidrawAPI) {
      return;
    }

    let subscription: ReturnType<
      import("@supabase/supabase-js").SupabaseClient["channel"]
    > | null = null;

    (async () => {
      appJotaiStore.set(oneShotSyncStatusAtom, "loading");

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(SB_URL, SB_ANON);
      supabaseRef.current = supabase;

      // Load current canvas state from DB on mount
      const { data, error } = await supabase
        .from("workspaces")
        .select("elements, app_state")
        .eq("id", SB_WORKSPACE)
        .maybeSingle();

      if (!error && data?.elements?.length) {
        applyRemoteElements(
          excalidrawAPI,
          data.elements as RemoteExcalidrawElement[],
          lastExternalUpdateTime,
        );
      } else {
        appJotaiStore.set(oneShotSyncStatusAtom, "idle");
      }

      // Subscribe to watcher updates only (updated_by === "watcher")
      subscription = supabase
        .channel("frontend-sync")
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          {
            event: "*",
            schema: "public",
            table: "workspaces",
            filter: `id=eq.${SB_WORKSPACE}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new;
            if (!row || (row.updated_by as string) !== "watcher") return;
            if (!row.elements) return;

            appJotaiStore.set(oneShotSyncStatusAtom, "loading");
            applyRemoteElements(
              excalidrawAPI,
              row.elements as RemoteExcalidrawElement[],
              lastExternalUpdateTime,
            );
          },
        )
        .subscribe();
    })();

    return () => {
      subscription?.unsubscribe();
      supabaseRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!excalidrawAPI]);

  // ── Stable save function (returned to caller) ──────────────────────────
  return useCallback(
    debounce(
      async (elements: readonly OrderedExcalidrawElement[], appState: AppState) => {
        // Anti-loop: skip if we recently applied a remote update
        if (Date.now() - lastExternalUpdateTime.current < ANTI_LOOP_MS) return;

        const filtered = (elements ?? []).filter((el) => !el.isDeleted);
        const appStateSnapshot = {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize ?? null,
        };

        // ── relay ──
        if (SYNC_MODE === "relay" && ablyChannelRef.current) {
          try {
            appJotaiStore.set(oneShotSyncStatusAtom, "saving");
            await ablyChannelRef.current.publish("canvas-update", {
              source: "frontend",
              payload: {
                type: "excalidraw",
                version: 2,
                elements: filtered,
                appState: appStateSnapshot,
                files: {},
              },
            });
            appJotaiStore.set(oneShotSyncStatusAtom, "idle");
          } catch (err) {
            console.warn("[OneShot] Ably publish failed:", err);
            appJotaiStore.set(oneShotSyncStatusAtom, "error");
          }
          return;
        }

        // ── database ──
        if (SYNC_MODE === "database" && supabaseRef.current) {
          try {
            appJotaiStore.set(oneShotSyncStatusAtom, "saving");
            const { error } = await supabaseRef.current
              .from("workspaces")
              .upsert({
                id: SB_WORKSPACE,
                elements: filtered,
                app_state: appStateSnapshot,
                updated_by: "frontend",
                updated_at: new Date().toISOString(),
              });
            if (error) throw error;
            appJotaiStore.set(oneShotSyncStatusAtom, "idle");
          } catch (err) {
            console.warn("[OneShot] Supabase upsert failed:", err);
            appJotaiStore.set(oneShotSyncStatusAtom, "error");
          }
        }
      },
      DEBOUNCE_MS,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}
