import type { SyncAdapter } from "./types.js";

export class AblySync implements SyncAdapter {
  private client: unknown = null;
  private channel: unknown = null;
  private updateCallback: ((data: unknown) => void) | null = null;

  /** channelName should be room-specific, e.g. "oneshot-<roomId>" */
  constructor(private apiKey: string, private channelName: string) {}

  async connect() {
    const Ably = await import("ably");
    this.client = new (Ably as any).Realtime({
      key: this.apiKey,
      clientId: "watcher",
    });

    // Rewind:1 delivers the last message on subscribe so the agent gets
    // the current canvas state without a separate fetch.
    this.channel = (this.client as any).channels.get(this.channelName, {
      params: { rewind: "1" },
    });

    await new Promise<void>((resolve, reject) => {
      (this.client as any).connection.once("connected", resolve);
      (this.client as any).connection.once("failed", reject);
    });

    // Event name matches the web app ("canvas-update", not "canvas:update").
    // Ignore our own echoed publishes (source === "watcher").
    (this.channel as any).subscribe("canvas-update", (msg: any) => {
      const data = msg.data as { source?: string; payload?: unknown } | null;
      if (!data || data.source !== "frontend") return;
      if (this.updateCallback && data.payload) {
        this.updateCallback(data.payload);
      }
    });
  }

  // Wrap in the same envelope the web app expects from a watcher.
  async push(data: unknown) {
    await (this.channel as any).publish("canvas-update", {
      source: "watcher",
      payload: data,
    });
  }

  onUpdate(callback: (data: unknown) => void) {
    this.updateCallback = callback;
  }

  async disconnect() {
    (this.client as any)?.close();
  }
}
