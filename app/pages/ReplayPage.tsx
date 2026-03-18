/**
 * ReplayPage.tsx
 *
 * Route: /r/:roomId/replay
 *
 * Read-only canvas view that loads session history from Supabase and opens
 * the timeline sidebar automatically. No real-time sync connection is
 * established — this page only reads from the snapshots table.
 */
import ExcalidrawApp from "../App";

export default function ReplayPage() {
  // ExcalidrawApp renders the full canvas. The timeline tab auto-opens via
  // the URL — the ReplayPage itself just signals "replay mode" via a query
  // param that TimelinePanel reads on mount to auto-open and load snapshots.
  //
  // We use the same App component so all canvas controls work, but the
  // OneShotSync bridge doesn't push changes back (the canvas is in read-only
  // replay mode once the TimelinePanel sets isReplayingAtom = true).
  return <ExcalidrawApp />;
}
