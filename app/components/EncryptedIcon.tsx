import { Tooltip } from "@oneshot/excalidraw/components/Tooltip";
import { shield } from "@oneshot/excalidraw/components/icons";
import { useI18n } from "@oneshot/excalidraw/i18n";

export const EncryptedIcon = () => {
  const { t } = useI18n();

  return (
    <a
      className="encrypted-icon tooltip"
      href="https://oneshot.app/docs"
      target="_blank"
      rel="noopener"
      aria-label={t("encrypted.link")}
    >
      <Tooltip label={t("encrypted.tooltip")} long={true}>
        {shield}
      </Tooltip>
    </a>
  );
};
