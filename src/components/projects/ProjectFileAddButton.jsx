import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Paperclip, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Adds files to the project's shared files list (same records the Project Files
 * card on the project page uses, tagged "project_attachment").
 */
export default function ProjectFileAddButton({ project }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0 || !project?.id) return;

    setUploading(true);
    try {
      const entries = [];
      for (const file of picked) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        entries.push({
          name: file.name,
          url: file_url,
          tag: "project_attachment",
          uploaded_date: new Date().toISOString(),
        });
      }
      await base44.entities.Project.update(project.id, {
        files: [...(project.files || []), ...entries],
      });
      qc.invalidateQueries({ queryKey: ["project", project.id] });
    } catch (err) {
      console.error("Project file upload failed:", err);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className={cn("cursor-pointer", uploading && "pointer-events-none opacity-50")}>
      <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700">
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
        {uploading ? "Uploading…" : "Add file"}
      </span>
    </label>
  );
}