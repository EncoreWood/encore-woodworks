import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { resolveSignedUrl } from "@/components/production/SignedFileViews";

/**
 * In-app PDF viewer — opens a card's PDF in a modal instead of a new browser tab.
 * Public file URLs load directly; privately-stored file_uris get signed first.
 */
export default function PdfFileDialog({ file, onClose }) {
  const [src, setSrc] = useState(() => (/^https?:/i.test(file?.url || "") ? file.url : null));

  useEffect(() => {
    if (!file) return;
    if (/^https?:/i.test(file.url || "")) { setSrc(file.url); return; }
    let cancelled = false;
    setSrc(null);
    (async () => {
      try {
        const signed = await resolveSignedUrl(file.url);
        if (!cancelled) setSrc(signed);
      } catch (e) {
        console.error("Failed to sign PDF url:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  if (!file) return null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-slate-200 flex-row items-center justify-between space-y-0 flex-shrink-0">
          <DialogTitle className="text-sm font-medium flex items-center gap-2 truncate pr-8">
            <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="truncate">{file.name || "PDF"}</span>
          </DialogTitle>
          {src && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 mr-8"
              onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="w-3 h-3" /> Open in new tab
            </Button>
          )}
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-slate-200">
          {src ? (
            <iframe src={src} title={file.name || "PDF"} className="w-full h-full border-0 bg-white" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading PDF…
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}