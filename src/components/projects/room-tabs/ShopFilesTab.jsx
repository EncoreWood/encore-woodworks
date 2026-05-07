import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Trash2, Loader2, Download, Factory } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ShopFilesTab({ project, roomName, roomId, currentUser }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [label, setLabel] = useState("");
  const [shopNote, setShopNote] = useState("");
  const [shopNoteId, setShopNoteId] = useState(null);
  const [noteLoaded, setNoteLoaded] = useState(false);

  const filesQK = ["roomFiles", project.id, roomName, "shop"];

  const { data: files = [] } = useQuery({
    queryKey: filesQK,
    queryFn: () => base44.entities.RoomFile.filter({ project_id: project.id }),
    select: all => all.filter(f => f.room_name?.toLowerCase() === roomName?.toLowerCase() && f.is_shop_file === true)
  });

  // Load internal shop note for this room
  useEffect(() => {
    base44.entities.PortalNote.filter({ project_id: project.id }).then(notes => {
      const match = notes.find(n =>
        n.note_context === "general" &&
        !n.is_visible_to_client &&
        n.room_file_id === undefined &&
        n.author_type === "admin" &&
        n.note_text?.startsWith(`[SHOP_NOTE:${roomName}]`)
      );
      if (match) {
        setShopNote(match.note_text.replace(`[SHOP_NOTE:${roomName}]`, "").trim());
        setShopNoteId(match.id);
      }
      setNoteLoaded(true);
    });
  }, [project.id, roomName]);

  const handleNoteSave = async () => {
    const content = `[SHOP_NOTE:${roomName}] ${shopNote}`;
    if (shopNoteId) {
      await base44.entities.PortalNote.update(shopNoteId, { note_text: content });
    } else {
      const created = await base44.entities.PortalNote.create({
        project_id: project.id,
        note_text: content,
        author_name: currentUser?.full_name || "Admin",
        author_type: "admin",
        note_context: "general",
        is_visible_to_client: false
      });
      setShopNoteId(created.id);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RoomFile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: filesQK })
  });

  const flagMutation = useMutation({
    mutationFn: ({ id, flagged }) => base44.entities.RoomFile.update(id, { flagged_for_production: flagged }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: filesQK })
  });

  const createFileMutation = useMutation({
    mutationFn: (data) => base44.entities.RoomFile.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: filesQK }); setPendingFile(null); setLabel(""); }
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const ext = file.name.toLowerCase().split(".").pop();
    const file_type = ext === "pdf" ? "pdf" : "image";
    setUploading(false);
    setPendingFile({ file_url, file_name: file.name, file_type });
    e.target.value = "";
  };

  const handleConfirmUpload = () => {
    if (!pendingFile) return;
    createFileMutation.mutate({
      project_id: project.id,
      project_name: project.project_name,
      room_name: roomName,
      room_id: roomId || "",
      file_url: pendingFile.file_url,
      file_name: pendingFile.file_name,
      file_type: pendingFile.file_type,
      label: label.trim() || "",
      is_shop_file: true
    });
  };

  const fileIcon = (f) => {
    if (f.file_type === "image") return "🖼";
    return "📄";
  };

  return (
    <div className="space-y-4">
      {/* Internal shop note */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Internal Notes (admin only)</p>
        {noteLoaded && (
          <Textarea
            rows={2}
            placeholder="Internal shop notes for this room..."
            value={shopNote}
            onChange={e => setShopNote(e.target.value)}
            onBlur={handleNoteSave}
            className="text-sm resize-none"
          />
        )}
      </div>

      {/* File list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shop Files ({files.length})</p>
          <div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add Shop File
            </Button>
          </div>
        </div>

        {files.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">No shop files yet</p>
        ) : (
          <div className="space-y-2">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <div className="text-xl flex-shrink-0">{fileIcon(f)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{f.label || f.file_name}</p>
                  <p className="text-xs text-slate-400">{f.file_type?.toUpperCase()} · {f.created_date ? format(new Date(f.created_date), "MMM d, yyyy") : ""}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {f.flagged_for_production ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs gap-1">
                      <Factory className="w-3 h-3" /> Flagged ✓
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      onClick={() => flagMutation.mutate({ id: f.id, flagged: true })}
                      disabled={flagMutation.isPending}
                    >
                      <Factory className="w-3 h-3" /> Flag for Production
                    </Button>
                  )}
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-amber-600">
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    className="text-red-400 hover:text-red-600"
                    onClick={() => { if (confirm("Delete this file?")) deleteMutation.mutate(f.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Label dialog */}
      <Dialog open={!!pendingFile} onOpenChange={open => { if (!open) { setPendingFile(null); setLabel(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Label (optional)</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">{pendingFile?.file_name}</p>
          <Input placeholder='e.g. "Cut List", "Cabinet Schedule"' value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && handleConfirmUpload()} autoFocus />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setPendingFile(null); setLabel(""); }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleConfirmUpload} disabled={createFileMutation.isPending}>
              {createFileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}