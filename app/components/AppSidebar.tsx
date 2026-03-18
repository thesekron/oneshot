import { DefaultSidebar, Sidebar } from "@oneshot/excalidraw";
import { useUIAppState } from "@oneshot/excalidraw/context/ui-appState";

import "./AppSidebar.scss";
import { OneShotPanel } from "./OneShotPanel";
import { TimelinePanel } from "./TimelinePanel";

export const AppSidebar = () => {
  const { openSidebar } = useUIAppState();

  return (
    <DefaultSidebar>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab="oneshot"
          style={{
            opacity: openSidebar?.tab === "oneshot" ? 1 : 0.4,
            fontSize: "16px",
          }}
          title="OneShot – AI collaboration"
        >
          ⚡
        </Sidebar.TabTrigger>
        <Sidebar.TabTrigger
          tab="timeline"
          style={{
            opacity: openSidebar?.tab === "timeline" ? 1 : 0.4,
            fontSize: "16px",
          }}
          title="Session history &amp; replay"
        >
          ⏱
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="oneshot">
        <OneShotPanel />
      </Sidebar.Tab>
      <Sidebar.Tab tab="timeline">
        <TimelinePanel />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
