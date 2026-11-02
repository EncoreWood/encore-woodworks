import { useContext, useEffect, useState } from "react";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { resolveSignedUrl } from "@/components/production/SignedFileViews";
import PdfDocumentViewer from "@/components/PdfViewer";
import PDFAnnotator from "@/components/production/PDFAnnotator";
import { TabsContext } from "@/components/tabs/TabContext";
import { base44 } from "@/api/base44Client";

// Read the tab's own query once, on mount: the tab keeps this PDF even while
// another tab is in front (the browser URL then points at that other tab).
const readParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    name: params.get("name") || "PDF",
    source: params.get("src") || "",
    itemId: params.get("itemId") || "",
    fileIndex: Number.parseInt(params.get("fileIndex") ?? "-1", 10),
  };
};

/**
 * A production card's PDF, opened as a full page inside the app shell so it
 * lives in its own tab under the top toolbars. When the tab knows which card
 * file it is, it opens with the same annotate / comment tools as the card.
 */
export default function PdfViewer() {
  const [{ name, source, itemId, fileIndex }] = useState(readParams);
  const tabs = useContext(TabsContext);
  const { toast } = useToast();

  const [src, setSrc] = useState(() => (/^https?:/i.test(source) ? source : null));
  const [error, setError] = useState(null);
  const [card, setCard] = useState(null);              // { item, index } once resolved
  const [cardChecked, setCardChecked] = useState(!itemId);
  const [userName, setUserName] = useState("");
  const [annotatorOpen, setAnnotatorOpen] = useState(true);

  useEffect(() => {
    if (!source || /^https?:/i.test(source)) return;
    let cancelled = false;
    (async () => {
      try {
        const signed = await resolveSignedUrl(source);
        if (!cancelled) setSrc(signed);
      } catch (e) {
        console.error("Failed to sign PDF url:", e);
        if (!cancelled) setError("This PDF could not be loaded.");
      }
    })();
    return () => { cancelled = true; };
  }, [source]);

  // Load the owning card so this tab can save annotations back onto its file
  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    (async () => {
      try {
        const item = await base44.entities.ProductionItem.get(itemId);
        const files = item?.files || [];
        const index = files[fileIndex]?.url === source
          ? fileIndex
          : files.findIndex((f) => f.url === source);
        if (!cancelled && index >= 0) setCard({ item, index });
      } catch (e) {
        console.error("Failed to load card for this PDF:", e);
      }
      try {
        const user = await base44.auth.me();
        if (!cancelled) setUserName(user?.full_name || user?.email || "");
      } catch { /* anonymous — annotations save without an author name */ }
      if (!cancelled) setCardChecked(true);
    })();
    return () => { cancelled = true; };
  }, [itemId, fileIndex, source]);

  const closeTab = () => {
    setAnnotatorOpen(false);
    if (tabs?.closeTab) tabs.closeTab(tabs.activeId);
  };

  const handleSaveAnnotations = async (annotations) => {
    const files = [...(card.item.files || [])];
    files[card.index] = { ...files[card.index], annotations };
    setCard((c) => ({ ...c, item: { ...c.item, files } }));
    try {
      await base44.entities.ProductionItem.update(card.item.id, { files });
    } catch (e) {
      console.error("Failed to save annotations:", e);
      toast({
        title: "Could not save annotations",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!source) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
        <FileText className="w-6 h-6 text-slate-300" />
        No PDF selected.
      </div>
    );
  }

  // The card's own annotator: same tools, comments and saving as on the card
  if (card && annotatorOpen) {
    return (
      <PDFAnnotator
        open
        onOpenChange={(open) => { if (!open) closeTab(); }}
        pdfUrl={src || source}
        annotations={card.item.files?.[card.index]?.annotations || []}
        onSave={handleSaveAnnotations}
        initialMode="annotate"
        currentUserName={userName}
        roomInfo={{
          projectId: card.item.project_id,
          projectName: card.item.project_name,
          roomName: card.item.room_name,
        }}
      />
    );
  }

  if (!cardChecked) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Opening PDF…
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-200">
      <div className="flex items-center gap-2 px-3 h-10 flex-shrink-0 bg-white border-b border-slate-200">
        <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-800 truncate flex-1">{name}</span>
        {src && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1 flex-shrink-0"
            onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="w-3 h-3" /> Open in new tab
          </Button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {src ? (
          <div className="w-full h-full bg-slate-100 overflow-hidden">
            <PdfDocumentViewer url={src} continuous className="h-full" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">{error}</div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading PDF…
          </div>
        )}
      </div>
    </div>
  );
}