import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Eraser, Undo2, Trash2, Type, Search, StickyNote, Menu, X } from "lucide-react";
import { format } from "date-fns";

const COLORS = ["#1e1e1e", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];
const NOTE_COLORS = ["#fffef5", "#fff0f0", "#f0f7ff", "#f0fff4", "#fffbf0", "#faf0ff"];
const THICKNESS = { thin: 1.5, medium: 3.5, thick: 7 };

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function newNote() {
  return {
    id: generateId(),
    title: "",
    content: "",
    mode: "text",
    paths: [],
    color: "#fffef5",
    updatedAt: new Date().toISOString(),
  };
}

// ── Drawing Canvas ─────────────────────────────────────────────────────────────
function DrawCanvas({ paths, onPathsChange, bgColor }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#1e1e1e");
  const [thickness, setThickness] = useState("medium");

  // Refs for RAF — avoids stale closures
  const toolRef = useRef("pen");
  const colorRef = useRef("#1e1e1e");
  const thicknessRef = useRef("medium");
  const bgColorRef = useRef(bgColor);
  const isDrawing = useRef(false);
  const currentPath = useRef([]);
  const localPaths = useRef(paths);
  const rafScheduled = useRef(false);

  // Sync refs
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { thicknessRef.current = thickness; }, [thickness]);
  useEffect(() => { bgColorRef.current = bgColor; scheduleRedraw(); }, [bgColor]);
  useEffect(() => { localPaths.current = paths; scheduleRedraw(); }, [paths]);
  useEffect(() => { scheduleRedraw(); }, [color, thickness]);

  const scheduleRedraw = () => {
    if (rafScheduled.current) return;
    rafScheduled.current = true;
    requestAnimationFrame(() => {
      rafScheduled.current = false;
      redrawCanvas();
    });
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bgColorRef.current || "#fffef5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    localPaths.current.forEach((path) => {
      if (path.points.length < 2) return;
      drawPath(ctx, path.points, path.color, path.lineWidth);
    });
    if (currentPath.current.length > 1) {
      drawPath(ctx, currentPath.current, colorRef.current, THICKNESS[thicknessRef.current]);
    }
  };

  const drawPath = (ctx, points, strokeColor, lineWidth) => {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.stroke();
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const eraseAt = (pos) => {
    const t = THICKNESS[thicknessRef.current] * 8;
    const updated = localPaths.current.filter(
      (p) => !p.points.some((pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < t)
    );
    localPaths.current = updated;
    onPathsChange(updated);
    scheduleRedraw();
  };

  const onPointerDown = (e) => {
    if (e.pointerType !== "pen") return; // Ignore finger touch
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const pos = getPos(e);
    if (toolRef.current === "eraser") { eraseAt(pos); return; }
    currentPath.current = [pos];
    scheduleRedraw();
  };

  const onPointerMove = (e) => {
    if (!isDrawing.current || e.pointerType !== "pen") return;
    e.preventDefault();
    const pos = getPos(e);
    if (toolRef.current === "eraser") { eraseAt(pos); return; }
    currentPath.current = [...currentPath.current, pos];
    scheduleRedraw();
  };

  const onPointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (toolRef.current === "pen" && currentPath.current.length > 0) {
      const updated = [
        ...localPaths.current,
        { points: currentPath.current, color: colorRef.current, lineWidth: THICKNESS[thicknessRef.current] },
      ];
      localPaths.current = updated;
      onPathsChange(updated);
      currentPath.current = [];
      scheduleRedraw();
    }
  };

  const undo = () => {
    const updated = localPaths.current.slice(0, -1);
    localPaths.current = updated;
    onPathsChange(updated);
    scheduleRedraw();
  };

  const clear = () => {
    localPaths.current = [];
    currentPath.current = [];
    onPathsChange([]);
    scheduleRedraw();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Draw toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white flex-wrap gap-y-2">
        {/* Pen / Eraser */}
        <div className="flex gap-2">
          <button
            onClick={() => setTool("pen")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tool === "pen" ? "bg-amber-500 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Pencil className="w-4 h-4" /> Pen
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tool === "eraser" ? "bg-slate-700 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Eraser className="w-4 h-4" /> Eraser
          </button>
        </div>

        {/* Thickness presets */}
        <div className="flex gap-2 items-center">
          {Object.entries(THICKNESS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setThickness(key)}
              className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${
                thickness === key ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              title={key}
            >
              <div
                className="rounded-full bg-slate-700"
                style={{ width: Math.min(val * 3, 16), height: Math.min(val * 3, 16) }}
              />
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              className="rounded-full transition-all flex-shrink-0"
              style={{
                backgroundColor: c,
                width: 28, height: 28,
                border: `3px solid ${color === c ? "#f59e0b" : "transparent"}`,
                boxShadow: color === c ? "0 0 0 1px #f59e0b" : "0 1px 3px rgba(0,0,0,0.25)",
                transform: color === c ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {/* Undo / Clear */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={undo}
            className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={clear}
            className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-xl text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stylus hint */}
      <div className="bg-amber-50 border-b border-amber-100 text-amber-700 text-xs text-center py-1.5">
        ✏️ Apple Pencil / stylus only — finger touch is ignored to prevent smudges
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={2400}
          height={1800}
          className="w-full h-full"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair", touchAction: "none", display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  );
}

// ── Main Notepad Page ──────────────────────────────────────────────────────────
export default function Notepad() {
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const storageKey = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    base44.auth.me().then((u) => {
      const key = `notes_v2_${u.email}`;
      storageKey.current = key;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotes(parsed);
        if (parsed.length > 0) setSelectedId(parsed[0].id);
      } else {
        const first = newNote();
        first.title = "My First Note";
        first.content = "Welcome to your notepad! ✏️\n\nSwitch between typing and drawing using the toolbar above.";
        setNotes([first]);
        setSelectedId(first.id);
      }
    });
  }, []);

  const save = (updated) => {
    if (!storageKey.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(storageKey.current, JSON.stringify(updated));
    }, 300);
  };

  const updateNote = (id, changes) => {
    setNotes((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n
      );
      save(updated);
      return updated;
    });
  };

  const addNote = () => {
    const n = newNote();
    setNotes((prev) => {
      const updated = [n, ...prev];
      save(updated);
      return updated;
    });
    setSelectedId(n.id);
    setSidebarOpen(false);
  };

  const deleteNote = (id) => {
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      save(updated);
      if (selectedId === id) setSelectedId(updated[0]?.id || null);
      return updated;
    });
  };

  const selectedNote = notes.find((n) => n.id === selectedId);

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  const preview = (note) => {
    const lines = note.content.split("\n").filter((l) => l.trim());
    return lines[0] || (note.paths?.length ? "✏️ Drawing" : "No additional text");
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">

      {/* Backdrop for sidebar on iPad */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:relative z-20 lg:z-auto
          h-full w-80 flex-shrink-0
          flex flex-col bg-white border-r border-slate-200 shadow-xl lg:shadow-sm
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:-translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0"}
        `}
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100">
          <StickyNote className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span className="font-bold text-slate-800 text-lg flex-1">Notes</span>
          <button
            onClick={addNote}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="bg-transparent text-sm outline-none flex-1 text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">No notes found</div>
          )}
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => { setSelectedId(note.id); setSidebarOpen(false); }}
              className={`px-4 py-4 border-b border-slate-100 cursor-pointer hover:bg-amber-50 transition-colors ${
                selectedId === note.id ? "bg-amber-50 border-l-4 border-l-amber-400" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{note.title || "Untitled"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{format(new Date(note.updatedAt), "MMM d, yyyy")}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{preview(note)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                  className="p-1.5 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-100 text-center text-xs text-slate-400">
          {notes.length} note{notes.length !== 1 ? "s" : ""} · Auto-saved
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNote ? (
          <>
            {/* Note toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200 shadow-sm flex-wrap gap-y-2">
              {/* Hamburger */}
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              <input
                value={selectedNote.title}
                onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                placeholder="Note title..."
                className="flex-1 text-lg font-bold text-slate-800 outline-none bg-transparent placeholder-slate-300 min-w-0"
              />

              {/* Mode toggle — large tap targets */}
              <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => updateNote(selectedNote.id, { mode: "text" })}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                    selectedNote.mode === "text" ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Type className="w-4 h-4" /> Type
                </button>
                <button
                  onClick={() => updateNote(selectedNote.id, { mode: "draw" })}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                    selectedNote.mode === "draw" ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Pencil className="w-4 h-4" /> Draw
                </button>
              </div>

              {/* Note background colors — large dots */}
              <div className="flex items-center gap-2">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateNote(selectedNote.id, { color: c })}
                    className="rounded-full transition-all hover:scale-110 flex-shrink-0"
                    style={{
                      backgroundColor: c,
                      width: 30, height: 30,
                      border: `3px solid ${selectedNote.color === c ? "#f59e0b" : "#d1d5db"}`,
                      boxShadow: selectedNote.color === c ? "0 0 0 1px #f59e0b" : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Note content */}
            <div className="flex-1 overflow-hidden" style={{ backgroundColor: selectedNote.color }}>
              {selectedNote.mode === "text" ? (
                <textarea
                  value={selectedNote.content}
                  onChange={(e) => updateNote(selectedNote.id, { content: e.target.value })}
                  placeholder="Start writing..."
                  className="w-full h-full p-6 resize-none outline-none text-slate-700 leading-relaxed bg-transparent"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "16px" }}
                  autoFocus
                />
              ) : (
                <DrawCanvas
                  paths={selectedNote.paths || []}
                  onPathsChange={(paths) => updateNote(selectedNote.id, { paths })}
                  bgColor={selectedNote.color}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <StickyNote className="w-16 h-16 mb-4 text-slate-200" />
            <p className="text-lg font-medium">No note selected</p>
            <p className="text-sm mt-1">Select a note or create a new one</p>
            <button
              onClick={addNote}
              className="mt-4 flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}