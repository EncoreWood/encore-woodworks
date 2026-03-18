import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event.type !== 'update' || data.status !== 'approved') {
      return Response.json({ status: 'skipped' });
    }

    const projectName = data.project_name;
    const projectId = event.entity_id;

    // Check if chat room already exists for this project
    const existingRoom = await base44.asServiceRole.entities.ChatRoom.filter({
      project_id: projectId
    });

    if (existingRoom.length > 0) {
      return Response.json({ status: 'chat_already_exists' });
    }

    // Create new chat room
    const chatRoom = await base44.asServiceRole.entities.ChatRoom.create({
      name: projectName,
      project_id: projectId,
      description: `Chat room for project: ${projectName}`
    });

    return Response.json({ status: 'success', chat_room_id: chatRoom.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});