/**
 * Canvas.tsx
 *
 * Route: /r/:roomId
 *
 * Renders the full Excalidraw canvas. The roomId comes from the URL path;
 * the encryption key and sync adapter come from the URL hash (never sent
 * to the server). useCloudSync reads both when it initialises.
 */
import ExcalidrawApp from "../App";

export default function Canvas() {
  return <ExcalidrawApp />;
}
