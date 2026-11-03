import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Copy, Trash2, GripVertical, Plus, SlidersHorizontal } from "lucide-react";
import { finishSuggestion, usesMainSelections } from "./roomSelections";

const cellInput =
  "h-9 text-sm border-transparent bg-transparent hover:border-slate-200 focus:border-amber-400 focus-visible:ring-0 shadow-none";

/**
 * One room row: name, finish, items of recognition, price — plus the per-room
 * controls in the last column (add upgrade, room selections, reorder, duplicate,
 * delete). Its upgrades and selections panel render right beneath it.
 */
export default function RoomRow({
  room, index, total, mainFields, upgradeCount = 0, selectionsOpen,
  onChange, onMove, onDuplicate, onDelete, onAddUpgrade, onToggleSelections,
}) {
  const set = (field, value) => onChange(room.id, { [field]: value });
  const isCustom = !usesMainSelections(room);

  return (
    <tr className="border-b border-slate-100 align-top group bg-white">
      <td className="p-1 w-8">
        <div className="flex items-center justify-center text-slate-300">
          <GripVertical className="w-4 h-4" />
        </div>
      </td>
      <td className="p-1 min-w-[130px]">
        <Input value={room.room_name || ""} onChange={(e) => set("room_name", e.target.value)} placeholder="Kitchen" className={cellInput + " font-medium"} />
        <div className="flex items-center gap-1.5 px-1 pb-1 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${isCustom ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
            {isCustom ? "Custom" : "Main"}
          </span>
          {upgradeCount > 0 && (
            <span className="text-[10px] text-slate-400">{upgradeCount} upgrade{upgradeCount === 1 ? "" : "s"}</span>
          )}
        </div>
      </td>
      <td className="p-1 min-w-[150px]">
        <Input
          value={room.finish || ""}
          onChange={(e) => set("finish", e.target.value)}
          placeholder={finishSuggestion(room, mainFields) || "Paint Grade / White Oak Island"}
          className={cellInput}
        />
      </td>
      <td className="p-1 min-w-[200px]">
        <Input value={room.items_of_recognition || ""} onChange={(e) => set("items_of_recognition", e.target.value)} placeholder="Perimeter uppers, island, paneled fridge surround" className={cellInput} />
      </td>
      <td className="p-1 w-40">
        <Input
          value={room.price ?? ""}
          onChange={(e) => set("price", e.target.value)}
          onBlur={(e) => set("price", parseFloat(e.target.value) || 0)}
          inputMode="decimal"
          placeholder="0"
          className={cellInput + " text-right font-semibold"}
        />
      </td>
      <td className="p-1 w-48">
        <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={onAddUpgrade} title="Add an upgrade to this room">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${selectionsOpen || isCustom ? "text-amber-700 bg-amber-50" : "text-slate-500"}`}
            onClick={onToggleSelections}
            title="Room selections"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(room.id, -1)} title="Move up">
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove(room.id, 1)} title="Move down">
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(room.id)} title="Duplicate room (with its upgrades)">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => onDelete(room.id)} title="Delete room">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

const emptyDraft = { room_name: "", finish: "", items_of_recognition: "", price: "" };

/**
 * Quick-entry row: type across the fields and press Enter to add the row and
 * keep going with the next room — the fastest way to fill out a proposal.
 */
export function QuickAddRoomRow({ onAdd, optional = false }) {
  const [draft, setDraft] = useState(emptyDraft);

  const commit = () => {
    if (!draft.room_name.trim() && !draft.price) return;
    onAdd({
      room_name: draft.room_name.trim(),
      finish: draft.finish.trim(),
      items_of_recognition: draft.items_of_recognition.trim(),
      price: parseFloat(draft.price) || 0,
    });
    setDraft(emptyDraft);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") setDraft(emptyDraft);
  };

  return (
    <tr className="bg-amber-50/40">
      <td className="p-1 w-8 text-center text-amber-500 text-lg leading-none">+</td>
      <td className="p-1">
        <Input value={draft.room_name} onChange={(e) => setDraft({ ...draft, room_name: e.target.value })} onKeyDown={handleKey} placeholder={optional ? "Pool Bath" : "Add room…"} className={cellInput + " placeholder:text-amber-700/60"} />
      </td>
      <td className="p-1">
        <Input value={draft.finish} onChange={(e) => setDraft({ ...draft, finish: e.target.value })} onKeyDown={handleKey} placeholder="Finish / wood" className={cellInput} />
      </td>
      <td className="p-1">
        <Input value={draft.items_of_recognition} onChange={(e) => setDraft({ ...draft, items_of_recognition: e.target.value })} onKeyDown={handleKey} placeholder="Items of recognition" className={cellInput} />
      </td>
      <td className="p-1">
        <Input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} onKeyDown={handleKey} inputMode="decimal" placeholder="0" className={cellInput + " text-right"} />
      </td>
      <td className="p-1 w-48">
        <Button size="sm" onClick={commit} className="h-8 w-full bg-amber-600 hover:bg-amber-700 text-xs">Add ⏎</Button>
      </td>
    </tr>
  );
}