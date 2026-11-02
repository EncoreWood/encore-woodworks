import { useEffect, useState } from "react";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveSignedUrl } from "@/components/production/SignedFileViews";
import PdfDocumentViewer from "@/components/PdfViewer";

// Read the tab's own query once, on mount: the tab keeps this PDF even while
// another tab is in front (the browser URL then points at that other tab).
const readParams = () => {
  const params = new URLSearchParams(window.location.search);
  return { name: params.get("name") || "PDF", source: params.get("src") || "" };
};

/**
 * A production card's PDF, opened as a full page inside the app shell so it
 * lives in its own tab under the top toolbars.
 */
export default function PdfViewer() {
  const [{ name, source }] = useState(readParams);
  const [src, setSrc] = useState(() => (/^https?:/i.test(source) ? source : null));
  const [error, setError] = useState(null);

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

  if (!source) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
        <FileText className="w-6 h-6 text-slate-300" />
        No PDF selected.
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