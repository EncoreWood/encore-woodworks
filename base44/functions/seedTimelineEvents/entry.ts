import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const project = body.data || body.project;

    if (!project || !project.id) {
      return Response.json({ error: 'Project data with id is required' }, { status: 400 });
    }

    // Check if timeline events already exist for this project (avoid duplicates)
    const existing = await base44.asServiceRole.entities.TimelineEvent.filter({ project_id: project.id });
    if (existing.length > 0) {
      return Response.json({ success: true, message: 'Timeline events already exist', count: existing.length });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startDate = project.start_date || todayStr;

    const addDays = (dateStr, days) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const defaults = [
      { event_name: "Design & Planning", event_type: "phase", start_date: addDays(startDate, 0), end_date: addDays(startDate, 14), sort_order: 0 },
      { event_name: "Material Ordering", event_type: "phase", start_date: addDays(startDate, 14), end_date: addDays(startDate, 28), sort_order: 1 },
      { event_name: "Shop Production", event_type: "phase", start_date: addDays(startDate, 28), end_date: addDays(startDate, 70), sort_order: 2 },
      { event_name: "Finish & Quality Check", event_type: "phase", start_date: addDays(startDate, 70), end_date: addDays(startDate, 84), sort_order: 3 },
      { event_name: "Delivery & Install", event_type: "phase", start_date: addDays(startDate, 84), end_date: addDays(startDate, 98), sort_order: 4 },
      { event_name: "Final Walk-Through", event_type: "milestone", start_date: addDays(startDate, 98), end_date: addDays(startDate, 98), sort_order: 5 },
    ];

    const records = defaults.map(e => ({
      project_id: project.id,
      project_name: project.project_name || '',
      event_name: e.event_name,
      event_type: e.event_type,
      start_date: e.start_date,
      end_date: e.end_date,
      is_client_visible: true,
      is_completed: false,
      sort_order: e.sort_order,
      notes: ''
    }));

    const created = await base44.asServiceRole.entities.TimelineEvent.bulkCreate(records);
    return Response.json({ success: true, created: created.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});