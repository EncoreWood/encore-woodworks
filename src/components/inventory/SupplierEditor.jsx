import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SupplierEditor({ value = [], suppliers = [], onChange }) {
  const rows = Array.isArray(value) ? value.filter(r => r && (r.name || r.link)) : [];

  const addRow = () => onChange([...rows, { name: "", link: "" }]);
  const updateRow = (idx, patch) => onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRow = (idx) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div key={idx} className="flex gap-1.5 items-center">
          <Select value={row.name || "__none__"} onValueChange={v => updateRow(idx, { name: v === "__none__" ? "" : v })}>
            <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={row.link} onChange={e => updateRow(idx, { link: e.target.value })} placeholder="https://..." className="flex-1 h-9" />
          <Button type="button" variant="outline" size="icon" onClick={() => removeRow(idx)} className="flex-shrink-0 h-9 w-9">
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="w-4 h-4" /> Add Supplier
      </Button>
    </div>
  );
}