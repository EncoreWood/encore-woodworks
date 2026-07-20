import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, CornerDownLeft } from "lucide-react";
import {
  LayoutDashboard,
  Home,
  Calendar,
  Factory,
  FileText,
  Users,
  Coffee,
  Package,
  Wrench,
  Clipboard,
  MessageSquare,
  Workflow,
  ShoppingCart,
  GraduationCap,
  StickyNote,
} from "lucide-react";

const COMMANDS = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard", group: "Dashboard" },
  { label: "Employee Dashboard", icon: Users, page: "EmployeeDashboard", group: "Dashboard" },
  { label: "Projects Board", icon: Home, page: "Kanban", group: "Projects" },
  { label: "Calendar", icon: Calendar, page: "Calendar", group: "Operations" },
  { label: "Production", icon: Factory, page: "ShopProduction", group: "Operations" },
  { label: "Presentations", icon: FileText, page: "Presentations", group: "Projects" },
  { label: "Project Orders", icon: ShoppingCart, page: "OrdersBoard", group: "Projects" },
  { label: "Pick Up List", icon: Clipboard, page: "PickupList", group: "Projects" },
  { label: "Project Estimates", icon: FileText, page: "PlanBidding", group: "Projects" },
  { label: "Invoicing", icon: FileText, page: "Invoicing", group: "Projects" },
  { label: "Inventory", icon: Package, page: "Inventory", group: "Operations" },
  { label: "Purchase Orders", icon: Package, page: "PurchaseOrders", group: "Operations" },
  { label: "Suppliers", icon: Wrench, page: "Suppliers", group: "Operations" },
  { label: "Tools", icon: Wrench, page: "Tools", group: "Operations" },
  { label: "SOPs", icon: FileText, page: "SOPBoard", group: "Operations" },
  { label: "Notepad", icon: StickyNote, page: "Notepad", group: "Operations" },
  { label: "Morning Meeting", icon: Coffee, page: "MorningMeeting", group: "Team" },
  { label: "Team", icon: Users, page: "Team", group: "Team" },
  { label: "Time Sheet", icon: Coffee, page: "TimeSheet", group: "Team" },
  { label: "Chat", icon: MessageSquare, page: "ChatBoard", group: "Team" },
  { label: "Forms", icon: FileText, page: "Forms", group: "Team" },
  { label: "Trainings", icon: GraduationCap, page: "Trainings", group: "Team" },
  { label: "Flow Board", icon: Workflow, page: "Flow", group: "Team" },
  { label: "Group Lean", icon: Users, page: "GroupLean", group: "Lean" },
  { label: "Individual Lean", icon: Users, page: "IndividualLean", group: "Lean" },
];

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const item = listRef.current?.children[selectedIdx];
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx, open]);

  if (!open) return null;

  const execute = (cmd) => {
    if (!cmd) return;
    navigate(createPageUrl(cmd.page));
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      execute(filtered[selectedIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands or navigate..."
            className="flex-1 outline-none text-sm text-slate-900 placeholder-slate-400 bg-transparent"
          />
          <kbd className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No commands found</p>
          ) : (
            filtered.map((cmd, idx) => (
              <button
                key={cmd.page}
                onClick={() => execute(cmd)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === selectedIdx ? "bg-amber-50" : "hover:bg-slate-50"
                }`}
              >
                <cmd.icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="flex-1 text-sm text-slate-800">{cmd.label}</span>
                <span className="text-xs text-slate-400">{cmd.group}</span>
                {idx === selectedIdx && <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}