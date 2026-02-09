import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { old_page_name, new_page_name } = await req.json();

    if (!old_page_name || !new_page_name) {
      return Response.json({ error: 'old_page_name and new_page_name are required' }, { status: 400 });
    }

    const references = [];

    // Check Projects for project_url references
    const projects = await base44.asServiceRole.entities.Project.list();
    for (const project of projects) {
      if (project.project_url?.includes(old_page_name)) {
        await base44.asServiceRole.entities.Project.update(project.id, {
          ...project,
          project_url: project.project_url.replace(old_page_name, new_page_name)
        });
        references.push({ type: 'Project', id: project.id, field: 'project_url' });
      }
    }

    // Check ChatRooms
    const chatRooms = await base44.asServiceRole.entities.ChatRoom.list();
    for (const room of chatRooms) {
      if (room.project_id?.includes(old_page_name)) {
        references.push({ type: 'ChatRoom', id: room.id, field: 'project_id', note: 'Manual review needed' });
      }
    }

    // Check Forms
    const forms = await base44.asServiceRole.entities.Form.list();
    for (const form of forms) {
      if (form.description?.includes(old_page_name)) {
        references.push({ type: 'Form', id: form.id, field: 'description', note: 'Manual review needed' });
      }
    }

    return Response.json({
      success: true,
      updated_references: references.length,
      references
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});