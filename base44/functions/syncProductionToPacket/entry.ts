import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, room_id, room_name } = await req.json();

    if (!project_id || !room_id || !room_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get all production items for this room
    const items = await base44.entities.ProductionItem.filter({
      project_id,
      room_name,
    });

    // Find or create job packet
    let packet = await base44.entities.JobPacket.filter({
      project_id,
      room_id,
    });

    const project = await base44.entities.Project.filter({ id: project_id });
    const projectData = project[0];

    if (packet.length === 0) {
      // Create new packet
      packet = await base44.entities.JobPacket.create({
        project_id,
        project_name: projectData?.project_name || '',
        room_id,
        room_name,
        production_item_ids: items.map((item, idx) => ({
          id: item.id,
          order: idx,
        })),
        sent_to_production_count: 0,
        total_count: items.length,
      });
      return Response.json({ packet, action: 'created' });
    } else {
      // Update existing packet
      packet = packet[0];
      const updated = await base44.entities.JobPacket.update(packet.id, {
        production_item_ids: items.map((item, idx) => ({
          id: item.id,
          order: idx,
        })),
        total_count: items.length,
      });
      return Response.json({ packet: updated, action: 'updated' });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});