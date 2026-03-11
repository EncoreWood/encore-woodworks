import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save, X, Zap, User, Calendar, AlertCircle } from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";

export default function NextActionBanner({ project, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const startEdit = () => {
    setDraft({
      next_action: project.next_action || "",
      next_action_owner: project.next_action_owner || "",
      next_action_due: project.next_action_due || "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const dueDate = project.next_action_due ? parseISO(project.next_action_due) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);

  const bannerBg = isOverdue
    ? "bg-red-50 border-red-300"
    : isDueToday
    ? "bg-amber-50 border-amber-300"
    : "bg-sky-50 border-sky-200";

  const iconColor = isOverdue ? "text-red-500" : isDueToday ? "text-amber-500" : "text-sky-500";
  const titleColor = isOverdue ? "text-red-800" : isDueToday ? "text-amber-800" : "text-sky-800";

  if (editing) {
    return (
      <div className="border rounded-xl p-5 bg-white shadow-sm mb-6 space-y-4">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Next Action
        </h3>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">What needs to happen next?</Label>
          <Input
            value={draft.next_action}
            onChange={e => setDraft(d => ({ ...d, next_action: e.target.value }))}
            placeholder="e.g. Send revised drawings to client"
            className="text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Owner</Label>
            <Input
              value={draft.next_action_owner}
              onChange={e => setDraft(d => ({ ...d, next_action_owner: e.target.value }))}
              placeholder="Who's responsible?"
              className="text-sm h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Due Date</Label>
            <Input
              type="date"
              value={draft.next_action_due}
              onChange={e => setDraft(d => ({ ...d, next_action_due: e.target.value }))}
              className="text-sm h-9"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" /> Save
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setEditing(false)}>
            <X className="w-3.5 h-3.5" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-2 rounded-xl p-5 mb-6 ${bannerBg}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
            {isOverdue ? <AlertCircle className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${titleColor}`}>
              {isOverdue ? "⚠ Overdue — " : isDueToday ? "📅 Due Today — " : ""}Next Action
            </p>
            <p className="text-slate-900 font-semibold text-base leading-snug">{project.next_action}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {project.next_action_owner && (
                <span className="flex items-center gap-1 text-sm text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {project.next_action_owner}
                </span>
              )}
              {project.next_action_due && (
                <span className={`flex items-center gap-1 text-sm font-medium ${isOverdue ? "text-red-600" : isDueToday ? "text-amber-600" : "text-slate-600"}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseISO(project.next_action_due), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 flex-shrink-0 text-slate-500 hover:text-slate-700" onClick={startEdit}>
          <Edit className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}