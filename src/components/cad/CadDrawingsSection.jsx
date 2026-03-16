import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileCode2, Trash2, Eye, Loader2, Calendar, Box } from "lucide-react";
import { format } from "date-fns";
import DxfViewer from "./DxfViewer";
import GlbViewer from "./GlbViewer";

export default function CadDrawingsSection({ project, currentUser, onSave }) {
  const [uploading, setUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const fileInputRef = useRef(null);

  const cadFiles = (project.files || []).filter(f => f.tag === "cad_dxf" || f.tag === "cad_file");

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const newFiles = [...(project.files || [])];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newFiles.push({
          name: file.name,
          url: file_url,
          tag: "cad_file",
          uploaded_date: new Date().toISOString(),
        });
      }
      await onSave({ files: newFiles });
    } catch (err) {
      console.error("CAD upload failed:", err);
      alert("Upload failed: " + (err?.message || "Unknown error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (fileToDelete) => {
    if (!confirm("Delete this file?")) return;
    const updated = (project.files || []).filter(f => f !== fileToDelete);
    onSave({ files: updated });
  };

  const getFileIcon = (name) => {
    const ext = (name || "").toLowerCase().split('.').pop();
    if (ext === "glb" || ext === "gltf") return <Box className="w-8 h-8 text-purple-500 flex-shrink-0" />;
    return <FileCode2 className="w-8 h-8 text-cyan-500 flex-shrink-0" />;
  };

  const isViewable = (name) => {
    const ext = (name || "").toLowerCase().split('.').pop();
    return ["dxf", "glb", "gltf"].includes(ext);
  };

  return (
    <>
      <Card className="p-6 bg-white border-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-cyan-600" />
            CAD Drawings ({cadFiles.length})
          </h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".dxf,.glb,.gltf"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Upload CAD / 3D
            </Button>
          </div>
        </div>

        {cadFiles.length === 0 ? (
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-cyan-300 hover:bg-cyan-50/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileCode2 className="w-10 h-10 text-slate-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">Upload CAD / 3D Files</p>
              <p className="text-xs text-slate-400 mt-1">Supports DXF and GLB (SketchUp) files.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {cadFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/30 transition-all group">
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                  {file.uploaded_date && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(file.uploaded_date), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isViewable(file.name) && (
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setViewingFile(file)}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                  )}
                  {currentUser?.role === "admin" && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(file)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                {isViewable(file.name) && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs group-hover:hidden sm:hidden" onClick={() => setViewingFile(file)}>
                    <Eye className="w-3.5 h-3.5" /> View
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {viewingFile && (() => {
        const ext = (viewingFile.name || "").toLowerCase().split('.').pop();
        if (ext === "glb" || ext === "gltf") return <GlbViewer file={viewingFile} onClose={() => setViewingFile(null)} />;
        return <DxfViewer file={viewingFile} onClose={() => setViewingFile(null)} />;
      })()}
    </>
  );
}