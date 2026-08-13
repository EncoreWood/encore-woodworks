import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Loader2, X } from "lucide-react";

// Client-facing job photos wall. Clients can view all photos and upload their own.
// `extraPhotos` (project.files images) are shown read-only alongside entity photos.
export default function JobPhotosSection({ project, user, canDelete = false, extraPhotos = [] }) {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [lightbox, setLightbox] = useState(null);

  const queryKey = ["job_photos", project.id];

  const { data: photos = [] } = useQuery({
    queryKey,
    queryFn: () => base44.entities.JobPhoto.filter({ project_id: project.id }, "-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.JobPhoto.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); setCaption(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JobPhoto.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      createMutation.mutate({
        project_id: project.id,
        project_name: project.project_name,
        file_url,
        file_name: file.name,
        caption: caption.trim(),
        source: "client",
        uploaded_by_name: user?.full_name || "Client",
        uploaded_by_email: user?.email || "",
      });
      setCaption("");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const combined = [
    ...(extraPhotos || []).map(f => ({ id: `ext_${f.url}`, file_url: f.url, file_name: f.name, caption: "", source: "project", isExtra: true })),
    ...photos,
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Add a caption (optional)"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          className="h-9 text-sm flex-1 min-w-[160px]"
        />
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleFile} />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-amber-500 hover:bg-amber-600 h-9 gap-1.5">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading…" : "Add Photo"}
        </Button>
      </div>

      {combined.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No photos yet. Add the first one!</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {combined.map(p => {
            const mine = user?.email && p.uploaded_by_email === user.email;
            return (
              <div key={p.id} className="relative group">
                <button onClick={() => setLightbox(p)} className="block w-full">
                  <img src={p.file_url} alt={p.caption || p.file_name} className="w-full aspect-square object-cover rounded-xl hover:opacity-90 transition-opacity" />
                </button>
                {p.caption && <p className="text-xs text-slate-500 mt-1 truncate">{p.caption}</p>}
                {p.source === "client" && (
                  <span className="absolute top-1 left-1 bg-blue-500/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                    {mine ? "YOU" : "CLIENT"}
                  </span>
                )}
                {canDelete && !p.isExtra && (
                  <button
                    className="absolute top-1 right-1 bg-red-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { if (confirm("Delete this photo?")) deleteMutation.mutate(p.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl max-h-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.file_url} alt={lightbox.caption || lightbox.file_name} className="max-h-[90vh] max-w-full rounded-xl object-contain" />
            <button className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5" onClick={() => setLightbox(null)}>
              <X className="w-5 h-5" />
            </button>
            {lightbox.caption && (
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">{lightbox.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}