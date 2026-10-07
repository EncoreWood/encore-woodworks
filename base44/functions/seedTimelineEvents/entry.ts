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

    // Phases are created WITHOUT dates — the team fills dates in manually.
    const defaults = [
      { event_name: "Design", event_type: "phase", color: "#3b82f6", sort_order: 0 },
      { event_name: "Orders", event_type: "phase", color: "#f59e0b", sort_order: 1 },
      { event_name: "Prep", event_type: "phase", color: "#8b5cf6", sort_order: 2 },
      { event_name: "Production", event_type: "phase", color: "#f97316", sort_order: 3 },
      { event_name: "Install", event_type: "phase", color: "#14b8a6", sort_order: 4 },
      { event_name: "Complete", event_type: "milestone", color: "#22c55e", sort_order: 5 },
    ];

    const records = defaults.map(e => ({
      project_id: project.id,
      project_name: project.project_name || '',
      event_name: e.event_name,
      event_type: e.event_type,
      color: e.color,
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