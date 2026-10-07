import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";

const NAMED_SECTIONS = [
  { tag: "house_plans", label: "House Plans" },
  { tag: "appliance_specs", label: "Appliance Specs" },
];

const EXCLUDED_TAGS = ["house_plans", "appliance_specs", "job_photo", "cad_dxf", "cad_file"];

export default function ProjectFilesPanel({ project, onSave }) {
  const [uploadingTag, setUploadingTag] = useState(null);

  const files = project.files || [];
  const sections = [
    ...NAMED_SECTIONS.map(s => ({ ...s, items: files.filter(f => f.tag === s.tag) })),
    { tag: "other", label: "Other Files", items: files.filter(f => !EXCLUDED_TAGS.includes(f.tag)) },
  ];

  const handleUpload = async (tag, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTag(tag);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onSave({ files: [...files, { name: file.name, url: file_url, tag, uploaded_date: new Date().toISOString() }] });
    setUploadingTag(null);
    e.target.value = "";
  };

  const handleDelete = (idx) => {
    if (confirm("Delete this file?")) onSave({ files: files.filter((_, i) => i !== idx) });
  };

  return (
    <Card className="p-5 bg-white border-0 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Project Files</h2>
      <div className="space-y-5">
        {sections.map(section => (
          <div key={section.tag}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{section.label}</p>
            {section.items.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {section.items.map((file) => {
                  const idx = files.indexOf(file);
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 group">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-slate-800 truncate hover:text-amber-600">{file.name}</a>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={() => handleDelete(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <label className="cursor-pointer block">
              <input type="file" className="hidden" onChange={(e) => handleUpload(section.tag, e)} />
              <span className="flex items-center justify-center gap-2 w-full h-9 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50 text-xs text-slate-500 hover:text-amber-600 transition-colors">
                {uploadingTag === section.tag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Upload {section.label}
              </span>
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}