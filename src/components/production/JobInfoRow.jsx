import { useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ClipboardList } from "lucide-react";
import { createPortal } from "react-dom";

function PdfPreviewTooltip({ url, visible, anchorRef }) {
  if (!visible || !anchorRef.current) return null;

  const rect = anchorRef.current.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 8;
  const left = Math.max(8, rect.left + window.scrollX - 160 + rect.width / 2);

  return createPortal(
    <div
      className="fixed z-[9999] shadow-2xl border border-slate-200 rounded-lg bg-white overflow-hidden"
      style={{ top: rect.bottom + 8, left: Math.max(8, rect.left - 160 + rect.width / 2), width: 320, pointerEvents: "none" }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
        <FileText className="w-3 h-3 text-red-500" />
        <span className="text-xs text-slate-600 truncate font-medium">PDF Preview</span>
      </div>
      <iframe
        src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
        className="w-full"
        style={{ height: 420, border: "none" }}
        title="PDF Preview"
      />
    </div>,
    document.body
  );
}

function JobPacket({ item, index, getProjectColor, onPickup }) {
  const [hoveredFileIdx, setHoveredFileIdx] = useState(null);
  const [anchorRefs] = useState(() => ({}));

  const color = getProjectColor(item.project_id);
  const pdfFiles = (item.files || []).filter(f => f.url?.match(/\.pdf$/i));
  const totalPts = (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0);

  const getOrCreateRef = (idx) => {
    if (!anchorRefs[idx]) anchorRefs[idx] = { current: null };
    return anchorRefs[idx];
  };

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="flex-shrink-0"
        >
          <Card
            className={`p-3 border-0 shadow-sm transition-shadow cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "shadow-lg rotate-1" : "hover:shadow-md"}`}
            style={{
              width: 180,
              ...(color ? { borderLeft: `4px solid ${color}`, backgroundColor: color + "18" } : { backgroundColor: "white" })
            }}
          >
            {/* Project/Room label */}
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 font-medium truncate flex-1">
                {item.project_name}{item.room_name ? ` · ${item.room_name}` : ""}
              </p>
              {item.project_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPickup(item); }}
                  className="text-amber-600 hover:text-amber-700 ml-1 flex-shrink-0"
                  title="Add pickup item"
                >
                  <ClipboardList className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Item name */}
            <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>

            {/* Type badge + PTS */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={`text-xs py-0 px-1.5 ${
                  item.type === "cabinet" ? "bg-blue-50 text-blue-700 border-blue-200"
                  : item.type === "misc" ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {item.type === "cabinet" ? "Cabinet" : item.type === "misc" ? "Misc" : "Pick up"}
              </Badge>
              {totalPts > 0 && (
                <span className="text-xs font-bold text-amber-600">{totalPts} PTS</span>
              )}
            </div>

            {/* PDF file previews */}
            {pdfFiles.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                {pdfFiles.map((file, idx) => {
                  const ref = getOrCreateRef(idx);
                  const isHovered = hoveredFileIdx === idx;
                  return (
                    <div key={idx} className="relative">
                      <div
                        ref={(el) => { ref.current = el; }}
                        onMouseEnter={() => setHoveredFileIdx(idx)}
                        onMouseLeave={() => setHoveredFileIdx(null)}
                        onClick={(e) => { e.stopPropagation(); window.open(file.url, "_blank", "noopener,noreferrer"); }}
                        className="flex items-center gap-1 px-1.5 py-1 bg-red-50 border border-red-200 rounded cursor-pointer hover:bg-red-100 transition-colors"
                      >
                        <FileText className="w-3 h-3 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-slate-700 truncate max-w-[80px]">{file.name}</span>
                      </div>
                      <PdfPreviewTooltip url={file.url} visible={isHovered} anchorRef={ref} />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </Draggable>
  );
}

export const JOB_INFO_DROPPABLE_ID = "job_info_row";

export default function JobInfoRow({ items, getProjectColor, onPickup }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="font-semibold text-slate-700 text-base">Job Info</h2>
        <Badge variant="outline" className="text-xs">{items.length}</Badge>
        <span className="text-xs text-slate-400">Hover PDF files for a preview · Drag to move to a stage</span>
      </div>
      <Droppable droppableId={JOB_INFO_DROPPABLE_ID} direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex gap-3 min-h-[80px] p-3 rounded-xl border-2 border-dashed transition-colors overflow-x-auto ${
              snapshot.isDraggingOver
                ? "border-amber-400 bg-amber-50"
                : "border-slate-300 bg-slate-50/60"
            }`}
          >
            {items.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-sm text-slate-400 self-center pl-2">
                Drag items here to hold them before assigning to a stage
              </p>
            )}
            {items.map((item, index) => (
              <JobPacket
                key={item.id}
                item={item}
                index={index}
                getProjectColor={getProjectColor}
                onPickup={onPickup}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}