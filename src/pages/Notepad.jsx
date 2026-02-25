import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Eraser, Undo2, Trash2, Type, Search, StickyNote, Minus, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

const COLORS = ["#1e1e1e", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];
const NOTE_COLORS = ["#fffef5", "#fff0f0", "#f0f7ff", "#f0fff4", "#fffbf0", "#faf0ff"];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function newNote() {
  return {
    id: generateId(),
    title: "",
    content: "",
    mode: "text", // "text" | "draw"
    paths: [],
    color: "#fffef5",
    updatedAt: new Date().toISOString(),
  };
}

// ── Drawing Canvas ────────────────────────────────────────────────────────────
function DrawCanvas({ paths, onPathsChange, bgColor }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#1e1e1e");
  const [lineWidth, setLineWidth] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const localPaths = useRef(paths);

  // keep localPaths in sync
  useEffect(() => { localPaths.current = paths; }, [paths]);

  useEffect(() => {
    redraw(paths, currentPath, color, lineWidth, bgColor);
  }, [paths, currentPath, color, lineWidth, bgColor]);

  const redraw = (allPaths, cur, col, lw, bg) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bg || "#fffef5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    allPaths.forEach((path) => {
      if (path.points.length < 2) return;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.lineWidth || 3;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      path.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
    });
    if (cur.length > 1) {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      cur.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
    }
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const src = e.touches?.[0] || e.changedTouches?.[0] || e;
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy };
  };

  const eraseAt = (pos) => {
    const t = lineWidth * 6;
    const updated = localPaths.current.filter(p => !p.points.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < t));
    localPaths.current = updated;
    onPathsChange(updated);
  };

  const onDown = (e) => {
    if (e.type === "mousedown" && e.sourceCapabilities?.firesTouchEvents) return;
    e.preventDefault();
    setDrawing(true);
    const pos = getPos(e);
    if (tool === "eraser") { eraseAt(pos); return; }
    setCurrentPath([pos]);
  };

  const onMove = (e) => {
    if (!drawing) return;
    if (e.type === "mousemove" && e.sourceCapabilities?.firesTouchEvents) return;
    e.preventDefault();
    const pos = getPos(e);
    if (tool === "eraser") { eraseAt(pos); return; }
    setCurrentPath(prev => [...prev, pos]);
  };

  const onUp = (e) => {
    if (e?.type === "mouseup" && e.sourceCapabilities?.firesTouchEvents) return;
    if (drawing && tool === "pen" && currentPath.length > 0) {
      const updated = [...localPaths.current, { points: currentPath, color, lineWidth }];
      localPaths.current = updated;
      onPathsChange(updated);
      setCurrentPath([]);
    }
    setDrawing(false);
  };

  const undo = () => {
    const updated = localPaths.current.slice(0, -1);
    localPaths.current = updated;
    onPathsChange(updated);
  };

  const clear = () => { localPaths.current = []; onPathsChange([]); };

  return (
    <div className="flex flex-col h-full">
      {/* Draw toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 flex-wrap bg-white/80">
        <Button size="sm" variant={tool === "pen" ? "default" : "outline"} onClick={() => setTool("pen")}
          className={tool === "pen" ? "bg-amber-600 hover:bg-amber-700 h-7 px-2" : "h-7 px-2"}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant={tool === "eraser" ? "default" : "outline"} onClick={() => setTool("eraser")}
          className={tool === "eraser" ? "bg-slate-600 hover:bg-slate-700 h-7 px-2" : "h-7 px-2"}>
          <Eraser className="w-3.5 h-3.5" />
        </Button>
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); setTool("pen"); }}
              className="w-5 h-5 rounded-full border-2 transition-transform"
              style={{ backgroundColor: c, borderColor: color === c ? "#f59e0b" : "#d1d5db", transform: color === c ? "scale(1.25)" : "scale(1)" }} />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setLineWidth(w => Math.max(1, w - 1))} className="text-slate-500 hover:text-slate-800"><Minus className="w-3.5 h-3.5" /></button>
          <span className="text-xs w-4 text-center text-slate-600">{lineWidth}</span>
          <button onClick={() => setLineWidth(w => Math.min(20, w + 1))} className="text-slate-500 hover:text-slate-800"><Plus className="w-3.5 h-3.5" /></button>
        </div>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="outline" onClick={undo} className="h-7 px-2"><Undo2 className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="outline" onClick={clear} className="h-7 px-2 text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <canvas ref={canvasRef} width={1200} height={900}
          className="w-full h-full"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair", touchAction: "none", display: "block" }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        />
      </div>
    </div>
  );
}

// ── Main Notepad Page ─────────────────────────────────────────────────────────
export default function Notepad() {
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const storageKey = useRef(null);
  const saveTimer = useRef(null);

  // Load user + notes
  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
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
    }, 400);
  };

  const updateNote = (id, changes) => {
    setNotes(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n);
      save(updated);
      return updated;
    });
  };

  const addNote = () => {
    const n = newNote();
    setNotes(prev => {
      const updated = [n, ...prev];
      save(updated);
      return updated;
    });
    setSelectedId(n.id);
    setSidebarOpen(false);
  };

  const deleteNote = (id) => {
    setNotes(prev => {
      const updated = prev.filter(n => n.id !== id);
      save(updated);
      if (selectedId === id) setSelectedId(updated[0]?.id || null);
      return updated;
    });
  };

  const selectedNote = notes.find(n => n.id === selectedId);

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const preview = (note) => {
    const lines = note.content.split("\n").filter(l => l.trim());
    return lines[0] || (note.paths?.length ? "✏️ Drawing" : "No additional text");
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">

      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-72" : "w-0"} flex-shrink-0 transition-all duration-300 overflow-hidden flex flex-col bg-white border-r border-slate-200 shadow-sm`}>
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100">
          <StickyNote className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span className="font-bold text-slate-800 text-lg flex-1">Notes</span>
          <button onClick={addNote} className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
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
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => { setSelectedId(note.id); setSidebarOpen(window.innerWidth > 768); }}
              className={`px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-amber-50 transition-colors ${selectedId === note.id ? "bg-amber-50 border-l-4 border-l-amber-400" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{note.title || "Untitled"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{format(new Date(note.updatedAt), "MMM d, yyyy")}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{preview(note)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                  className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
              <button onClick={() => setSidebarOpen(o => !o)} className="text-slate-500 hover:text-slate-800 mr-1">
                <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
              </button>

              <input
                value={selectedNote.title}
                onChange={e => updateNote(selectedNote.id, { title: e.target.value })}
                placeholder="Note title..."
                className="flex-1 text-lg font-bold text-slate-800 outline-none bg-transparent placeholder-slate-300"
              />

              {/* Mode toggle */}
              <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => updateNote(selectedNote.id, { mode: "text" })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${selectedNote.mode === "text" ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  <Type className="w-3.5 h-3.5" /> Type
                </button>
                <button
                  onClick={() => updateNote(selectedNote.id, { mode: "draw" })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${selectedNote.mode === "draw" ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  <Pencil className="w-3.5 h-3.5" /> Draw
                </button>
              </div>

              {/* Note background color */}
              <div className="flex items-center gap-1 ml-1">
                {NOTE_COLORS.map(c => (
                  <button key={c} onClick={() => updateNote(selectedNote.id, { color: c })}
                    className="w-4 h-4 rounded-full border transition-transform hover:scale-125"
                    style={{ backgroundColor: c, borderColor: selectedNote.color === c ? "#f59e0b" : "#d1d5db" }} />
                ))}
              </div>
            </div>

            {/* Note content */}
            <div className="flex-1 overflow-hidden" style={{ backgroundColor: selectedNote.color }}>
              {selectedNote.mode === "text" ? (
                <textarea
                  value={selectedNote.content}
                  onChange={e => updateNote(selectedNote.id, { content: e.target.value })}
                  placeholder="Start writing..."
                  className="w-full h-full p-6 resize-none outline-none text-slate-700 text-base leading-relaxed bg-transparent"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "15px" }}
                  autoFocus
                />
              ) : (
                <DrawCanvas
                  paths={selectedNote.paths || []}
                  onPathsChange={paths => updateNote(selectedNote.id, { paths })}
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
            <button onClick={addNote} className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}