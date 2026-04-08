import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { missing_item_id, status, notes } = body;

  if (!missing_item_id || !status) {
    return Response.json({ error: 'missing_item_id and status are required' }, { status: 400 });
  }

  if (!['Ordered', 'Resolved'].includes(status)) {
    return Response.json({ error: 'status must be "Ordered" or "Resolved"' }, { status: 400 });
  }

  const adminName = user.full_name || user.email || 'Admin';
  const today = new Date().toISOString().split('T')[0];

  const updateData = { status };

  if (status === 'Ordered') {
    updateData.ordered_by = adminName;
    updateData.ordered_date = today;
  }

  if (status === 'Resolved') {
    updateData.resolved_date = today;
  }

  if (notes) {
    updateData.description = notes;
  }

  await base44.asServiceRole.entities.MissingItem.update(missing_item_id, updateData);

  return Response.json({ result: 'updated', status });
});