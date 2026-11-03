import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Copy, Trash2 } from "lucide-react";

const ROOM_NONE = "__none__";

/** One upgrade / add-on option, inline editable. */
export default function OptionRow({ option, index, total, rooms, onChange, onMove, onDuplicate, onDelete }) {
  const set = (field, value) => onChange(option.id, { [field]: value });

  const changeRoom = (value) => {
    const roomId = value === ROOM_NONE ? null : value;
    const room = rooms.find((r) => r.id === roomId);
    onChange(option.id, { parent_room_id: roomId || "", parent_room_name: room?.room_name || "" });
  };

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-start gap-2">
        <Input value={option.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Upgrade to soft-close undermount drawers" className="h-9 font-medium" />
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => onMove(option.id, -1)} title="Move up">
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === total - 1} onClick={() => onMove(option.id, 1)} title="Move down">
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(option.id)} title="Duplicate option">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => onDelete(option.id)} title="Delete option">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Textarea
        value={option.description || ""}
        onChange={(e) => set("description", e.target.value)}
        placeholder="What this option includes"
        rows={2}
        className="text-sm resize-none"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={option.parent_room_id || ROOM_NONE} onValueChange={changeRoom}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Whole job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROOM_NONE}>Whole job</SelectItem>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>{room.room_name || "Unnamed room"}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={option.price_mode || "delta"} onValueChange={(value) => set("price_mode", value)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delta">Adds to price</SelectItem>
            <SelectItem value="absolute">Own price</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">{(option.price_mode || "delta") === "delta" ? "+$" : "$"}</span>
          <Input
            value={option.price ?? ""}
            onChange={(e) => set("price", e.target.value)}
            onBlur={(e) => set("price", parseFloat(e.target.value) || 0)}
            inputMode="decimal"
            placeholder="0"
            className="h-8 w-28 text-right text-sm"
          />
        </div>

        <label className="flex items-center gap-1.5 text-xs text-slate-600 ml-auto cursor-pointer">
          <Checkbox checked={!!option.default_selected} onCheckedChange={(checked) => set("default_selected", !!checked)} />
          Selected by default
        </label>
      </div>
    </div>
  );
}

const emptyDraft = { title: "", description: "", price: "" };

/** Quick-entry form for a new option — Enter adds it and resets. */
export function QuickAddOptionRow({ onAdd }) {
  const [draft, setDraft] = useState(emptyDraft);

  const commit = () => {
    if (!draft.title.trim() && !draft.price) return;
    onAdd({
      title: draft.title.trim(),
      description: draft.description.trim(),
      price: parseFloat(draft.price) || 0,
    });
    setDraft(emptyDraft);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div className="border border-dashed border-amber-300 bg-amber-50/40 rounded-lg p-3 space-y-2">
      <div className="flex gap-2">
        <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={handleKey} placeholder="Add option… e.g. Glass-front uppers" className="h-9 text-sm" />
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">+$</span>
          <Input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} onKeyDown={handleKey} inputMode="decimal" placeholder="0" className="h-9 w-24 text-right text-sm" />
        </div>
        <Button onClick={commit} className="h-9 bg-amber-600 hover:bg-amber-700 text-xs flex-shrink-0">Add ⏎</Button>
      </div>
      <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} onKeyDown={handleKey} placeholder="What it includes (optional)" className="h-8 text-xs" />
    </div>
  );
}