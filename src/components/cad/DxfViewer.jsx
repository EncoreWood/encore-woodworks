import { useState, useRef, useEffect, useCallback } from "react";
import DxfParser from "dxf-parser";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Eye, EyeOff, ZoomIn, ZoomOut } from "lucide-react";

// Colors from AutoCAD color index (ACI) - adjusted for dark background
const ACI_COLORS = {
  1: "#ff4444", 2: "#ffff44", 3: "#44ff44", 4: "#44ffff",
  5: "#6699ff", 6: "#ff44ff", 7: "#e0e0e0", // 7 = white -> light gray (visible on dark)
  8: "#aaaaaa", 9: "#cccccc",
};
function aciToHex(aci) { return ACI_COLORS[aci] || "#e0e0e0"; }

function getEntityColor(entity, layers) {
  let color = entity.color;
  if (!color || color === 256) {
    // bylayer
    const layer = layers[entity.layer];
    color = layer?.color;
  }
  if (!color || color === 256) return "#e0e0e0";
  if (typeof color === "string" && color.startsWith("#")) return color;
  return aciToHex(color);
}

// Simple isometric projection for 3D DXF files
// Projects (x,y,z) -> (px, py) using a top-down isometric view
const ISO_ANGLE = 30 * Math.PI / 180;
const COS_ISO = Math.cos(ISO_ANGLE);
const SIN_ISO = Math.sin(ISO_ANGLE);

function project3D(x, y, z) {
  // Standard isometric: x goes right-down, y goes left-down, z goes up
  const px = (x - y) * COS_ISO;
  const py = (x + y) * SIN_ISO - z;
  return { px, py };
}

function renderDxf(canvas, dxf, visibleLayers, transform) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!dxf?.entities) return;

  const { offsetX, offsetY, scale } = transform;
  const layers = dxf.tables?.layer?.layers || {};

  // Check if this is a 3D file by sampling entities
  const is3D = (dxf.entities || []).some(e =>
    e.type === "3DFACE" ||
    (e.vertices && e.vertices.some(v => v.z && Math.abs(v.z) > 0.001)) ||
    (e.startPoint && Math.abs(e.startPoint.z || 0) > 0.001)
  );

  const toScreen = (x, y, z = 0) => {
    if (is3D) {
      const { px, py } = project3D(x, y, z);
      return { sx: px * scale + offsetX, sy: py * scale + offsetY };
    }
    return { sx: x * scale + offsetX, sy: canvas.height - (y * scale + offsetY) };
  };

  ctx.lineWidth = Math.max(1, 1.5 / scale);

  dxf.entities.forEach((entity) => {
    const layerName = entity.layer || "0";
    if (!visibleLayers[layerName]) return;

    const color = getEntityColor(entity, layers);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    try {
      if (entity.type === "LINE") {
        const s = toScreen(entity.vertices[0].x, entity.vertices[0].y);
        const e = toScreen(entity.vertices[1].x, entity.vertices[1].y);
        ctx.beginPath(); ctx.moveTo(s.sx, s.sy); ctx.lineTo(e.sx, e.sy); ctx.stroke();

      } else if (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") {
        const verts = entity.vertices;
        if (!verts?.length) return;
        ctx.beginPath();
        const s0 = toScreen(verts[0].x, verts[0].y);
        ctx.moveTo(s0.sx, s0.sy);
        for (let i = 1; i < verts.length; i++) {
          const sv = toScreen(verts[i].x, verts[i].y);
          ctx.lineTo(sv.sx, sv.sy);
        }
        if (entity.shape) ctx.closePath();
        ctx.stroke();

      } else if (entity.type === "CIRCLE") {
        const c = toScreen(entity.center.x, entity.center.y);
        ctx.beginPath();
        ctx.arc(c.sx, c.sy, entity.radius * scale, 0, Math.PI * 2);
        ctx.stroke();

      } else if (entity.type === "ARC") {
        const c = toScreen(entity.center.x, entity.center.y);
        const startAngle = -entity.endAngle * Math.PI / 180;
        const endAngle = -entity.startAngle * Math.PI / 180;
        ctx.beginPath();
        ctx.arc(c.sx, c.sy, entity.radius * scale, startAngle, endAngle);
        ctx.stroke();

      } else if (entity.type === "ELLIPSE") {
        const c = toScreen(entity.center.x, entity.center.y);
        const rx = Math.sqrt(entity.majorAxisEndPoint.x ** 2 + entity.majorAxisEndPoint.y ** 2) * scale;
        const ry = rx * entity.axisRatio;
        ctx.beginPath();
        ctx.ellipse(c.sx, c.sy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

      } else if (entity.type === "SPLINE") {
        const pts = entity.controlPoints || entity.fitPoints;
        if (!pts?.length) return;
        ctx.beginPath();
        const sp = toScreen(pts[0].x, pts[0].y);
        ctx.moveTo(sp.sx, sp.sy);
        for (let i = 1; i < pts.length; i++) {
          const p = toScreen(pts[i].x, pts[i].y);
          ctx.lineTo(p.sx, p.sy);
        }
        ctx.stroke();

      } else if (entity.type === "TEXT" || entity.type === "MTEXT") {
        const pos = entity.startPoint || entity.position || entity.insertionPoint;
        if (!pos) return;
        const p = toScreen(pos.x, pos.y);
        const fontSize = Math.max(8, (entity.textHeight || 2.5) * scale);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillText(entity.text || entity.string || "", p.sx, p.sy);

      } else if (entity.type === "INSERT") {
        const pos = entity.position;
        if (!pos) return;
        const blockName = entity.name;
        const block = dxf.blocks?.[blockName];
        if (block?.entities?.length) {
          // Draw each entity in the block, offset by insert position
          const sx = entity.xScale ?? 1;
          const sy = entity.yScale ?? 1;
          block.entities.forEach(be => {
            try {
              const bColor = getEntityColor(be, layers) || color;
              ctx.strokeStyle = bColor;
              ctx.fillStyle = bColor;
              const tx = (x) => x * sx + pos.x;
              const ty = (y) => y * sy + pos.y;
              if (be.type === "LINE") {
                const s = toScreen(tx(be.vertices[0].x), ty(be.vertices[0].y));
                const e = toScreen(tx(be.vertices[1].x), ty(be.vertices[1].y));
                ctx.beginPath(); ctx.moveTo(s.sx, s.sy); ctx.lineTo(e.sx, e.sy); ctx.stroke();
              } else if (be.type === "LWPOLYLINE" || be.type === "POLYLINE") {
                const verts = be.vertices;
                if (!verts?.length) return;
                ctx.beginPath();
                const s0 = toScreen(tx(verts[0].x), ty(verts[0].y));
                ctx.moveTo(s0.sx, s0.sy);
                for (let i = 1; i < verts.length; i++) {
                  const sv = toScreen(tx(verts[i].x), ty(verts[i].y));
                  ctx.lineTo(sv.sx, sv.sy);
                }
                if (be.shape) ctx.closePath();
                ctx.stroke();
              } else if (be.type === "CIRCLE") {
                const c = toScreen(tx(be.center.x), ty(be.center.y));
                ctx.beginPath();
                ctx.arc(c.sx, c.sy, be.radius * scale * sx, 0, Math.PI * 2);
                ctx.stroke();
              } else if (be.type === "ARC") {
                const c = toScreen(tx(be.center.x), ty(be.center.y));
                ctx.beginPath();
                ctx.arc(c.sx, c.sy, be.radius * scale * sx, -be.endAngle * Math.PI / 180, -be.startAngle * Math.PI / 180);
                ctx.stroke();
              } else if (be.type === "TEXT" || be.type === "MTEXT") {
                const bpos = be.startPoint || be.position || be.insertionPoint;
                if (!bpos) return;
                const p2 = toScreen(tx(bpos.x), ty(bpos.y));
                const fontSize = Math.max(8, (be.textHeight || 2.5) * scale);
                ctx.font = `${fontSize}px sans-serif`;
                ctx.fillText(be.text || be.string || "", p2.sx, p2.sy);
              }
            } catch (_) {}
          });
        } else {
          // fallback dot
          const p = toScreen(pos.x, pos.y);
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } catch (_) {}
  });
}

function collectPoints(entity, offsetX = 0, offsetY = 0, sx = 1, sy = 1) {
  const pts = [];
  if (entity.vertices) pts.push(...entity.vertices.map(v => ({ x: v.x * sx + offsetX, y: v.y * sy + offsetY })));
  if (entity.startPoint) pts.push({ x: entity.startPoint.x * sx + offsetX, y: entity.startPoint.y * sy + offsetY });
  if (entity.endPoint) pts.push({ x: entity.endPoint.x * sx + offsetX, y: entity.endPoint.y * sy + offsetY });
  if (entity.center) {
    const r = entity.radius || 0;
    pts.push({ x: entity.center.x * sx + offsetX - r, y: entity.center.y * sy + offsetY - r });
    pts.push({ x: entity.center.x * sx + offsetX + r, y: entity.center.y * sy + offsetY + r });
  }
  if (entity.position && !entity.vertices) pts.push({ x: entity.position.x * sx + offsetX, y: entity.position.y * sy + offsetY });
  return pts;
}

function computeBounds(dxf) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const addPt = (p) => {
    if (p?.x != null && isFinite(p.x) && isFinite(p.y)) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  };
  (dxf?.entities || []).forEach(e => {
    if (e.type === "INSERT" && e.position) {
      const block = dxf.blocks?.[e.name];
      const isx = e.xScale ?? 1, isy = e.yScale ?? 1;
      (block?.entities || []).forEach(be => {
        collectPoints(be, e.position.x, e.position.y, isx, isy).forEach(addPt);
      });
      if (!block?.entities?.length) addPt(e.position);
    } else {
      collectPoints(e).forEach(addPt);
    }
  });
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

function fitTransform(bounds, canvasW, canvasH) {
  if (!bounds) return { offsetX: 0, offsetY: 0, scale: 1 };
  const w = bounds.maxX - bounds.minX, h = bounds.maxY - bounds.minY;
  if (w === 0 || h === 0) return { offsetX: 0, offsetY: 0, scale: 1 };
  const pad = 40;
  const scale = Math.min((canvasW - pad * 2) / w, (canvasH - pad * 2) / h);
  const offsetX = (canvasW - w * scale) / 2 - bounds.minX * scale;
  const offsetY = (canvasH - h * scale) / 2 - bounds.minY * scale;
  return { offsetX, offsetY, scale };
}

export default function DxfViewer({ file, onClose }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dxf, setDxf] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState({});
  const [layerList, setLayerList] = useState([]);
  const [transform, setTransform] = useState({ offsetX: 0, offsetY: 0, scale: 1 });
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const boundsRef = useRef(null);
  const dragRef = useRef(null);

  // Load & parse DXF
  useEffect(() => {
    setLoading(true); setError(null); setDxf(null);
    fetch(file.url, { headers: { 'Accept': 'text/plain, */*' } })
      .then(r => r.blob())
      .then(blob => blob.text())
      .then(text => {
        const parser = new DxfParser();
        const parsed = parser.parseSync(text);
        setDxf(parsed);

        // Build layer list
        const layerDefs = parsed?.tables?.layer?.layers || {};
        const layersFromEntities = [...new Set((parsed?.entities || []).map(e => e.layer || "0"))];
        const allLayers = [...new Set([...Object.keys(layerDefs), ...layersFromEntities])];
        setLayerList(allLayers);
        const vis = {};
        allLayers.forEach(l => { vis[l] = true; });
        setVisibleLayers(vis);

        boundsRef.current = computeBounds(parsed);
        setLoading(false);
      })
      .catch(err => { setError("Failed to load or parse DXF file."); setLoading(false); });
  }, [file.url]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const e = entries[0].contentRect;
      setCanvasSize({ w: Math.floor(e.width), h: Math.floor(e.height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Fit on load or resize
  useEffect(() => {
    if (dxf && canvasSize.w > 100) {
      setTransform(fitTransform(boundsRef.current, canvasSize.w, canvasSize.h));
    }
  }, [dxf, canvasSize.w, canvasSize.h]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dxf) return;
    renderDxf(canvas, dxf, visibleLayers, transform);
  }, [dxf, visibleLayers, transform, canvasSize]);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    setTransform(prev => ({
      scale: prev.scale * factor,
      offsetX: cx - (cx - prev.offsetX) * factor,
      offsetY: cy - (cy - prev.offsetY) * factor,
    }));
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Pan (mouse + touch)
  const handlePointerDown = (e) => {
    e.preventDefault();
    if (e.touches?.length === 2) return; // pinch handled separately
    const pt = e.touches ? e.touches[0] : e;
    dragRef.current = { x: pt.clientX, y: pt.clientY, startTransform: { ...transform } };
    canvasRef.current?.setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    if (e.touches?.length === 2) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - dragRef.current.x, dy = pt.clientY - dragRef.current.y;
    const st = dragRef.current.startTransform;
    setTransform(prev => ({ ...prev, offsetX: st.offsetX + dx, offsetY: st.offsetY + dy }));
  };
  const handlePointerUp = () => { dragRef.current = null; };

  // Pinch to zoom
  const pinchRef = useRef(null);
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), transform: { ...transform } };
    } else {
      handlePointerDown(e);
    }
  };
  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const factor = newDist / pinchRef.current.dist;
      const st = pinchRef.current.transform;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = canvasRef.current.getBoundingClientRect();
      const lx = cx - rect.left, ly = cy - rect.top;
      setTransform({
        scale: st.scale * factor,
        offsetX: lx - (lx - st.offsetX) * factor,
        offsetY: ly - (ly - st.offsetY) * factor,
      });
    } else {
      handlePointerMove(e);
    }
  };

  const fitToScreen = () => {
    setTransform(fitTransform(boundsRef.current, canvasSize.w, canvasSize.h));
  };

  const toggleLayer = (name) => {
    setVisibleLayers(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const getLayerColor = (name) => {
    const layerDefs = dxf?.tables?.layer?.layers || {};
    const color = layerDefs[name]?.color;
    if (!color || color === 256) return "#00d4ff";
    return aciToHex(color);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex bg-[#1a1a2e]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 bg-[#0f0f1a]/90 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm truncate max-w-xs">{file.name}</span>
          {!loading && !error && <span className="text-white/40 text-xs">{layerList.length} layers · {dxf?.entities?.length || 0} entities</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-white/70 hover:text-white h-8 gap-1" onClick={fitToScreen}>
            <Maximize2 className="w-3.5 h-3.5" />Fit
          </Button>
          <Button size="sm" variant="ghost" className="text-white/70 hover:text-white h-8 w-8 p-0" onClick={() => setTransform(t => ({ ...t, scale: t.scale * 1.2 }))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-white/70 hover:text-white h-8 w-8 p-0" onClick={() => setTransform(t => ({ ...t, scale: t.scale / 1.2 }))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-white/70 hover:text-white h-8 w-8 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 mt-12" ref={containerRef}>
        {loading && (
          <div className="flex items-center justify-center h-full text-white/60">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Parsing DXF file...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-red-400">
            <div className="text-center">
              <p className="font-semibold mb-2">Failed to load DXF</p>
              <p className="text-sm text-red-400/70">{error}</p>
            </div>
          </div>
        )}
        {!loading && !error && (
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{ cursor: dragRef.current ? "grabbing" : "grab", display: "block", touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handlePointerUp}
          />
        )}
      </div>

      {/* Layers panel */}
      {!loading && !error && layerList.length > 0 && (
        <div className="w-52 mt-12 bg-[#0f0f1a]/95 border-l border-white/10 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10">
            <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Layers ({layerList.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {layerList.map(name => (
              <button
                key={name}
                onClick={() => toggleLayer(name)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${visibleLayers[name] ? "hover:bg-white/5 text-white" : "text-white/30 hover:bg-white/5"}`}
              >
                <span className="w-3 h-3 rounded-sm flex-shrink-0 border" style={{ background: visibleLayers[name] ? getLayerColor(name) : "transparent", borderColor: getLayerColor(name) }} />
                {visibleLayers[name] ? <Eye className="w-3 h-3 flex-shrink-0 text-white/40" /> : <EyeOff className="w-3 h-3 flex-shrink-0" />}
                <span className="text-xs truncate">{name}</span>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-white/10 flex gap-1">
            <Button size="sm" variant="ghost" className="flex-1 text-xs text-white/50 h-7 hover:text-white"
              onClick={() => { const v = {}; layerList.forEach(l => v[l] = true); setVisibleLayers(v); }}>
              All
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-xs text-white/50 h-7 hover:text-white"
              onClick={() => { const v = {}; layerList.forEach(l => v[l] = false); setVisibleLayers(v); }}>
              None
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}