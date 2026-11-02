import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

/**
 * Editable checklist: each row has a checkbox and a step description.
 */
export default function ChecklistEditor({ value = [], onChange }) {
  const items = value || [];

  const update = (id, patch) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const add = () =>
    onChange([
      ...items,
      { id: `${Date.now()}-${items.length}`, text: "", done: false },
    ]);

  const remove = (id) => onChange(items.filter((item) => item.id !== id));

  return (
    <div className="space-y-1.5">
      {items.length === 0 && (
        <p className="text-xs text-slate-400">No steps yet — add the first one.</p>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Checkbox
            checked={!!item.done}
            onCheckedChange={(checked) => update(item.id, { done: checked === true })}
            aria-label="Step done"
          />
          <Input
            value={item.text || ""}
            onChange={(e) => update(item.id, { text: e.target.value })}
            placeholder="e.g. Wipe down spray booth walls"
            className={`h-9 text-sm flex-1 ${item.done ? "line-through text-slate-400" : ""}`}
          />
          <button
            type="button"
            onClick={() => remove(item.id)}
            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
            title="Remove step"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={add}
        className="h-7 px-2 text-xs text-teal-700 hover:bg-teal-50"
      >
        <Plus className="w-3.5 h-3.5" /> Add step
      </Button>
    </div>
  );
}