import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function AssignTaskDialog({ open, onOpenChange, onSubmit, employee, isLoading }) {
  const [taskData, setTaskData] = useState({
    task: "",
    date: new Date().toISOString().split("T")[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(taskData);
    setTaskData({ task: "", date: new Date().toISOString().split("T")[0] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Task to {employee?.full_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="task">Task Description *</Label>
            <Textarea
              id="task"
              value={taskData.task}
              onChange={(e) => setTaskData({ ...taskData, task: e.target.value })}
              placeholder="Enter task details..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="date">Due Date</Label>
            <Input
              id="date"
              type="date"
              value={taskData.date}
              onChange={(e) => setTaskData({ ...taskData, date: e.target.value })}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Task"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}