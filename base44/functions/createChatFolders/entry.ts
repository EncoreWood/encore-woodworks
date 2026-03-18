import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create') {
      return Response.json({ success: true });
    }

    const roomId = data.id;

    // Create files and photos folders
    await Promise.all([
      base44.entities.ChatFolder.create({
        room_id: roomId,
        name: 'Files',
        type: 'files',
        files: []
      }),
      base44.entities.ChatFolder.create({
        room_id: roomId,
        name: 'Photos',
        type: 'photos',
        files: []
      })
    ]);

    return Response.json({ success: true, message: 'Folders created' });
  } catch (error) {
    console.error('Error creating folders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});