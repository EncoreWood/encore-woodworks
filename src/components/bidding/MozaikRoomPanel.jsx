import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2, Download, AlertTriangle } from "lucide-react";

function generateDXF(room, walls) {
  const pts = room.points;
  const vertices = [];
  let x = 0, y = 0;

  for (let i = 0; i < pts.length; i++) {
    vertices.push({ x, y });
    const next = pts[(i + 1) % pts.length];
    const angle = Math.atan2(next.y - pts[i].y, next.x - pts[i].x);
    const realIn = walls[i].lengthIn;
    x += realIn * Math.cos(angle);
    y -= realIn * Math.sin(angle); // DXF Y flipped vs canvas Y
  }

  const layerName = (room.name || "ROOM").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  const cx = vertices.reduce((s, v) => s + v.x, 0) / vertices.length;
  const cy = vertices.reduce((s, v) => s + v.y, 0) / vertices.length;

  let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nENTITIES\n`;

  // Room outline polyline (closed)
  dxf += `0\nLWPOLYLINE\n8\n${layerName}\n90\n${vertices.length}\n70\n1\n`;
  for (const v of vertices) {
    dxf += `10\n${v.x.toFixed(4)}\n20\n${v.y.toFixed(4)}\n`;
  }

  // Room name label
  dxf += `0\nTEXT\n8\nLABELS\n10\n${cx.toFixed(4)}\n20\n${cy.toFixed(4)}\n30\n0.0\n40\n6.0\n1\n${room.name}\n`;
  dxf += `0\nTEXT\n8\nLABELS\n10\n${cx.toFixed(4)}\n20\n${(cy - 10).toFixed(4)}\n30\n0.0\n40\n4.0\n1\nCeiling: ${room.ceilingHeight}"\n`;

  // Openings as LINE entities
  walls.forEach((wall, i) => {
    (wall.openings || []).forEach(op => {
      const v0 = vertices[i];
      const v1 = vertices[(i + 1) % vertices.length];
      const wallAngle = Math.atan2(v1.y - v0.y, v1.x - v0.x);
      const sx = v0.x + op.fromLeft * Math.cos(wallAngle);
      const sy = v0.y + op.fromLeft * Math.sin(wallAngle);
      const ex = sx + op.width * Math.cos(wallAngle);
      const ey = sy + op.width * Math.sin(wallAngle);
      dxf += `0\nLINE\n8\nOPENINGS\n10\n${sx.toFixed(4)}\n20\n${sy.toFixed(4)}\n11\n${ex.toFixed(4)}\n21\n${ey.toFixed(4)}\n`;
    });
  });

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

function computeDefaultWalls(points, pxPerFtNat) {
  return points.map((pt, i) => {
    const next = points[(i + 1) % points.length];
    const pixelDist = Math.hypot(next.x - pt.x, next.y - pt.y);
    const realFt = pxPerFtNat ? pixelDist / pxPerFtNat : 0;
    const realIn = parseFloat((realFt * 12).toFixed(2));
    return { label: `Wall ${i + 1}`, lengthIn: realIn, openings: [] };
  });
}

export default function MozaikRoomPanel({ room, pxPerFtNat, projectName, onSave, onClose }) {
  const [name, setName] = useState(room.name || "");
  const [ceilingHeight, setCeilingHeight] = useState(room.ceilingHeight || 96);
  const [walls, setWalls] = useState(() =>
    room.walls ? room.walls : computeDefaultWalls(room.points, pxPerFtNat)
  );

  const handleDownload = () => {
    const roomData = { ...room, name, ceilingHeight };
    const dxf = generateDXF(roomData, walls);
    const blob = new Blob([dxf], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (projectName || "Project").replace(/[^a-zA-Z0-9]/g, "");
    const safeRoom = name.replace(/[^a-zA-Z0-9]/g, "") || "Room";
    a.href = url;
    a.download = `${safeName}_${safeRoom}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
    onSave({ ...room, name, ceilingHeight, walls });
  };

  const handleSaveOnly = () => {
    onSave({ ...room, name, ceilingHeight, walls });
    onClose();
  };

  const addOpening = (wi) => setWalls(prev => prev.map((w, i) => i !== wi ? w : {
    ...w, openings: [...(w.openings || []), { width: 36, height: 80, fromLeft: 12 }]
  }));

  const updateOpening = (wi, oi, field, val) => setWalls(prev => prev.map((w, i) => i !== wi ? w : {
    ...w, openings: w.openings.map((o, j) => j !== oi ? o : { ...o, [field]: parseFloat(val) || 0 })
  }));

  const removeOpening = (wi, oi) => setWalls(prev => prev.map((w, i) => i !== wi ? w : {
    ...w, openings: w.openings.filter((_, j) => j !== oi)
  }));

  const totalFt = walls.reduce((s, w) => s + w.lengthIn / 12, 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="font-bold text-slate-900 text-base">Room Details — Mozaik Export</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Room Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kitchen" autoFocus />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Ceiling Height (in)</label>
              <Input type="number" value={ceilingHeight} onChange={e => setCeilingHeight(parseInt(e.target.value) || 96)} />
            </div>
          </div>

          <div className="text-xs bg-slate-50 rounded-lg p-2.5 text-slate-500">
            <span className="font-bold text-slate-700">{walls.length} walls</span> · Total perimeter: <span className="font-bold text-slate-700">{totalFt.toFixed(1)} LF</span>
            {!pxPerFtNat && <span className="text-amber-600 ml-2">⚠ No scale set — wall lengths are 0</span>}
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Walls & Openings</h4>
            <div className="space-y-2">
              {walls.map((wall, wi) => (
                <div key={wi} className="border rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-600 min-w-[3rem]">Wall {wi + 1}</span>
                    <Input type="number" step="0.5" value={wall.lengthIn}
                      onChange={e => setWalls(prev => prev.map((w, i) => i !== wi ? w : { ...w, lengthIn: parseFloat(e.target.value) || 0 }))}
                      className="h-7 text-sm w-24" />
                    <span className="text-xs text-slate-400">in ({(wall.lengthIn / 12).toFixed(1)} ft)</span>
                    <button onClick={() => addOpening(wi)} className="ml-auto text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 whitespace-nowrap">
                      <Plus className="w-3 h-3" />Opening
                    </button>
                  </div>
                  {(wall.openings || []).map((op, oi) => (
                    <div key={oi} className="flex items-center gap-1.5 mt-2 ml-4 p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-xs text-slate-500 w-12 flex-shrink-0">Opening</span>
                      <label className="text-xs text-slate-400">W:</label>
                      <Input type="number" value={op.width} onChange={e => updateOpening(wi, oi, "width", e.target.value)} className="h-6 text-xs w-14 px-1" />
                      <label className="text-xs text-slate-400">H:</label>
                      <Input type="number" value={op.height} onChange={e => updateOpening(wi, oi, "height", e.target.value)} className="h-6 text-xs w-14 px-1" />
                      <label className="text-xs text-slate-400">@:</label>
                      <Input type="number" value={op.fromLeft} onChange={e => updateOpening(wi, oi, "fromLeft", e.target.value)} className="h-6 text-xs w-14 px-1" />
                      <button onClick={() => removeOpening(wi, oi)} className="ml-auto flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Dimensions are estimated from plan scale — verify with site measurements before building.</p>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2 flex-shrink-0">
          <Button onClick={handleDownload} disabled={!name.trim()} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Download className="w-4 h-4" />Export for Mozaik (.dxf)
          </Button>
          <Button variant="outline" onClick={handleSaveOnly} disabled={!name.trim()}>Save Room</Button>
        </div>
      </div>
    </div>
  );
}