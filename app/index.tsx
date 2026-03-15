import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

import "../app/sentry";

import ExcalidrawApp from "./App";
import Landing from "./pages/Landing";
import Canvas from "./pages/Canvas";
import Docs from "./pages/Docs";

window.__EXCALIDRAW_SHA__ = import.meta.env.VITE_APP_GIT_SHA;
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);
registerSW();
root.render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Landing — also handles legacy /#sync=... hash URLs via ExcalidrawApp */}
        <Route path="/" element={<HomeRouter />} />
        {/* Canvas room: /r/:roomId#sync=...&key=... */}
        <Route path="/r/:roomId" element={<Canvas />} />
        {/* Docs */}
        <Route path="/docs" element={<Docs />} />
        {/* Fallback: render full app (e.g. /#json=... share links) */}
        <Route path="*" element={<ExcalidrawApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);

/**
 * At "/" show the Landing page, but if the URL hash contains sync credentials
 * (legacy CLI format: /#sync=ably&key=...) fall through to the full app so
 * existing sessions keep working without a redirect.
 */
function HomeRouter() {
  const hasLegacySync = window.location.hash.includes("sync=");
  return hasLegacySync ? <ExcalidrawApp /> : <Landing />;
}
