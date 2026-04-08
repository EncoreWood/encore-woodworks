import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    production_item_id,
    production_item_name,
    project_name,
    room,
    cabinet,
    item_description,
    notes,
  } = body;

  if (!item_description?.trim()) {
    return Response.json({ error: 'item_description is required' }, { status: 400 });
  }

  const reporterName = user.full_name || user.email || 'Unknown';

  // Check for an existing open/ordered report matching this card + room + cabinet + description
  const existing = await base44.asServiceRole.entities.MissingItem.filter({
    production_item_id: production_item_id || null,
  });

  const match = existing.find(m =>
    !m.archived &&
    (m.status === 'Open' || m.status === 'Ordered') &&
    (m.room_name || '').toLowerCase() === (room || '').toLowerCase() &&
    (m.cabinet_name || '').toLowerCase() === (cabinet || '').toLowerCase() &&
    (m.item_description || '').toLowerCase() === item_description.trim().toLowerCase()
  );

  if (match) {
    const confirmed = JSON.parse(match.confirmed_by || '[]');

    // Already reported or confirmed by this person
    if (match.reported_by === reporterName || confirmed.includes(reporterName)) {
      return Response.json({
        result: 'already_confirmed',
        reported_by: match.reported_by,
      });
    }

    // Add as confirmer
    confirmed.push(reporterName);
    await base44.asServiceRole.entities.MissingItem.update(match.id, {
      confirmed_by: JSON.stringify(confirmed),
    });

    return Response.json({
      result: 'confirmed',
      reported_by: match.reported_by,
    });
  }

  // Create new report
  const newItem = await base44.asServiceRole.entities.MissingItem.create({
    production_item_id: production_item_id || null,
    production_item_name: production_item_name || null,
    project_name: project_name || null,
    room_name: room || null,
    cabinet_name: cabinet || null,
    item_description: item_description.trim(),
    description: notes || null,
    reported_by: reporterName,
    reported_at: new Date().toISOString(),
    confirmed_by: '[]',
    status: 'Open',
  });

  return Response.json({ result: 'created', id: newItem.id });
});