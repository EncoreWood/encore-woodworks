import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ClipboardList, Pencil, Trash2, Link2, FolderOpen, RotateCcw, ArrowRight, Box, Upload, Loader2, PenLine } from "lucide-react";
import GlbViewer from "@/components/cad/GlbViewer";
import { base44 } from "@/api/base44Client";
import SketchPad from "@/components/production/SketchPad";

function PdfPreviewTooltip({ url, anchorEl }) {
  if (!url || !anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();
  const left = Math.max(8, rect.left - 160 + rect.width / 2);
  const top = rect.bottom + 8;

  return createPortal(
    <div
      className="fixed z-[9999] shadow-2xl border border-slate-200 rounded-lg bg-white overflow-hidden"
      style={{ top, left, width: 320, pointerEvents: "none" }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
        <FileText className="w-3 h-3 text-red-500" />
        <span className="text-xs text-slate-600 truncate font-medium">PDF Preview</span>
      </div>
      <object
        data={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        type="application/pdf"
        className="w-full"
        style={{ height: 420, border: "none", display: "block" }}
      >
        <div className="flex items-center justify-center h-full text-xs text-slate-400 p-4">PDF preview unavailable</div>
      </object>
    </div>,
    document.body
  );
}

export default function ProductionCard({
  item,
  editingPts,
  setEditingPts,
  onEdit,
  onDelete,
  onPickup,
  onInlinePtsChange,
  onAnnotate,
  getProjectColor,
  isDragging,
  // Job Info / Packets mode
  linkedProductionItem,
  onLinkClick,
  showLinkButton,
  onReturnToFolder,      // called to move production card back to Job Packets folder
  onSendToJobInfo,       // called to move production card → Job Info
  onReturnToJobInfo,     // called to move a production card back → Job Info (is_job_info=true)
  roomFolderLabel,       // label for the room folder link on a production card
  onOpenRoomFolder,      // called to open the matching room folder in Job Packets tab
  roomGlbUrl,            // GLB url from the matched room on the project
  roomGlbName,           // GLB file name
  onUpdate,              // called with updated item data after GLB upload/remove
}) {
  const [hoveredPdfUrl, setHoveredPdfUrl] = useState(null);
  const [hoveredAnchorEl, setHoveredAnchorEl] = useState(null);
  const [showGlb, setShowGlb] = useState(false);
  const [showCardGlb, setShowCardGlb] = useState(false);
  const [showSketch, setShowSketch] = useState(false);
  const [uploadingGlb, setUploadingGlb] = useState(false);
  const glbInputRef = useRef(null);

  const cardGlbUrl = item.glb_url;
  const cardGlbName = item.glb_name || item.name;

  const handleGlbUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGlb(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.ProductionItem.update(item.id, { glb_url: file_url, glb_name: file.name });
    if (onUpdate) onUpdate(item.id, { glb_url: file_url, glb_name: file.name });
    setUploadingGlb(false);
    e.target.value = "";
  };

  const color = getProjectColor ? getProjectColor(item.project_id) : null;
  const cardStyle = color
    ? { borderLeft: `4px solid ${color}`, backgroundColor: color + "18" }
    : {};

  const typeBadgeClass =
    item.type === "cabinet" ? "bg-blue-50 text-blue-700 border-blue-200"
    : item.type === "misc" ? "bg-purple-50 text-purple-700 border-purple-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const typeLabel = item.type === "cabinet" ? "Cabinet" : item.type === "misc" ? "Misc" : "Pick up";

  return (
    <>
      {showGlb && roomGlbUrl && (
        <GlbViewer file={{ url: roomGlbUrl, name: roomGlbName || "3D Model" }} onClose={() => setShowGlb(false)} />
      )}
      {showCardGlb && cardGlbUrl && (
        <GlbViewer file={{ url: cardGlbUrl, name: cardGlbName }} onClose={() => setShowCardGlb(false)} />
      )}
      {showSketch && (
        <SketchPad
          existingImageUrl={item.sketch_url}
          onClose={() => setShowSketch(false)}
          onSave={async (url) => {
            await base44.entities.ProductionItem.update(item.id, { sketch_url: url });
            if (onUpdate) onUpdate(item.id, { sketch_url: url });
            setShowSketch(false);
          }}
        />
      )}
      <Card
        className={`p-4 bg-white border-0 shadow-sm transition-shadow overflow-hidden ${isDragging ? "shadow-lg" : ""}`}
        style={cardStyle}
      >
        {/* Header row */}
        {item.project_name && (
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 font-medium truncate flex-1">
              {item.project_name}{item.room_name ? ` · ${item.room_name}` : ""}
            </p>
            <div className="flex items-center gap-1 ml-1 flex-wrap justify-end">
              {/* Room folder link */}
              {onOpenRoomFolder && roomFolderLabel && (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenRoomFolder(); }}
                  className="flex items-center gap-0.5 text-amber-600 hover:text-amber-800 flex-shrink-0"
                  title={`Open room folder: ${roomFolderLabel}`}
                >
                  <FolderOpen className="w-3 h-3" />
                </button>
              )}
              {/* Return to Job Packets folder */}
              {onReturnToFolder && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReturnToFolder(item); }}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2 py-0.5 flex-shrink-0 transition-colors"
                  title="Return to Job Packets folder"
                >
                  <RotateCcw className="w-3 h-3" />
                  Return to Packet
                </button>
              )}
              {/* Send to Job Info */}
              {onSendToJobInfo && !item.is_job_info && item.type === "misc" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSendToJobInfo(item); }}
                  className="flex items-center gap-0.5 text-purple-500 hover:text-purple-700 flex-shrink-0"
                  title="Send to Job Info"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              {/* Return to Job Info */}
              {onReturnToJobInfo && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReturnToJobInfo(item); }}
                  className="flex items-center gap-0.5 text-purple-500 hover:text-purple-700 flex-shrink-0"
                  title="Return to Job Info"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
              {showLinkButton && linkedProductionItem && onLinkClick && (
                <button
                  onClick={(e) => { e.stopPropagation(); onLinkClick(linkedProductionItem); }}
                  className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                  title="View linked production card"
                >
                  <Link2 className="w-3 h-3" />
                </button>
              )}
              {roomGlbUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowGlb(true); }}
                  className="flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 flex-shrink-0"
                  title="View room 3D model"
                >
                  <Box className="w-3 h-3" />
                </button>
              )}

              {item.project_id && onPickup && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPickup(item); }}
                  className="text-amber-600 hover:text-amber-700 flex-shrink-0"
                  title="Add pickup item"
                >
                  <ClipboardList className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Title + actions */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-900">{item.name}</h3>
            {item.files && item.files.some(f => f.pts) && (
              <span className="text-xs font-bold text-amber-600">
                {item.files.reduce((s, f) => s + (parseFloat(f.pts) || 0), 0)} PTS total
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* 3D model view/upload in title row */}
            {cardGlbUrl && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-violet-600 hover:text-violet-800"
                title="View card 3D model"
                onClick={(e) => { e.stopPropagation(); setShowCardGlb(true); }}>
                <Box className="w-3 h-3" />
              </Button>
            )}
            {onUpdate && (
              <>
                <input ref={glbInputRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleGlbUpload} />
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600"
                  title={cardGlbUrl ? "Replace 3D model" : "Upload 3D model"}
                  disabled={uploadingGlb}
                  onClick={(e) => { e.stopPropagation(); glbInputRef.current?.click(); }}>
                  {uploadingGlb ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                </Button>
              </>
            )}
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
                <Pencil className="w-3 h-3" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${item.name}"?`)) onDelete(item.id); }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
            <Badge variant="outline" className={typeBadgeClass}>{typeLabel}</Badge>
          </div>
        </div>

        {item.notes && <p className="text-sm text-slate-600 mb-3">{item.notes}</p>}

        {/* Sketch thumbnail */}
        {item.sketch_url && (
          <div className="mb-2">
            <button onClick={(e) => { e.stopPropagation(); setShowSketch(true); }} className="w-full">
              <img src={item.sketch_url} alt="Sketch" className="w-full rounded-md border border-slate-200 max-h-36 object-contain bg-white hover:opacity-90 transition-opacity" />
            </button>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><PenLine className="w-3 h-3" /> Sketch (click to view/edit)</p>
          </div>
        )}

        {/* Files */}
        {item.files && item.files.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {item.files.map((file, idx) => {
              if (!file.url) return null;
              const isImg = file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              const isPdf = file.url.match(/\.pdf$/i);

              if (isImg) return (
                <div key={idx} className="relative">
                  <img src={file.url} alt={file.name} className="w-full rounded-md border border-slate-200" />
                  <div className="absolute top-1 right-1 flex items-center gap-1 bg-white border border-amber-200 rounded px-1.5 py-0.5 shadow">
                    <span className="text-xs font-semibold text-slate-500">PTS</span>
                    {editingPts?.itemId === item.id && editingPts?.fileIdx === idx ? (
                      <input type="number" min="0" defaultValue={file.pts ?? ""} autoFocus
                        onClick={e => e.stopPropagation()}
                        onBlur={(e) => { onInlinePtsChange(item, idx, e.target.value); setEditingPts(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { onInlinePtsChange(item, idx, e.target.value); setEditingPts(null); } }}
                        className="w-10 text-xs text-center font-bold text-amber-600 border-none outline-none bg-transparent" placeholder="0" />
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setEditingPts({ itemId: item.id, fileIdx: idx }); }}
                        className="text-xs font-bold text-amber-600 min-w-[24px] text-center hover:underline">
                        {file.pts ?? "—"}
                      </button>
                    )}
                  </div>
                </div>
              );

              if (isPdf) return (
                <div key={idx} className="rounded-md border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="flex items-center gap-2 p-2">
                    <span
                      ref={(el) => { if (el) { /* anchor handled inline */ } }}
                      onMouseEnter={(e) => { setHoveredPdfUrl(file.url); setHoveredAnchorEl(e.currentTarget); }}
                      onMouseLeave={() => { setHoveredPdfUrl(null); setHoveredAnchorEl(null); }}
                      className="flex items-center gap-1 flex-1 min-w-0"
                    >
                      <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <button
                        className="text-amber-600 hover:text-amber-700 underline text-left text-xs truncate"
                        onClick={(e) => { e.stopPropagation(); window.open(file.url, "_blank", "noopener,noreferrer"); }}
                      >
                        {file.name}
                      </button>
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs font-semibold text-slate-500">PTS</span>
                      {editingPts?.itemId === item.id && editingPts?.fileIdx === idx ? (
                        <input type="number" min="0" defaultValue={file.pts ?? ""} autoFocus
                          onClick={e => e.stopPropagation()}
                          onBlur={(e) => { onInlinePtsChange(item, idx, e.target.value); setEditingPts(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { onInlinePtsChange(item, idx, e.target.value); setEditingPts(null); } }}
                          className="w-12 h-6 text-xs border border-amber-300 rounded px-1 text-center font-bold text-amber-600 bg-amber-50" placeholder="0" />
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setEditingPts({ itemId: item.id, fileIdx: idx }); }}
                          className="h-6 px-2 text-xs border border-amber-200 rounded font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 min-w-[40px] text-center">
                          {file.pts ?? "—"}
                        </button>
                      )}
                    </div>
                    {file.annotations && file.annotations.length > 0 && (
                      <Badge className="bg-emerald-600 text-xs">{file.annotations.length} notes</Badge>
                    )}
                    {onAnnotate && (
                      <Button size="sm" variant="outline" className="h-6 px-2 text-xs"
                        onClick={(e) => { e.stopPropagation(); onAnnotate(item, idx); }}>
                        Annotate
                      </Button>
                    )}
                  </div>
                </div>
              );

              return (
                <div key={idx} className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); window.open(file.url, "_blank"); }}
                    className="text-amber-600 hover:text-amber-700 underline text-left flex-1 text-xs">
                    {file.name}
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-500">PTS</span>
                    {editingPts?.itemId === item.id && editingPts?.fileIdx === idx ? (
                      <input type="number" min="0" defaultValue={file.pts ?? ""} autoFocus
                        onClick={e => e.stopPropagation()}
                        onBlur={(e) => { onInlinePtsChange(item, idx, e.target.value); setEditingPts(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { onInlinePtsChange(item, idx, e.target.value); setEditingPts(null); } }}
                        className="w-12 h-6 text-xs border border-amber-300 rounded px-1 text-center font-bold text-amber-600" placeholder="0" />
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setEditingPts({ itemId: item.id, fileIdx: idx }); }}
                        className="h-6 px-2 text-xs border border-amber-200 rounded font-bold text-amber-600 hover:bg-amber-50 min-w-[40px] text-center">
                        {file.pts ?? "—"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <PdfPreviewTooltip url={hoveredPdfUrl} anchorEl={hoveredAnchorEl} />
    </>
  );
}