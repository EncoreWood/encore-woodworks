import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Loader2, X, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

export default function JobPhotosTab({ project, currentUser }) {
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
        source: "admin",
        uploaded_by_name: currentUser?.full_name || "Admin",
        uploaded_by_email: currentUser?.email || "",
      });
      setCaption("");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Caption (optional)"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="h-9 text-sm flex-1 min-w-[200px]"
          />
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleFile} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-amber-600 hover:bg-amber-700 h-9 gap-1.5">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading…" : "Upload Photo"}
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          These photos are shared with linked clients in their portal. Clients can also add their own photos here.
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No job photos yet. Upload one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map(p => (
            <div key={p.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <button className="w-full" onClick={() => setLightbox(p)}>
                <img src={p.file_url} alt={p.caption || p.file_name} className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
              </button>
              <div className="p-2">
                {p.caption && <p className="text-xs font-medium text-slate-700 truncate">{p.caption}</p>}
                <p className="text-xs text-slate-400 truncate">
                  {p.source === "client" ? "👤 Client" : "🛠 Shop"} · {p.uploaded_by_name || "—"}
                  {p.created_date && ` · ${format(new Date(p.created_date), "MMM d")}`}
                </p>
              </div>
              <button
                className="absolute top-1 right-1 bg-red-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => { if (confirm("Delete this photo?")) deleteMutation.mutate(p.id); }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
              {p.source === "client" && (
                <span className="absolute top-1 left-1 bg-blue-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">CLIENT</span>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
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