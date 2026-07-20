import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";

const SHORTCUTS = {
  global: {
    title: "Global",
    items: [
      { keys: "Ctrl/Cmd + K", action: "Open command palette" },
      { keys: "Ctrl/Cmd + /", action: "Show this help" },
      { keys: "Esc", action: "Close modal / overlay" },
    ],
  },
  presentations: {
    title: "Presentations",
    items: [
      { keys: "↑ ↓ ← →", action: "Navigate slides" },
      { keys: "Ctrl/Cmd + D", action: "Duplicate slide" },
      { keys: "Ctrl/Cmd + S", action: "Save slide" },
      { keys: "Delete / Backspace", action: "Delete selected object" },
      { keys: "Ctrl/Cmd + C", action: "Copy object" },
      { keys: "Ctrl/Cmd + V", action: "Paste object" },
      { keys: "Ctrl/Cmd + Z", action: "Undo" },
      { keys: "Ctrl/Cmd + Shift + Z", action: "Redo" },
      { keys: "T", action: "Text tool" },
      { keys: "V", action: "Select / Move tool" },
      { keys: "R", action: "Rectangle tool" },
      { keys: "C", action: "Crop tool" },
      { keys: "+ / =", action: "Zoom in" },
      { keys: "-", action: "Zoom out" },
      { keys: "0", action: "Reset zoom" },
    ],
  },
  flow: {
    title: "Flow Board",
    items: [
      { keys: "R", action: "Route drawing tool" },
      { keys: "V", action: "Select tool" },
      { keys: "L", action: "Label tool" },
      { keys: "Delete", action: "Delete selected zone/route" },
      { keys: "+ / =", action: "Zoom in" },
      { keys: "-", action: "Zoom out" },
      { keys: "0", action: "Fit to screen" },
      { keys: "Esc", action: "Cancel / deselect" },
    ],
  },
  projects: {
    title: "Project Board",
    items: [
      { keys: "N", action: "New project" },
      { keys: "↑ ↓", action: "Navigate project cards" },
    ],
  },
};

function getPageFromPath(pathname) {
  const p = pathname.replace(/^\/+/, "").toLowerCase();
  if (p === "" || p === "dashboard") return "dashboard";
  if (p.startsWith("presentation")) return "presentations";
  if (p === "flow") return "flow";
  if (p === "kanban") return "projects";
  return p;
}

export default function ShortcutHelpOverlay({ open, onClose }) {
  const location = useLocation();
  const activePage = getPageFromPath(location.pathname);

  const sections = useMemo(() => {
    const result = [SHORTCUTS.global];
    if (SHORTCUTS[activePage]) result.push(SHORTCUTS[activePage]);
    return result;
  }, [activePage]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
                {section.title}
              </h3>
              <table className="w-full">
                <tbody>
                  {section.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 pr-3">
                        <kbd className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.keys}
                        </kbd>
                      </td>
                      <td className="py-1.5 text-sm text-slate-600">{item.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div className="px-5 py-2.5 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-400">Press Esc to close</span>
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}