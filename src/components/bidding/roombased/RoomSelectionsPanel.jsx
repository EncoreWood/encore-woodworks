import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { SELECTION_FIELDS, usesMainSelections } from "./roomSelections";

/**
 * Per-room selections. Defaults to inheriting the proposal-level selections
 * (read-only, zero input required); switching to the room's own prefills every
 * field with the main values so only the differences need changing.
 */
export default function RoomSelectionsPanel({ room, mainFields = {}, onSetUseMain, onChange, onEditMain }) {
  const useMain = usesMainSelections(room);
  const selections = room.selections || {};

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Selections</span>
        <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => onSetUseMain(true)}
            className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${useMain ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Use main selections
          </button>
          <button
            type="button"
            onClick={() => onSetUseMain(false)}
            className={`px-2.5 py-1 text-[11px] font-medium border-l border-slate-300 transition-colors ${useMain ? "text-slate-600 hover:bg-slate-50" : "bg-amber-600 text-white"}`}
          >
            This room's own
          </button>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${useMain ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-800"}`}>
          {useMain ? "Same as proposal" : "Custom for this room"}
        </span>
        <Button variant="ghost" size="sm" onClick={onEditMain} className="ml-auto h-7 text-xs text-amber-700 hover:text-amber-800">
          Edit main selections <ArrowUpRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {useMain ? (
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {SELECTION_FIELDS.map((field) => (
            <div key={field.key} className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{field.label}</p>
              <p className="text-sm text-slate-700 truncate">{mainFields[field.key] || <span className="text-slate-300">—</span>}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-4 gap-2">
            {SELECTION_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="text-[10px] uppercase tracking-wide text-slate-400">{field.label}</label>
                <Input
                  value={selections[field.key] || ""}
                  onChange={(e) => onChange({ [field.key]: e.target.value })}
                  placeholder={mainFields[field.key] || "—"}
                  className="h-8 text-sm bg-white"
                />
              </div>
            ))}
          </div>
          <Textarea
            value={selections.notes || ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={2}
            placeholder="Room-specific notes printed under this room (optional)"
            className="text-sm bg-white resize-none"
          />
          <p className="text-[11px] text-slate-400">Prefilled from the main selections — change only what's different for this room.</p>
        </>
      )}
    </div>
  );
}