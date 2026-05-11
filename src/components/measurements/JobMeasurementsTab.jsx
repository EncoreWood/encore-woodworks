import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Upload, FileText, Image, Pencil, Trash2, Save, CheckCircle2,
  Loader2, RefreshCw, Plus, X, ZoomIn
} from "lucide-react";
import ImageAnnotator from "./ImageAnnotator";
import PDFAnnotator from "@/components/production/PDFAnnotator";

const AUTO_SAVE_DELAY = 2500; // ms

function FileThumbnail({ measurement, onAnnotate, onDelete, onLabelChange, isSaving }) {
  const isImage = measurement.file_type === "image";
  const annotations = (() => { try { return JSON.parse(measurement.annotations || "[]"); } catch { return []; } })();
  const hasAnnotations = annotations.length > 0;

  return (
    <div className="relative group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer" onClick={onAnnotate}>
        {isImage ? (
          <img src={measurement.file_url} alt={measurement.file_name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <FileText className="w-10 h-10" />
            <span className="text-xs font-medium text-slate-500 px-2 text-center truncate w-full">{measurement.file_name}</span>
          </div>
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-active:bg-black/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <span className="bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 shadow">
              <Pencil className="w-3 h-3" /> Annotate
            </span>
          </div>
        </div>
        {hasAnnotations && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            {annotations.length} marks
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 space-y-1.5">
        <input
          className="w-full text-xs font-medium text-slate-700 bg-transparent border-b border-transparent focus:border-amber-400 focus:outline-none px-0.5 py-0.5 transition-colors"
          value={measurement.label || measurement.file_name}
          onChange={e => onLabelChange(e.target.value)}
          placeholder="Add label..."
        />
        <div className="flex items-center justify-between gap-1">
          <button onClick={onAnnotate}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition-colors min-h-[36px]">
            <Pencil className="w-3.5 h-3.5" /> Annotate
          </button>
          <button onClick={onDelete}
            className="flex items-center justify-center p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors min-h-[36px] min-w-[36px]">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isSaving && (
        <div className="absolute top-2 left-2 bg-white/90 rounded-full p-1 shadow">
          <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
        </div>
      )}
    </div>
  );
}

export default function JobMeasurementsTab({ project }) {
  const queryClient = useQueryClient();
  const projectId = project.id;

  const [uploading, setUploading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [annotatingItem, setAnnotatingItem] = useState(null); // { measurement, type }
  const [notesMap, setNotesMap] = useState({}); // local notes state
  const [labelMap, setLabelMap] = useState({});  // local label state
  const autoSaveTimers = useRef({});
  const fileInputRef = useRef(null);

  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ["jobMeasurements", projectId],
    queryFn: () => base44.entities.JobMeasurement.filter({ project_id: projectId }, "sort_order", 100),
    enabled: !!projectId
  });

  // Real-time sync
  useEffect(() => {
    const unsub = base44.entities.JobMeasurement.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["jobMeasurements", projectId] });
    });
    return unsub;
  }, [projectId, queryClient]);

  // Seed local notes/labels from server data
  useEffect(() => {
    setNotesMap(prev => {
      const next = { ...prev };
      measurements.forEach(m => { if (!(m.id in next)) next[m.id] = m.notes || ""; });
      return next;
    });
    setLabelMap(prev => {
      const next = { ...prev };
      measurements.forEach(m => { if (!(m.id in next)) next[m.id] = m.label || ""; });
      return next;
    });
  }, [measurements]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobMeasurement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobMeasurements", projectId] });
      setLastSaved(new Date());
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JobMeasurement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobMeasurements", projectId] })
  });

  const scheduleAutoSave = useCallback((id, data) => {
    if (autoSaveTimers.current[id]) clearTimeout(autoSaveTimers.current[id]);
    autoSaveTimers.current[id] = setTimeout(async () => {
      setSavingId(id);
      await updateMutation.mutateAsync({ id, data });
      setSavingId(null);
    }, AUTO_SAVE_DELAY);
  }, [updateMutation]);

  const handleNotesChange = (id, value) => {
    setNotesMap(p => ({ ...p, [id]: value }));
    scheduleAutoSave(id, { notes: value });
  };

  const handleLabelChange = (id, value) => {
    setLabelMap(p => ({ ...p, [id]: value }));
    scheduleAutoSave(id, { label: value });
  };

  const handleSaveAnnotations = async (annotations) => {
    if (!annotatingItem) return;
    const { measurement } = annotatingItem;
    setSavingId(measurement.id);
    await updateMutation.mutateAsync({ id: measurement.id, data: { annotations: JSON.stringify(annotations) } });
    setSavingId(null);
    setAnnotatingItem(null);
  };

  const handleManualSaveAll = async () => {
    setManualSaving(true);
    // Flush all pending timers immediately
    const pending = Object.entries(autoSaveTimers.current);
    for (const [id, timer] of pending) {
      clearTimeout(timer);
      delete autoSaveTimers.current[id];
    }
    // Save all local state
    const saves = measurements.map(m =>
      updateMutation.mutateAsync({ id: m.id, data: { notes: notesMap[m.id] ?? m.notes ?? "", label: labelMap[m.id] ?? m.label ?? "" } })
    );
    await Promise.all(saves);
    setLastSaved(new Date());
    setManualSaving(false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop().toLowerCase();
      const fileType = ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext) ? "image" : "pdf";
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.JobMeasurement.create({
        project_id: projectId,
        project_name: project.project_name,
        file_url,
        file_name: file.name,
        file_type: fileType,
        label: file.name.replace(/\.[^.]+$/, ""),
        annotations: "[]",
        notes: "",
        sort_order: measurements.length + i
      });
    }
    queryClient.invalidateQueries({ queryKey: ["jobMeasurements", projectId] });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this measurement file?")) return;
    if (autoSaveTimers.current[id]) { clearTimeout(autoSaveTimers.current[id]); delete autoSaveTimers.current[id]; }
    await deleteMutation.mutateAsync(id);
  };

  const formatLastSaved = (date) => {
    if (!date) return null;
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 5) return "Just saved";
    if (diff < 60) return `Saved ${diff}s ago`;
    return `Saved ${Math.floor(diff / 60)}m ago`;
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Job Measurements</h2>
          {lastSaved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> {formatLastSaved(lastSaved)}
            </span>
          )}
          {(savingId || manualSaving) && (
            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleManualSaveAll}
            disabled={manualSaving || measurements.length === 0}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 min-h-[40px]"
          >
            {manualSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All
          </Button>
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <span className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[40px] ${uploading ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"}`}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Upload Files"}
            </span>
          </label>
        </div>
      </div>

      {/* Upload drop zone (shown when empty) */}
      {!isLoading && measurements.length === 0 && (
        <label className="cursor-pointer block">
          <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleFileUpload} />
          <div className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-2xl p-12 text-center transition-colors bg-white">
            <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium mb-1">Tap to upload photos or PDFs</p>
            <p className="text-xs text-slate-400">Images and PDF floor plans supported • Annotate with pen, arrows, and text</p>
          </div>
        </label>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      )}

      {/* Grid */}
      {measurements.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {measurements.map(m => (
            <div key={m.id} className="flex flex-col gap-2">
              <FileThumbnail
                measurement={{ ...m, label: labelMap[m.id] ?? m.label ?? "" }}
                isSaving={savingId === m.id}
                onAnnotate={() => setAnnotatingItem({ measurement: m, type: m.file_type })}
                onDelete={() => handleDelete(m.id)}
                onLabelChange={val => handleLabelChange(m.id, val)}
              />
              <Textarea
                value={notesMap[m.id] ?? m.notes ?? ""}
                onChange={e => handleNotesChange(m.id, e.target.value)}
                placeholder="Notes..."
                rows={2}
                className="text-xs resize-none rounded-xl border-slate-200 focus:border-amber-400 bg-white"
              />
            </div>
          ))}

          {/* Add more button */}
          <label className="cursor-pointer flex flex-col">
            <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleFileUpload} />
            <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 hover:border-amber-400 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-amber-500 transition-colors bg-white min-h-[80px]">
              {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus className="w-6 h-6" /><span className="text-xs font-medium">Add More</span></>}
            </div>
          </label>
        </div>
      )}

      {/* Image Annotator */}
      {annotatingItem && annotatingItem.type === "image" && (
        <ImageAnnotator
          open={true}
          onOpenChange={(open) => { if (!open) setAnnotatingItem(null); }}
          imageUrl={annotatingItem.measurement.file_url}
          annotations={(() => { try { return JSON.parse(annotatingItem.measurement.annotations || "[]"); } catch { return []; } })()}
          onSave={handleSaveAnnotations}
          title={annotatingItem.measurement.label || annotatingItem.measurement.file_name}
        />
      )}

      {/* PDF Annotator */}
      {annotatingItem && annotatingItem.type === "pdf" && (
        <PDFAnnotator
          open={true}
          onOpenChange={(open) => { if (!open) setAnnotatingItem(null); }}
          pdfUrl={annotatingItem.measurement.file_url}
          annotations={(() => { try { return JSON.parse(annotatingItem.measurement.annotations || "[]"); } catch { return []; } })()}
          onSave={(anns) => handleSaveAnnotations(anns)}
          hideDownload={false}
        />
      )}
    </div>
  );
}