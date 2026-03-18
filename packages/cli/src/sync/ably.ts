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
  // Injects an ephemeral cursor element so the browser shows "AI is drawing".
  async push(data: any) {
    const elements = data?.elements ?? [];
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
      text: "● AI is drawing…",
      fontSize: 13,
      fontFamily: 1,
      textAlign: "left",
      verticalAlign: "top",
      containerId: null,
      originalText: "● AI is drawing…",
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

    await (this.channel as any).publish("canvas-update", {
      source: "watcher",
      payload: { ...data, elements: [...elements, cursorElement] },
    });

    // Remove cursor after 3 s
    setTimeout(async () => {
      try {
        await (this.channel as any).publish("canvas-update", {
          source: "watcher",
          payload: { ...data, elements },
        });
      } catch {
        // ignore cleanup errors
      }
    }, 3000);
  }

  onUpdate(callback: (data: unknown) => void) {
    this.updateCallback = callback;
  }

  async disconnect() {
    (this.client as any)?.close();
  }
}
