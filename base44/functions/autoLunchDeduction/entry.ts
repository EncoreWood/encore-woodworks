import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get today's date in Mountain Time (America/Denver)
    const now = new Date();
    const denverStr = now.toLocaleString("en-US", { timeZone: "America/Denver" });
    const todayStr = format(new Date(denverStr), "yyyy-MM-dd");

    // Current time in Mountain for computing active entry hours
    const denverNow = new Date(denverStr);

    // Fetch all employees
    const employees = await base44.asServiceRole.entities.Employee.list();

    const results = [];

    for (const emp of employees) {
      // Get all work entries for today for this employee
      const entries = await base44.asServiceRole.entities.TimeEntry.filter({
        employee_id: emp.id,
        date: todayStr,
        entry_type: "work"
      });

      if (entries.length === 0) continue;

      // Check if lunch was already deducted today (any entry has lunch note)
      const alreadyDeducted = entries.some(e => e.notes && e.notes.includes("[−30 min lunch]"));
      if (alreadyDeducted) {
        results.push({ employee: emp.full_name, status: "already_deducted" });
        continue;
      }

      // Compute effective hours for each entry:
      // - Completed entries: use hours_worked
      // - Active entries (no clock_out): compute from clock_in to now
      const enrichedEntries = entries.map(e => {
        if (e.clock_out && e.hours_worked != null) {
          return { ...e, _effectiveHours: e.hours_worked };
        }
        // Active entry — estimate hours up to now
        if (e.clock_in) {
          const [inH, inM] = e.clock_in.split(":").map(Number);
          const clockInDate = new Date(denverNow);
          clockInDate.setHours(inH, inM, 0, 0);
          const diffMs = denverNow - clockInDate;
          const hrs = Math.max(0, diffMs / 3600000);
          return { ...e, _effectiveHours: parseFloat(hrs.toFixed(2)), _isActive: true };
        }
        return { ...e, _effectiveHours: 0 };
      });

      // Total hours today must be >= 5 to qualify for lunch deduction
      const totalHours = enrichedEntries.reduce((s, e) => s + (e._effectiveHours || 0), 0);
      if (totalHours < 5) {
        results.push({ employee: emp.full_name, status: "skipped_short_day", totalHours });
        continue;
      }

      // Priority: General or Individual Lean first, otherwise longest job entry
      const PREFERRED = ["General", "Individual Lean", "Group Lean"];
      let targetEntry = null;

      for (const pref of PREFERRED) {
        const found = enrichedEntries.find(e => e.project_name === pref);
        if (found) { targetEntry = found; break; }
      }

      if (!targetEntry) {
        // Pick the entry with the most effective hours
        targetEntry = enrichedEntries.reduce((best, e) =>
          (e._effectiveHours || 0) > (best._effectiveHours || 0) ? e : best
        );
      }

      // For active entries, we need to clock them out first, then deduct
      if (targetEntry._isActive) {
        // Just deduct from hours_worked when they eventually clock out
        // We'll mark a flag note so the clock-out logic deducts it
        // Instead: compute current hours and update the entry with deducted hours
        const newHours = Math.max(0, (targetEntry._effectiveHours || 0) - 0.5);
        const nowDenverStr = `${String(denverNow.getHours()).padStart(2, "0")}:${String(denverNow.getMinutes()).padStart(2, "0")}`;
        await base44.asServiceRole.entities.TimeEntry.update(targetEntry.id, {
          hours_worked: parseFloat(newHours.toFixed(2)),
          clock_out: nowDenverStr,
          notes: (targetEntry.notes ? targetEntry.notes + " " : "") + "[−30 min lunch]"
        });
        results.push({ employee: emp.full_name, status: "deducted_active", from: targetEntry.project_name || "work", newHours });
      } else {
        const newHours = Math.max(0, (targetEntry.hours_worked || 0) - 0.5);
        await base44.asServiceRole.entities.TimeEntry.update(targetEntry.id, {
          hours_worked: parseFloat(newHours.toFixed(2)),
          notes: (targetEntry.notes ? targetEntry.notes + " " : "") + "[−30 min lunch]"
        });
        results.push({ employee: emp.full_name, status: "deducted", from: targetEntry.project_name || "work", newHours });
      }
    }

    return Response.json({ date: todayStr, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});