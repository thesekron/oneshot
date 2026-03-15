export interface SyncAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  push(data: unknown): Promise<void>;
  onUpdate(callback: (data: unknown) => void): void;
}
