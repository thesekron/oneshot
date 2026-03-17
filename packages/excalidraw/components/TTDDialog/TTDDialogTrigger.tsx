import { useTunnels } from "../../context/tunnels";
import { useExcalidrawSetAppState } from "../App";
import DropdownMenu from "../dropdownMenu/DropdownMenu";

import type { JSX, ReactNode } from "react";

const OneShotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 100 100">
    <path fillRule="evenodd" d="M50,8 A42,42,0,1,1,50,92 A42,42,0,1,1,50,8 Z M50,28 A22,22,0,1,0,50,72 A22,22,0,1,0,50,28 Z" fill="currentColor"/>
  </svg>
);

export const TTDDialogTrigger = ({
  children,
  icon,
}: {
  children?: ReactNode;
  icon?: JSX.Element;
}) => {
  const { TTDDialogTriggerTunnel } = useTunnels();
  const setAppState = useExcalidrawSetAppState();

  return (
    <TTDDialogTriggerTunnel.In>
      <DropdownMenu.Item
        onSelect={() => {
          setAppState({
            openSidebar: { name: "default", tab: "oneshot" },
          });
        }}
        icon={icon ?? <OneShotIcon />}
      >
        {children ?? "OneShot Prompt"}
      </DropdownMenu.Item>
    </TTDDialogTriggerTunnel.In>
  );
};
TTDDialogTrigger.displayName = "TTDDialogTrigger";
