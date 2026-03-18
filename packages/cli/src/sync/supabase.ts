import type { SyncAdapter } from "./types.js";

export class SupabaseSync implements SyncAdapter {
  private client: unknown = null;
  private subscription: unknown = null;
  private updateCallback: ((data: unknown) => void) | null = null;

  /**
   * workspaceId is used as the primary key in the "workspaces" table and as
   * the Realtime filter, giving each room its own isolated row.
   *
   * agentId / agentLabel are stored on snapshots so the timeline UI can
   * show who made each change (e.g. "Claude", "Cursor").
   */
  constructor(
    private url: string,
    private key: string,
    private workspaceId: string,
    private agentId: string = "ai",
    private agentLabel: string = "AI",
  ) {}

  async connect() {
    const { createClient } = await import("@supabase/supabase-js");
    this.client = createClient(this.url, this.key);

    // Load current canvas state on connect.
    const { data } = await (this.client as any)
      .from("workspaces")
      .select("elements, app_state")
      .eq("id", this.workspaceId)
      .maybeSingle();

    if (data?.elements?.length) {
      this.updateCallback?.({ elements: data.elements, appState: data.app_state ?? {} });
    }

    // Subscribe via postgres_changes — same mechanism the web app uses.
    // React only to rows the frontend wrote (updated_by === "frontend").
    this.subscription = (this.client as any)
      .channel(`cli-sync-${this.workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspaces",
          filter: `id=eq.${this.workspaceId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (!row || row.updated_by !== "frontend") return;
          if (!row.elements) return;
          this.updateCallback?.({ elements: row.elements, appState: row.app_state ?? {} });
        },
      )
      .subscribe();
  }

  // Upsert the workspaces table — web app listens via postgres_changes for
  // rows where updated_by === "watcher".
  // Also inserts a snapshot row for session history / replay.
  async push(data: any) {
    const client = this.client as any;

    // Inject ephemeral cursor element so the browser can show "AI is drawing"
    const elements = data.elements ?? [];
    const lastEl = elements[elements.length - 1];
    const cursorX = lastEl ? (lastEl.x ?? 0) + (lastEl.width ?? 0) / 2 : 300;
    const cursorY = lastEl ? (lastEl.y ?? 0) - 40 : 100;

    const cursorElement = {
      id: "__oneshot_cursor__",
      type: "text",
      x: cursorX,
      y: cursorY,
      width: 180,
      height: 24,
      angle: 0,
      strokeColor: "#38bdf8",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      roughness: 0,
      opacity: 90,
      text: `● ${this.agentLabel} is drawing…`,
      fontSize: 13,
      fontFamily: 1,
      textAlign: "left",
      verticalAlign: "top",
      containerId: null,
      originalText: `● ${this.agentLabel} is drawing…`,
      autoResize: true,
      lineHeight: 1.25,
      version: 1,
      versionNonce: Date.now(),
      isDeleted: false,
      groupIds: [],
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      customData: { oneshot_type: "cursor", ephemeral: true },
    };

    const { error } = await client
      .from("workspaces")
      .upsert({
        id: this.workspaceId,
        elements: [...elements, cursorElement],
        app_state: data.appState ?? {},
        updated_by: "watcher",
        updated_at: new Date().toISOString(),
      });

    if (error) {
      process.stderr.write(`[oneshot] workspace upsert failed: ${error.message}\n`);
      return;
    }

    // Remove cursor element after 3 s — fire and forget
    setTimeout(() => {
      (client as any)
        .from("workspaces")
        .upsert({
          id: this.workspaceId,
          elements,
          app_state: data.appState ?? {},
          updated_by: "watcher",
          updated_at: new Date().toISOString(),
        })
        .then(() => {});
    }, 3000);

    // Non-fatal: snapshot insert failing doesn't break sync
    const { error: snapError } = await client
      .from("snapshots")
      .insert({
        workspace_id: this.workspaceId,
        elements: data.elements ?? [],
        app_state: data.appState ?? {},
        author: this.agentId,
        agent_label: this.agentLabel,
      });

    if (snapError) {
      // Likely the snapshots table doesn't exist yet — silently ignore
      process.stderr.write(`[oneshot] snapshot insert failed: ${snapError.message}\n`);
    }
  }

  onUpdate(callback: (data: unknown) => void) {
    this.updateCallback = callback;
  }

  async disconnect() {
    await (this.client as any)?.removeAllChannels();
  }
}
