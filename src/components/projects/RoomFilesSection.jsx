import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Loader2, X, ZoomIn } from "lucide-react";

function LightboxModal({ file, onClose }) {
  if (!file) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-5xl max-h-full" onClick={e => e.stopPropagation()}>
        <img src={file.file_url} alt={file.label || file.file_name} className="max-h-[90vh] max-w-full rounded-xl object-contain" />
        <button className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
        {file.label && <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">{file.label}</p>}
      </div>
    </div>
  );
}

function PdfModal({ file, onClose }) {
  if (!file) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
          <p className="text-sm font-medium text-slate-700 truncate">{file.label || file.file_name}</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-200"><X className="w-4 h-4" /></button>
        </div>
        <iframe src={file.file_url} title={file.file_name} className="flex-1 w-full border-none" />
      </div>
    </div>
  );
}

export default function RoomFilesSection({ project, roomName, roomId }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // { file_url, file_name, file_type }
  const [label, setLabel] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [pdfViewer, setPdfViewer] = useState(null);

  const queryKey = ["roomFiles", project.id, roomName];

  const { data: files = [] } = useQuery({
    queryKey,
    queryFn: () => base44.entities.RoomFile.filter({ project_id: project.id }),
    select: (all) => all.filter(f => f.room_name?.toLowerCase() === roomName?.toLowerCase()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RoomFile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RoomFile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setPendingFile(null);
      setLabel("");
    },
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const ext = file.name.toLowerCase().split('.').pop();
    const file_type = ext === "pdf" ? "pdf" : "image";
    setUploading(false);
    setPendingFile({ file_url, file_name: file.name, file_type });
    e.target.value = "";
  };

  const handleConfirmUpload = () => {
    if (!pendingFile) return;
    createMutation.mutate({
      project_id: project.id,
      project_name: project.project_name,
      room_name: roomName,
      room_id: roomId || "",
      file_url: pendingFile.file_url,
      file_name: pendingFile.file_name,
      file_type: pendingFile.file_type,
      label: label.trim() || "",
    });
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Room Files ({files.length})</p>
        <div>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFileChange} />
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs gap-1"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add File
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((f) => (
            <div key={f.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
              {f.file_type === "image" ? (
                <button className="w-full" onClick={() => setLightbox(f)}>
                  <img src={f.file_url} alt={f.label || f.file_name} className="w-full h-16 object-cover hover:opacity-90 transition-opacity" />
                </button>
              ) : (
                <button className="w-full h-16 flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition-colors" onClick={() => setPdfViewer(f)}>
                  <FileText className="w-5 h-5 text-red-500" />
                  <span className="text-xs text-slate-500 truncate px-1 w-full text-center">{f.label || f.file_name}</span>
                </button>
              )}
              {f.label && f.file_type === "image" && (
                <p className="text-xs text-slate-500 px-1 py-0.5 truncate text-center bg-white border-t border-slate-100">{f.label}</p>
              )}
              <button
                className="absolute top-1 right-1 bg-red-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => { if (confirm("Delete this file?")) deleteMutation.mutate(f.id); }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Label prompt dialog */}
      <Dialog open={!!pendingFile} onOpenChange={(open) => { if (!open) { setPendingFile(null); setLabel(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Label (optional)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">{pendingFile?.file_name}</p>
          <Input
            placeholder='e.g. "Front Elevation", "Countertop Drawing"'
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleConfirmUpload()}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setPendingFile(null); setLabel(""); }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleConfirmUpload} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {lightbox && <LightboxModal file={lightbox} onClose={() => setLightbox(null)} />}
      {pdfViewer && <PdfModal file={pdfViewer} onClose={() => setPdfViewer(null)} />}
    </div>
  );
}