import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download } from "lucide-react";
import PdfViewer from "@/components/PdfViewer";

const getFileType = (url, name) => {
  const ext = (name || url || "").toLowerCase().split(".").pop();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "other";
};

export default function ProjectFilePreviewDialog({ file, onClose, elevated = false }) {
  const fileType = file ? getFileType(file.url, file.name) : "other";

  return (
    <Dialog open={!!file} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className={`max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden ${elevated ? "z-[10000]" : ""}`}>
        {file && (
          <>
            <DialogHeader className="px-5 py-3 border-b border-slate-200">
              <DialogTitle className="text-sm font-semibold text-slate-800 truncate pr-6">
                {file.name}
              </DialogTitle>
            </DialogHeader>

            <div className="bg-slate-100 flex items-center justify-center overflow-auto" style={{ height: "75vh" }}>
              {fileType === "image" && (
                <img src={file.url} alt={file.name} className="max-h-full max-w-full object-contain" />
              )}
              {fileType === "pdf" && (
                <div className="w-full h-full bg-white">
                  <PdfViewer url={file.url} continuous />
                </div>
              )}
              {fileType === "other" && (
                <div className="text-center p-8">
                  <p className="text-sm text-slate-600 mb-3">
                    This file type can't be previewed here.
                  </p>
                  <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" /> Open file
                    </a>
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-white">
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
                </a>
              </Button>
              <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                <a href={file.url} download={file.name}>
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}