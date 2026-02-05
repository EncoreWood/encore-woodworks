import { FileIcon, ExternalLink } from "lucide-react";

export default function FileViewer({ file, className = "" }) {
  const getFileType = (url, name) => {
    const ext = (name || url).toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
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

  if (fileType === 'pdf') {
    return (
      <div className={className}>
        <iframe
          src={file.url}
          className="w-full h-96 rounded-lg border border-slate-200"
          title={file.name}
        />
        <a 
          href={file.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-2 text-xs text-amber-600 hover:text-amber-700"
        >
          <FileIcon className="w-3 h-3" />
          <span className="flex-1 truncate">{file.name}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
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