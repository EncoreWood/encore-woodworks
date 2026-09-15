import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Paperclip, Loader2, Trash2, FileIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// General project-level attachments: files not tied to a room and not tagged with a special purpose
const isGeneralAttachment = (f) => !f.room_name && !["job_photo", "cad_dxf", "3d_model"].includes(f.tag);

export default function ProjectFilesCard({ project }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const files = (project.files || []).filter(isGeneralAttachment);

  const saveFiles = useMutation({
    mutationFn: (newFiles) => base44.entities.Project.update(project.id, { files: newFiles }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", project.id] }),
    onError: (err) => {
      console.error("Failed to update project files:", err);
      toast({ title: "Failed to update project files", variant: "destructive" });
    },
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const entry = {
        name: file.name,
        url: file_url,
        tag: "project_attachment",
        uploaded_date: new Date().toISOString(),
      };
      saveFiles.mutate([...(project.files || []), entry]);
    } catch (err) {
      console.error("Upload failed:", err);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (url) => {
    saveFiles.mutate((project.files || []).filter(f => f.url !== url));
  };

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Files ({files.length})</h2>
        <label className={cn("cursor-pointer", uploading && "pointer-events-none opacity-50")}>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1.5" asChild>
            <span>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
              Upload File
            </span>
          </Button>
        </label>
      </div>
      {files.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
          <Paperclip className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No files attached to this project yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all group"
            >
              <FileIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 flex items-center gap-1 text-sm font-medium text-slate-800 hover:text-amber-700"
              >
                <span className="truncate">{f.name}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </a>
              {f.uploaded_date && (
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {format(new Date(f.uploaded_date), "MMM d, yyyy")}
                </span>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-slate-400 hover:text-red-600 flex-shrink-0"
                onClick={() => removeFile(f.url)}
                title="Remove file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}