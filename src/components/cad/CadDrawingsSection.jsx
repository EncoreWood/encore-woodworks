import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileCode2, Trash2, Eye, Loader2, Calendar, Box, Tag } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DxfViewer from "./DxfViewer";
import GlbViewer from "./GlbViewer";

export default function CadDrawingsSection({ project, currentUser, onSave }) {
  const [uploading, setUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [taggingIdx, setTaggingIdx] = useState(null);
  const fileInputRef = useRef(null);

  const rooms = (project.rooms || []).map(r => r.room_name).filter(Boolean);

  const isCadFile = (f) => {
    const ext = (f.name || "").toLowerCase().split('.').pop();
    return f.tag === "cad_dxf" || f.tag === "cad_file" || ext === "dxf" || ext === "glb" || ext === "gltf";
  };
  const cadFiles = (project.files || []).filter(isCadFile);

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

  const handleTagRoom = (fileIdx, roomName) => {
    // fileIdx is index within cadFiles, need to find in full files array
    const cadFilesList = (project.files || []).filter(isCadFile);
    const targetFile = cadFilesList[fileIdx];
    const updated = (project.files || []).map(f =>
      f === targetFile ? { ...f, room_name: roomName === "none" ? null : roomName } : f
    );
    onSave({ files: updated });
    setTaggingIdx(null);
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
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:border-cyan-200 transition-all">
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {file.uploaded_date && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(file.uploaded_date), "MMM d, yyyy")}
                      </p>
                    )}
                    {file.room_name && (
                      <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-medium">
                        📐 {file.room_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Room tag selector */}
                  {rooms.length > 0 && (
                    taggingIdx === idx ? (
                      <Select onValueChange={(v) => handleTagRoom(idx, v)} defaultValue={file.room_name || "none"}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue placeholder="Tag room" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No room</SelectItem>
                          {rooms.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-cyan-600" onClick={() => setTaggingIdx(idx)} title="Tag to room">
                        <Tag className="w-3.5 h-3.5" />
                      </Button>
                    )
                  )}
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