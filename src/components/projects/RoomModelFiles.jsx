import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Box, FileText, Image as ImageIcon, Plus, Trash2, Loader2, ChevronDown } from "lucide-react";
import GlbViewer from "@/components/cad/GlbViewer";

const IMAGE_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;

function detectType(name) {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "glb" || ext === "gltf") return "3d";
  if (ext === "pdf") return "pdf";
  if (IMAGE_RE.test(name)) return "image";
  return "other";
}

function FileChip({ file, onDelete }) {
  const [view3d, setView3d] = useState(false);
  const isImg = file.file_type === "image";
  return (
    <div className="relative group rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="h-16 flex items-center justify-center bg-slate-50">
        {isImg ? (
          <img src={file.file_url} alt={file.label || file.file_name} className="w-full h-full object-cover" />
        ) : file.file_type === "3d" ? (
          <button onClick={() => setView3d(true)} className="flex flex-col items-center justify-center w-full h-full gap-1 text-violet-600 hover:bg-violet-50">
            <Box className="w-5 h-5" />
            <span className="text-[10px] font-medium">View 3D</span>
          </button>
        ) : (
          <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center w-full h-full gap-1 text-red-500 hover:bg-slate-100">
            <FileText className="w-5 h-5" />
            <span className="text-[10px] text-slate-500 truncate px-1 w-full text-center">{file.label || file.file_name}</span>
          </a>
        )}
      </div>
      <p className="text-[10px] text-slate-500 truncate px-1 py-0.5 text-center bg-white border-t border-slate-100">
        {file.label || file.file_name}
      </p>
      <button
        className="absolute top-1 right-1 bg-red-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onDelete}
      >
        <Trash2 className="w-3 h-3" />
      </button>
      {view3d && <GlbViewer file={{ url: file.file_url, name: file.label || file.file_name }} onClose={() => setView3d(false)} />}
    </div>
  );
}

function CategorySection({ project, roomName, roomId, category, label, accept, icon }) {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(null);
  const [pendingLabel, setPendingLabel] = useState("");
  const [open, setOpen] = useState(true);

  const queryKey = ["roomFiles", project.id, roomName];
  const { data: all = [] } = useQuery({
    queryKey,
    queryFn: () => base44.entities.RoomFile.filter({ project_id: project.id }),
    select: (rows) => (rows || []).filter(f => f.room_name?.toLowerCase() === roomName?.toLowerCase() && f.category === category),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.RoomFile.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); setPending(null); setPendingLabel(""); },
  });
  const delMut = useMutation({
    mutationFn: (id) => base44.entities.RoomFile.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPending({ file_url, file_name: file.name, file_type: detectType(file.name) });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const confirm = () => {
    if (!pending) return;
    createMut.mutate({
      project_id: project.id,
      project_name: project.project_name,
      room_name: roomName,
      room_id: roomId || "",
      file_url: pending.file_url,
      file_name: pending.file_name,
      file_type: pending.file_type,
      category,
      label: pendingLabel.trim() || "",
      is_shop_file: false,
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2"
      >
        {icon}
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
        <span className="text-xs text-slate-400">({all.length})</span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 ml-auto transition-transform", open && "rotate-180")} />
        <span onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
          </span>
        </span>
        <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handlePick} />
      </button>

      {open && (
        <div className="px-3 pb-3">
          {all.length === 0 ? (
            <p className="text-xs text-slate-400 py-1">No {label.toLowerCase()} added yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {all.map(f => (
                <FileChip key={f.id} file={f} onDelete={() => { if (confirm("Delete this file?")) delMut.mutate(f.id); }} />
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) { setPending(null); setPendingLabel(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add label (optional)</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500 truncate">{pending?.file_name}</p>
          <Input
            placeholder="e.g. Island Render, Front Elevation"
            value={pendingLabel}
            onChange={(e) => setPendingLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirm()}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setPending(null); setPendingLabel(""); }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={confirm} disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Admin per-room 3D and 2D file sections. Files are stored as RoomFile records
 * (category "3d" / "2d") and are client-visible by default so the client portal
 * can render them in the room view.
 */
export default function RoomModelFiles({ project, roomName, roomId }) {
  return (
    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      <CategorySection
        project={project} roomName={roomName} roomId={roomId}
        category="3d" label="3D Files" accept=".glb,.gltf,.png,.jpg,.jpeg,.pdf"
        icon={<Box className="w-4 h-4 text-violet-500" />}
      />
      <CategorySection
        project={project} roomName={roomName} roomId={roomId}
        category="2d" label="2D Drawings" accept=".png,.jpg,.jpeg,.pdf,.dwg,.dxf"
        icon={<ImageIcon className="w-4 h-4 text-blue-500" />}
      />
    </div>
  );
}