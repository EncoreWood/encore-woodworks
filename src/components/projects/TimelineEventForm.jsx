import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

const TYPE_COLORS = {
  phase: "#3b82f6",
  milestone: "#f59e0b",
  event: "#64748b",
};

const emptyForm = {
  event_name: "",
  event_type: "phase",
  start_date: "",
  end_date: "",
  color: "",
  is_client_visible: true,
  notes: "",
};

export default function TimelineEventForm({ open, onOpenChange, onSubmit, editingEvent, isLoading }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) {
      setForm(editingEvent ? {
        event_name: editingEvent.event_name || "",
        event_type: editingEvent.event_type || "phase",
        start_date: editingEvent.start_date || "",
        end_date: editingEvent.end_date || "",
        color: editingEvent.color || "",
        is_client_visible: editingEvent.is_client_visible !== false,
        notes: editingEvent.notes || "",
      } : emptyForm);
    }
  }, [open, editingEvent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.event_name.trim()) return;
    const data = {
      ...form,
      event_name: form.event_name.trim(),
      color: form.color || undefined,
      notes: form.notes || undefined,
    };
    if (editingEvent) {
      onSubmit(editingEvent.id, data);
    } else {
      onSubmit(data);
    }
  };

  const previewColor = form.color || TYPE_COLORS[form.event_type] || "#64748b";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingEvent ? "Edit Event" : "Add Timeline Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Event Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.event_name}
              onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))}
              placeholder="e.g., Cabinet Installation"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Event Type</Label>
            <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="phase">Phase</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color (optional)</Label>
            <div className="flex items-center gap-2">
              <Input type="color" value={previewColor} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-12 h-9 p-1 cursor-pointer" />
              <Input
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                placeholder={`Default: ${TYPE_COLORS[form.event_type]}`}
                className="flex-1"
              />
              {form.color && (
                <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, color: "" }))}>Reset</Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
            <div>
              <Label className="cursor-pointer">Client Visible</Label>
              <p className="text-xs text-slate-400">Show in client portal view</p>
            </div>
            <Switch checked={form.is_client_visible} onCheckedChange={v => setForm(f => ({ ...f, is_client_visible: v }))} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !form.event_name.trim()}>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingEvent ? "Save Changes" : "Add Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}