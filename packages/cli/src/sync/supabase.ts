import type { SyncAdapter } from "./types.js";

export class SupabaseSync implements SyncAdapter {
  private client: unknown = null;
  private subscription: unknown = null;
  private updateCallback: ((data: unknown) => void) | null = null;

  /**
   * workspaceId is used as the primary key in the "workspaces" table and as
   * the Realtime filter, giving each room its own isolated row.
   */
  constructor(private url: string, private key: string, private workspaceId: string) {}

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
  async push(data: any) {
    await (this.client as any)
      .from("workspaces")
      .upsert({
        id: this.workspaceId,
        elements: data.elements ?? [],
        app_state: data.appState ?? {},
        updated_by: "watcher",
        updated_at: new Date().toISOString(),
      });
  }

  onUpdate(callback: (data: unknown) => void) {
    this.updateCallback = callback;
  }

  async disconnect() {
    await (this.client as any)?.removeAllChannels();
  }
}
