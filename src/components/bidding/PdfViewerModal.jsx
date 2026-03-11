import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function PdfViewerModal({ open, onClose, url, name }) {
  if (!url) return null;

  // Use Google Docs viewer for cross-device inline viewing without download prompts
  const embedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base truncate pr-4">{name || "Plan Document"}</DialogTitle>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 flex-shrink-0">
                <ExternalLink className="w-3.5 h-3.5" /> Open in Tab
              </Button>
            </a>
          </div>
        </DialogHeader>
        <div className="flex-1 bg-slate-100 overflow-hidden">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title={name || "PDF Viewer"}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}