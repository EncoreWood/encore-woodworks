import { useState } from "react";
import { FileIcon, ExternalLink } from "lucide-react";
import DxfViewer from "@/components/cad/DxfViewer";
import GlbViewer from "@/components/cad/GlbViewer";

export default function FileViewer({ file, className = "" }) {
  const [viewingDxf, setViewingDxf] = useState(false);
  const [viewingGlb, setViewingGlb] = useState(false);

  const getFileType = (url, name) => {
    const ext = (name || url).toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'dxf') return 'dxf';
    if (ext === 'glb' || ext === 'gltf') return 'glb';
    return 'other';
  };

  const fileType = getFileType(file.url, file.name);

  if (fileType === 'image') {
    return (
      <div className={className}>
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="block group">
          <img 
            src={file.url} 
            alt={file.name}
            className="w-full rounded-lg border border-slate-200 group-hover:border-amber-300 transition-all"
          />
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-600 group-hover:text-amber-600">
            <FileIcon className="w-3 h-3" />
            <span className="flex-1 truncate">{file.name}</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </a>
      </div>
    );
  }

  if (fileType === 'dxf') {
    return (
      <div className={className}>
        {viewingDxf && <DxfViewer file={file} onClose={() => setViewingDxf(false)} />}
        <button
          onClick={() => setViewingDxf(true)}
          className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-cyan-300 hover:bg-cyan-50 transition-all group"
        >
          <FileIcon className="w-5 h-5 text-cyan-500" />
          <span className="flex-1 text-sm text-slate-700 group-hover:text-cyan-700 truncate text-left">
            {file.name}
          </span>
          <span className="text-xs text-cyan-600 font-medium">View</span>
        </button>
      </div>
    );
  }

  if (fileType === 'glb') {
    return (
      <div className={className}>
        {viewingGlb && <GlbViewer file={file} onClose={() => setViewingGlb(false)} />}
        <button
          onClick={() => setViewingGlb(true)}
          className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-purple-300 hover:bg-purple-50 transition-all group"
        >
          <FileIcon className="w-5 h-5 text-purple-500" />
          <span className="flex-1 text-sm text-slate-700 group-hover:text-purple-700 truncate text-left">
            {file.name}
          </span>
          <span className="text-xs text-purple-600 font-medium">View 3D</span>
        </button>
      </div>
    );
  }

  if (fileType === 'pdf') {
    return (
      <div className={className}>
        <iframe
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`}
          className="w-full h-96 rounded-lg border border-slate-200"
          title={file.name}
        />
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
          <FileIcon className="w-3 h-3" />
          <span className="flex-1 truncate">{file.name}</span>
        </div>
      </div>
    );
  }

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all group"
    >
      <FileIcon className="w-5 h-5 text-slate-400 group-hover:text-amber-500" />
      <span className="flex-1 text-sm text-slate-700 group-hover:text-amber-700 truncate">
        {file.name}
      </span>
      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
    </a>
  );
}