import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Copy, Trash2, CornerDownRight } from "lucide-react";

const cellInput =
  "h-8 text-xs border-transparent bg-transparent hover:border-slate-200 focus:border-amber-400 focus-visible:ring-0 shadow-none";

/**
 * An upgrade nested under its room — indented with a left rule and a lighter
 * background so it's obvious which room it modifies. The room is implied; there
 * is no room picker here.
 */
export default function RoomUpgradeRow({ option, index, total, onChange, onMove, onDuplicate, onDelete }) {
  const set = (field, value) => onChange(option.id, { [field]: value });

  return (
    <tr className="bg-slate-50/80 border-b border-slate-100 align-top group">
      <td className="w-8" />
      <td colSpan={3} className="py-1.5 pl-4 pr-2 border-l-2 border-amber-300">
        <div className="flex items-center gap-2">
          <CornerDownRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <Input
            value={option.title || ""}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Upgrade… e.g. Glass-front uppers"
            className={cellInput + " font-medium"}
          />
          <Input
            value={option.description || ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What it includes"
            className={cellInput + " max-w-[220px]"}
          />
        </div>
      </td>
      <td className="py-1.5 px-1 w-40">
        <div className="flex items-center justify-end gap-1">
          <Select value={option.price_mode || "delta"} onValueChange={(value) => set("price_mode", value)}>
            <SelectTrigger className="h-7 w-[62px] text-[11px] px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delta">+$</SelectItem>
              <SelectItem value="absolute">$</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={option.price ?? ""}
            onChange={(e) => set("price", e.target.value)}
            onBlur={(e) => set("price", parseFloat(e.target.value) || 0)}
            inputMode="decimal"
            placeholder="0"
            className={cellInput + " w-20 text-right text-sm font-semibold"}
          />
        </div>
      </td>
      <td className="py-1.5 px-1 w-48">
        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(option.id, -1)} title="Move up">
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove(option.id, 1)} title="Move down">
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(option.id)} title="Duplicate upgrade">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => onDelete(option.id)} title="Delete upgrade">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

const emptyDraft = { title: "", price: "" };

/** Quick add for a room's upgrades — Enter adds another, Done closes it. */
export function QuickAddUpgradeRow({ onAdd, onDone }) {
  const [draft, setDraft] = useState(emptyDraft);

  const commit = () => {
    if (!draft.title.trim() && !draft.price) return;
    onAdd({ title: draft.title.trim(), price: parseFloat(draft.price) || 0 });
    setDraft(emptyDraft);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") onDone();
  };

  return (
    <tr className="bg-amber-50/60 border-b border-amber-100">
      <td className="w-8" />
      <td colSpan={3} className="py-1.5 pl-4 pr-2 border-l-2 border-amber-400">
        <div className="flex items-center gap-2">
          <CornerDownRight className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onKeyDown={handleKey}
            placeholder="Add upgrade to this room… (⏎)"
            className={cellInput + " placeholder:text-amber-700/70"}
            autoFocus
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-slate-400">+$</span>
            <Input
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              onKeyDown={handleKey}
              inputMode="decimal"
              placeholder="0"
              className="h-8 w-20 text-right text-sm"
            />
          </div>
        </div>
      </td>
      <td className="py-1.5 px-1 w-40" />
      <td className="py-1.5 px-1 w-48">
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" onClick={commit} className="h-7 bg-amber-600 hover:bg-amber-700 text-xs">Add ⏎</Button>
          <Button size="sm" variant="outline" onClick={onDone} className="h-7 text-xs">Done</Button>
        </div>
      </td>
    </tr>
  );
}