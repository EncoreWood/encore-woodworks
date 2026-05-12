import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

// Applies the 30-min lunch deduction to all completed work days in a date range
// that haven't been deducted yet and have >= 5 total hours worked.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { start_date, end_date } = await req.json();
    if (!start_date || !end_date) {
      return Response.json({ error: 'start_date and end_date required' }, { status: 400 });
    }

    const employees = await base44.asServiceRole.entities.Employee.list();
    const results = [];

    for (const emp of employees) {
      // Fetch all completed work entries in range for this employee
      const allEntries = await base44.asServiceRole.entities.TimeEntry.filter({
        employee_id: emp.id,
        entry_type: "work"
      });

      const rangeEntries = allEntries.filter(e =>
        e.clock_out &&
        e.hours_worked != null &&
        e.date >= start_date &&
        e.date <= end_date
      );

      // Group by date
      const byDate = {};
      for (const e of rangeEntries) {
        if (!byDate[e.date]) byDate[e.date] = [];
        byDate[e.date].push(e);
      }

      let deductedDays = 0;
      let skippedDays = 0;
      let alreadyDone = 0;

      for (const [date, dayEntries] of Object.entries(byDate)) {
        // Skip if already deducted
        if (dayEntries.some(e => e.notes && e.notes.includes("[−30 min lunch]"))) {
          alreadyDone++;
          continue;
        }

        const totalHours = dayEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
        if (totalHours < 5) {
          skippedDays++;
          continue;
        }

        // Pick target entry: preferred category first, then longest
        const PREFERRED = ["General", "Individual Lean", "Group Lean"];
        let target = null;
        for (const pref of PREFERRED) {
          const found = dayEntries.find(e => e.project_name === pref);
          if (found) { target = found; break; }
        }
        if (!target) {
          target = dayEntries.reduce((best, e) =>
            (e.hours_worked || 0) > (best.hours_worked || 0) ? e : best
          );
        }

        const newHours = Math.max(0, (target.hours_worked || 0) - 0.5);
        await base44.asServiceRole.entities.TimeEntry.update(target.id, {
          hours_worked: parseFloat(newHours.toFixed(2)),
          notes: (target.notes ? target.notes + " " : "") + "[−30 min lunch]"
        });
        deductedDays++;
      }

      results.push({
        employee: emp.full_name,
        deductedDays,
        skippedDays,
        alreadyDone
      });
    }

    return Response.json({ start_date, end_date, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});