import { DefaultSidebar, Sidebar } from "@oneshot/excalidraw";
import { useUIAppState } from "@oneshot/excalidraw/context/ui-appState";

import "./AppSidebar.scss";
import { OneShotPanel } from "./OneShotPanel";

export const AppSidebar = () => {
  const { openSidebar } = useUIAppState();

  return (
    <DefaultSidebar>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab="oneshot"
          style={{
            opacity: openSidebar?.tab === "oneshot" ? 1 : 0.4,
          }}
          title="OneShot – AI collaboration"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 100 100">
            <path fillRule="evenodd" d="M50,8 A42,42,0,1,1,50,92 A42,42,0,1,1,50,8 Z M50,28 A22,22,0,1,0,50,72 A22,22,0,1,0,50,28 Z" fill="currentColor"/>
          </svg>
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="oneshot">
        <OneShotPanel />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
