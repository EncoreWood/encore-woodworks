import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Backfill lunch deductions for a date range.
// Uses the exact same logic as autoLunchDeduction.
// Pass { start_date, end_date } in the request body (yyyy-MM-dd).
// Skips weekends, skips days where lunch already deducted.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin check
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { start_date, end_date } = await req.json();
    if (!start_date || !end_date) {
      return Response.json({ error: 'start_date and end_date required (yyyy-MM-dd)' }, { status: 400 });
    }

    const employees = await base44.asServiceRole.entities.Employee.filter({ archived: false });

    const allResults = {};
    const current = new Date(start_date + 'T12:00:00Z');
    const end = new Date(end_date + 'T12:00:00Z');

    while (current <= end) {
      const dayOfWeek = current.getUTCDay(); // 0=Sun, 6=Sat
      const dateStr = current.toISOString().slice(0, 10);

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        current.setUTCDate(current.getUTCDate() + 1);
        continue;
      }

      const dayResults = [];

      for (const emp of employees) {
        const entries = await base44.asServiceRole.entities.TimeEntry.filter({
          employee_id: emp.id,
          date: dateStr,
          entry_type: 'work'
        });

        if (entries.length === 0) continue;

        // Skip if already deducted
        const alreadyDeducted = entries.some(e => e.notes && e.notes.includes('[−30 min lunch]'));
        if (alreadyDeducted) {
          dayResults.push({ employee: emp.full_name, status: 'already_deducted' });
          continue;
        }

        // Only consider completed entries for backfill
        const completedEntries = entries.filter(e => e.clock_out && e.hours_worked != null);
        const totalHours = completedEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);

        if (totalHours < 5) {
          dayResults.push({ employee: emp.full_name, status: 'skipped_short_day', totalHours });
          continue;
        }

        // Priority: General or Lean entries first, then longest
        const PREFERRED = ['General', 'Individual Lean', 'Group Lean'];
        let targetEntry = null;

        for (const pref of PREFERRED) {
          const found = completedEntries.find(e => e.project_name === pref);
          if (found) { targetEntry = found; break; }
        }

        if (!targetEntry) {
          targetEntry = completedEntries.reduce((best, e) =>
            (e.hours_worked || 0) > (best.hours_worked || 0) ? e : best
          );
        }

        const newHours = Math.max(0, (targetEntry.hours_worked || 0) - 0.5);
        await base44.asServiceRole.entities.TimeEntry.update(targetEntry.id, {
          hours_worked: parseFloat(newHours.toFixed(2)),
          notes: (targetEntry.notes ? targetEntry.notes + ' ' : '') + '[−30 min lunch]'
        });

        dayResults.push({
          employee: emp.full_name,
          status: 'deducted',
          from: targetEntry.project_name || '(no project)',
          was: targetEntry.hours_worked,
          now: newHours
        });
      }

      if (dayResults.length > 0) {
        allResults[dateStr] = dayResults;
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return Response.json({ success: true, results: allResults });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});