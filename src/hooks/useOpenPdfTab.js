import { useContext } from "react";
import { TabsContext } from "@/components/tabs/TabContext";

/**
 * Path for a PDF opened in its own tab under the top toolbars. When the card the
 * file belongs to is known, the tab carries its id + file index so the tab can
 * annotate and comment exactly like the card does.
 */
export function pdfTabPath(file, item) {
  const params = new URLSearchParams();
  params.set("name", file?.name || "PDF");
  params.set("src", file?.url || "");
  if (item?.id) {
    params.set("itemId", item.id);
    const idx = (item.files || []).findIndex((f) => f.url === file?.url);
    if (idx >= 0) params.set("fileIndex", String(idx));
  }
  return `/PdfViewer?${params.toString()}`;
}

/**
 * Opens a card's PDF as its own tab, so you can switch to another tab and come
 * back with the PDF still open and scrolled where you left it.
 */
export function useOpenPdfTab() {
  const tabs = useContext(TabsContext);

  return (file, item) => {
    if (!file?.url) return;
    if (tabs?.openTab) {
      tabs.openTab(pdfTabPath(file, item));
      return;
    }
    // Outside the tab shell — fall back to a plain browser tab.
    window.open(file.url, "_blank", "noopener,noreferrer");
  };
}