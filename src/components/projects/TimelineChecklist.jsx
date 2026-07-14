import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function TimelineChecklist({ items, onSave }) {
  const [local, setLocal] = useState(items);
  const [text, setText] = useState("");

  useEffect(() => { setLocal(items); }, [items]);

  const commit = (next) => {
    setLocal(next);
    onSave(next);
  };

  const toggle = (id) => commit(local.map(i => i.id === id ? { ...i, done: !i.done, done_at: !i.done ? new Date().toISOString() : null } : i));

  const add = () => {
    const t = text.trim();
    if (!t) return;
    commit([...local, { id: makeId(), label: t, done: false, done_at: null }]);
    setText("");
  };

  const remove = (id) => commit(local.filter(i => i.id !== id));

  return (
    <div className="space-y-1.5">
      {local.length === 0 && <p className="text-xs text-slate-400">No checklist items yet.</p>}
      {local.map(item => (
        <div key={item.id} className="flex items-center gap-2 group text-sm">
          <Checkbox checked={item.done} onCheckedChange={() => toggle(item.id)} />
          <span className={cn("flex-1", item.done ? "text-slate-400 line-through" : "text-slate-700")}>{item.label}</span>
          {item.done && item.done_at && (
            <span className="text-[10px] text-slate-400">{format(new Date(item.done_at), "M/d h:mm a")}</span>
          )}
          <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="+ Add item..."
          className="h-8 text-xs"
        />
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={add} disabled={!text.trim()}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}