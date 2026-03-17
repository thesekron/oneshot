import { useEffect, useState } from "react";

import { useUIAppState } from "../../context/ui-appState";
import { t } from "../../i18n";
import { useApp } from "../App";
import { Dialog } from "../Dialog";
import { withInternalFallback } from "../hoc/withInternalFallback";

import MermaidToExcalidraw from "./MermaidToExcalidraw";
import TTDDialogTabs from "./TTDDialogTabs";
import { TTDDialogTab } from "./TTDDialogTab";

import "./TTDDialog.scss";

import { TTDWelcomeMessage } from "./TTDWelcomeMessage";

import type {
  MermaidToExcalidrawLibProps,
} from "./types";

export const TTDDialog = (
  props: Record<string, unknown> | { __fallback: true },
) => {
  const appState = useUIAppState();

  if (appState.openDialog?.name !== "ttd") {
    return null;
  }

  return <TTDDialogBase {...props} tab={appState.openDialog.tab} />;
};

TTDDialog.WelcomeMessage = TTDWelcomeMessage;

/**
 * Text to diagram (TTD) dialog
 */
const TTDDialogBase = withInternalFallback(
  "TTDDialogBase",
  ({
    tab,
    ...rest
  }: {
    tab: "text-to-diagram" | "mermaid";
  } & (Record<string, unknown> | { __fallback: true })) => {
    const app = useApp();

    const [mermaidToExcalidrawLib, setMermaidToExcalidrawLib] =
      useState<MermaidToExcalidrawLibProps>({
        loaded: false,
        api: import("@excalidraw/mermaid-to-excalidraw"),
      });

    useEffect(() => {
      const fn = async () => {
        await mermaidToExcalidrawLib.api;
        setMermaidToExcalidrawLib((prev) => ({ ...prev, loaded: true }));
      };
      fn();
    }, [mermaidToExcalidrawLib.api]);

    return (
      <Dialog
        className="ttd-dialog"
        onCloseRequest={() => {
          app.setOpenDialog(null);
        }}
        size={1520}
        title={false}
        {...rest}
        autofocus={false}
      >
        <TTDDialogTabs dialog="ttd" tab={tab}>
          <p className="dialog-mermaid-title">{t("mermaid.title")}</p>
          <TTDDialogTab className="ttd-dialog-content" tab="mermaid">
            <MermaidToExcalidraw
              mermaidToExcalidrawLib={mermaidToExcalidrawLib}
              isActive={tab === "mermaid"}
            />
          </TTDDialogTab>
        </TTDDialogTabs>
      </Dialog>
    );
  },
);
