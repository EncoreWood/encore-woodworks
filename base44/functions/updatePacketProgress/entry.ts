import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packet_id, sent_count } = await req.json();

    if (!packet_id || sent_count === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updated = await base44.entities.JobPacket.update(packet_id, {
      sent_to_production_count: sent_count,
    });

    return Response.json({ packet: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});