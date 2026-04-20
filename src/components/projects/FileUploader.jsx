import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, FileIcon, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FileUploader({ files = [], onChange, label = "Files" }) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange([...files, { name: file.name, url: file_url, pts: undefined }]);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handlePtsChange = (index, value) => {
    const updated = files.map((f, i) =>
      i === index ? { ...f, pts: value === "" ? undefined : Number(value) } : f
    );
    onChange(updated);
  };

  const handleRemove = (index) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-700">{label}</label>
        <label className={cn(
          "cursor-pointer",
          uploading && "pointer-events-none opacity-50"
        )}>
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button type="button" variant="outline" size="sm" className="h-7" asChild>
            <span>
              {uploading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Upload className="w-3 h-3 mr-1" />
              )}
              Upload
            </span>
          </Button>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded text-xs group"
            >
              <FileIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-slate-700 hover:text-amber-600 flex items-center gap-1"
              >
                {file.name}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs font-semibold text-slate-500">PTS</span>
                <input
                 type="number"
                 min="0"
                 step="0.25"
                 value={file.pts ?? ""}
                 onChange={(e) => handlePtsChange(index, e.target.value)}
                 className="w-12 h-6 text-xs border border-slate-300 rounded px-1 text-center"
                 placeholder="0"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-red-600"
                onClick={() => handleRemove(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}