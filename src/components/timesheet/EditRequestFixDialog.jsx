import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import TimePicker from "./TimePicker";

function calcHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return "0.00";
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  let minutes = outH * 60 + outM - inH * 60 - inM;
  if (minutes < 0) minutes += 24 * 60;
  return (minutes / 60).toFixed(2);
}

export default function EditRequestFixDialog({ open, onOpenChange, request, entries = [], reviewerName }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lunchTaken, setLunchTaken] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open || !request) return;
    setError(null);
    setLunchTaken(false);
    const existing = entries.map(e => ({ id: e.id, clock_in: e.clock_in || "", clock_out: e.clock_out || "" }));
    setRows(existing.length ? existing : [{ id: null, clock_in: "", clock_out: "" }]);
  }, [open, request?.id]);

  const setRow = (idx, patch) => {
    setError(null);
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    const usable = rows.filter(r => r.clock_in);
    if (!request || !usable.length) {
      setError("Pick a clock-in time to make the fix.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const applied = [];
      for (const r of usable) {
        const data = {
          clock_in: r.clock_in,
          clock_out: r.clock_out || null,
          hours_worked: r.clock_out ? parseFloat(calcHours(r.clock_in, r.clock_out)) : 0
        };
        if (r.id) {
          await base44.entities.TimeEntry.update(r.id, data);
          applied.push({ id: r.id, hours: data.hours_worked, notes: entries.find(e => e.id === r.id)?.notes || "" });
        } else {
          const created = await base44.entities.TimeEntry.create({
            employee_id: request.employee_id,
            employee_name: request.employee_name,
            date: request.date,
            entry_type: "work",
            ...data
          });
          applied.push({ id: created.id, hours: data.hours_worked, notes: "" });
        }
      }
      // 30-minute unpaid lunch — same convention the lunch-deduction tool uses
      const target = applied.reduce((best, a) => (a.hours > best.hours ? a : best), applied[0]);
      if (lunchTaken && target && !target.notes.includes("[−30 min lunch]")) {
        await base44.entities.TimeEntry.update(target.id, {
          hours_worked: parseFloat(Math.max(0, target.hours - 0.5).toFixed(2)),
          notes: (target.notes ? target.notes + " " : "") + "[−30 min lunch]"
        });
      }
      await base44.entities.TimeEditRequest.update(request.id, {
        status: "approved",
        reviewed_by: reviewerName || "Admin",
        reviewed_at: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["timeEditRequests"] });
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save time fix:", err);
      setError("Couldn't save the fix. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fix Time Card</DialogTitle>
        </DialogHeader>
        {request && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{request.employee_name}</p>
              <p className="text-xs text-slate-500">
                {format(new Date(request.date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Request</p>
              <p className="text-sm text-slate-700 mt-1">{request.reason}</p>
            </div>
            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div key={row.id || idx} className="rounded-lg border border-slate-200 p-3 space-y-2">
                  {rows.length > 1 && (
                    <p className="text-xs font-semibold text-slate-500">Entry {idx + 1}</p>
                  )}
                  <div>
                    <label className="text-sm font-medium text-slate-700">Clock In</label>
                    <div className="mt-1">
                      <TimePicker value={row.clock_in} onChange={v => setRow(idx, { clock_in: v })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Clock Out</label>
                    <div className="mt-1">
                      <TimePicker value={row.clock_out} onChange={v => setRow(idx, { clock_out: v })} />
                    </div>
                  </div>
                  {row.clock_in && row.clock_out && (
                    <p className="text-xs text-slate-500">Hours: {calcHours(row.clock_in, row.clock_out)}</p>
                  )}
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <Checkbox checked={lunchTaken} onCheckedChange={v => setLunchTaken(!!v)} />
              They took a 30 min lunch (deduct 0.5 hrs)
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                {saving ? "Saving..." : "Save & Accept"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}