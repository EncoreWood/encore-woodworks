import { useRef } from "react";
import { X } from "lucide-react";

// Placed images on an annotation page: drag to move, corner handles to resize,
// small × to delete. Positions/sizes are normalized (0–1) so they hold at any zoom.
export default function AnnotatorImageLayer({ images, size, annotateMode, activeTool, selectedIdx, liveScaleRef, onSelect, onUpdate, onRemove }) {
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  const startDrag = (e, idx, ann) => {
    if (!annotateMode) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(idx);
    dragRef.current = { idx, sx: e.clientX, sy: e.clientY, ox: ann.x, oy: ann.y, w: ann.w, h: ann.h, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    const live = liveScaleRef?.current || 1;
    onUpdate(d.idx, {
      x: Math.max(0, Math.min(1 - d.w, d.ox + (dx / live) / size.width)),
      y: Math.max(0, Math.min(1 - d.h, d.oy + (dy / live) / size.height)),
    });
  };

  const startResize = (e, idx, ann, corner) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(idx);
    resizeRef.current = { idx, corner, sx: e.clientX, sy: e.clientY, ox: ann.x, oy: ann.y, ow: ann.w, oh: ann.h };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveResize = (e) => {
    const d = resizeRef.current;
    if (!d) return;
    const live = liveScaleRef?.current || 1;
    const dx = (e.clientX - d.sx) / live / size.width;
    const dy = (e.clientY - d.sy) / live / size.height;
    const min = 0.03;
    let x = d.ox, y = d.oy, w = d.ow, h = d.oh;
    if (d.corner.includes("e")) w = Math.max(min, d.ow + dx);
    if (d.corner.includes("s")) h = Math.max(min, d.oh + dy);
    if (d.corner.includes("w")) { w = Math.max(min, d.ow - dx); x = d.ox + (d.ow - w); }
    if (d.corner.includes("n")) { h = Math.max(min, d.oh - dy); y = d.oy + (d.oh - h); }
    onUpdate(d.idx, { x, y, w, h });
  };

  return images.map(({ ann, idx }) => {
    const selected = annotateMode && selectedIdx === idx;
    // Only take over the pointer with the Pan (hand) tool or once selected, so
    // drawing/erasing still works over an image that's just sitting on the plan.
    const interactive = annotateMode && (activeTool === "pan" || selected);
    return (
      <div
        key={`img-${idx}`}
        onPointerDown={(e) => startDrag(e, idx, ann)}
        onPointerMove={moveDrag}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
        style={{
          position: "absolute",
          left: ann.x * size.width,
          top: ann.y * size.height,
          width: ann.w * size.width,
          height: ann.h * size.height,
          zIndex: 12,
          cursor: interactive ? "move" : "default",
          pointerEvents: interactive ? "auto" : "none",
          outline: selected ? "2px solid #2563eb" : "none",
          touchAction: "none",
        }}
      >
        <img
          src={ann.url}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", display: "block", userSelect: "none" }}
        />
        {selected && (
          <>
            {["nw", "ne", "sw", "se"].map((corner) => (
              <div
                key={corner}
                onPointerDown={(e) => startResize(e, idx, ann, corner)}
                onPointerMove={moveResize}
                onPointerUp={() => { resizeRef.current = null; }}
                onPointerCancel={() => { resizeRef.current = null; }}
                style={{
                  position: "absolute",
                  width: 12,
                  height: 12,
                  background: "#ffffff",
                  border: "2px solid #2563eb",
                  borderRadius: 2,
                  cursor: `${corner}-resize`,
                  touchAction: "none",
                  ...(corner.includes("n") ? { top: -6 } : { bottom: -6 }),
                  ...(corner.includes("w") ? { left: -6 } : { right: -6 }),
                }}
              />
            ))}
            <button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
              className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white border border-red-300 text-red-600 flex items-center justify-center shadow"
              title="Delete image"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  });
}