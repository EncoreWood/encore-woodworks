import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get today's date in Mountain Time (America/Denver)
    const now = new Date();
    const denverStr = now.toLocaleString("en-US", { timeZone: "America/Denver" });
    const todayStr = format(new Date(denverStr), "yyyy-MM-dd");

    // Fetch all employees
    const employees = await base44.asServiceRole.entities.Employee.list();

    const results = [];

    for (const emp of employees) {
      // Get all completed work entries for today for this employee
      const entries = await base44.asServiceRole.entities.TimeEntry.filter({
        employee_id: emp.id,
        date: todayStr,
        entry_type: "work"
      });

      // Only process entries that are clocked out (completed) and haven't had lunch deducted
      const completedEntries = entries.filter(e => e.clock_out && e.hours_worked != null);
      if (completedEntries.length === 0) continue;

      // Check if lunch was already deducted today (any entry has lunch note)
      const alreadyDeducted = completedEntries.some(e => e.notes && e.notes.includes("[−30 min lunch]"));
      if (alreadyDeducted) {
        results.push({ employee: emp.full_name, status: "already_deducted" });
        continue;
      }

      // Total hours today must be >= 5 to qualify for lunch deduction
      const totalHours = completedEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
      if (totalHours < 5) {
        results.push({ employee: emp.full_name, status: "skipped_short_day", totalHours });
        continue;
      }

      // Priority: General or Individual Lean first, otherwise longest job entry
      const PREFERRED = ["General", "Individual Lean", "Group Lean"];
      let targetEntry = null;

      for (const pref of PREFERRED) {
        const found = completedEntries.find(e => e.project_name === pref);
        if (found) { targetEntry = found; break; }
      }

      if (!targetEntry) {
        // Pick the entry with the most hours
        targetEntry = completedEntries.reduce((best, e) =>
          (e.hours_worked || 0) > (best.hours_worked || 0) ? e : best
        );
      }

      const newHours = Math.max(0, (targetEntry.hours_worked || 0) - 0.5);
      await base44.asServiceRole.entities.TimeEntry.update(targetEntry.id, {
        hours_worked: parseFloat(newHours.toFixed(2)),
        notes: (targetEntry.notes ? targetEntry.notes + " " : "") + "[−30 min lunch]"
      });

      results.push({ employee: emp.full_name, status: "deducted", from: targetEntry.project_name || "work", newHours });
    }

    return Response.json({ date: todayStr, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});