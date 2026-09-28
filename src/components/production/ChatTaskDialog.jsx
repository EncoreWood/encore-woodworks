import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Turns a chat message into an assignable Task
export default function ChatTaskDialog({ open, onOpenChange, message, employees, onTaskCreated }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && message) {
      setTitle((message.message || "").slice(0, 120));
      setAssignee("");
      setDueDate("");
      setPriority("medium");
    }
  }, [open, message]);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const emp = employees.find(e => e.full_name === assignee);
      const task = await base44.entities.Task.create({
        title: title.trim(),
        status: "todo",
        priority,
        assigned_to: assignee || null,
        assigned_to_email: emp?.user_email || emp?.email || null,
        due_date: dueDate || null,
        notes: `Created from Production Chat${message?.user_name ? ` — ${message.user_name}` : ""}`,
      });
      // Link the task back to the chat message so the bubble shows it
      if (message?.id) {
        const summary = `${assignee || "Unassigned"}${dueDate ? ` · due ${dueDate}` : ""}`;
        await base44.entities.ProductionChatMessage.update(message.id, {
          task_id: task.id,
          task_summary: summary,
        });
      }
      toast.success("Task created ✓");
      onTaskCreated?.();
      onOpenChange(false);
    } catch (e) {
      console.error("Failed to create task:", e);
      toast.error("Could not create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task from Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Task</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <Select value={assignee || "unassigned"} onValueChange={v => setAssignee(v === "unassigned" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!title.trim() || saving} className="bg-amber-600 hover:bg-amber-700">
            {saving ? "Creating…" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}