import { useContext } from "react";
import { TabsContext } from "@/components/tabs/TabContext";

/** Path for a PDF opened in its own tab under the top toolbars. */
export function pdfTabPath(file) {
  const params = new URLSearchParams();
  params.set("name", file?.name || "PDF");
  params.set("src", file?.url || "");
  return `/PdfViewer?${params.toString()}`;
}

/**
 * Opens a card's PDF as its own tab, so you can switch to another tab and come
 * back with the PDF still open and scrolled where you left it.
 */
export function useOpenPdfTab() {
  const tabs = useContext(TabsContext);

  return (file) => {
    if (!file?.url) return;
    if (tabs?.openTab) {
      tabs.openTab(pdfTabPath(file));
      return;
    }
    // Outside the tab shell — fall back to a plain browser tab.
    window.open(file.url, "_blank", "noopener,noreferrer");
  };
}