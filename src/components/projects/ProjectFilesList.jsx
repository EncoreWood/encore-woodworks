import { useState } from "react";
import { FileText } from "lucide-react";
import ProjectFilePreviewDialog from "@/components/projects/ProjectFilePreviewDialog";
import { cn } from "@/lib/utils";

const NAMED_SECTIONS = [
  { tag: "house_plans", label: "House Plans" },
  { tag: "appliance_specs", label: "Appliance Specs" },
];

const EXCLUDED_TAGS = ["house_plans", "appliance_specs", "job_photo", "cad_dxf", "cad_file"];

/**
 * Read-only, clickable list of the project's uploaded files, grouped the same
 * way as the Project Files card. Used inside dark overlay viewers (room image
 * lightbox, production room info) so files are reachable while building.
 */
export default function ProjectFilesList({ files = [], dark = true }) {
  const [previewFile, setPreviewFile] = useState(null);

  const sections = [
    ...NAMED_SECTIONS.map(s => ({ ...s, items: files.filter(f => f.tag === s.tag) })),
    { tag: "other", label: "Other Files", items: files.filter(f => !EXCLUDED_TAGS.includes(f.tag)) },
  ].filter(s => s.items.length > 0);

  const labelCls = dark ? "text-white/50" : "text-slate-500";
  const rowCls = dark
    ? "bg-white/5 hover:bg-white/15 border-white/10 text-white"
    : "bg-slate-50 hover:bg-amber-50 border-slate-200 text-slate-800";

  return (
    <div className="space-y-2">
      {sections.length === 0 && (
        <p className={cn("text-xs", dark ? "text-white/40" : "text-slate-400")}>No project files yet.</p>
      )}
      {sections.map(section => (
        <div key={section.tag}>
          <p className={cn("text-[10px] font-semibold uppercase tracking-widest mb-1", labelCls)}>{section.label}</p>
          <div className="space-y-1">
            {section.items.map((file, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPreviewFile(file)}
                className={cn("w-full flex items-center gap-1.5 rounded border px-2 py-1.5 text-left transition-colors", rowCls)}
                title={file.name}
              >
                <FileText className="w-3 h-3 flex-shrink-0 opacity-70" />
                <span className="text-xs truncate">{file.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <ProjectFilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} elevated />
    </div>
  );
}