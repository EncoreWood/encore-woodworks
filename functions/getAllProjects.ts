import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all projects using service role (bypasses created_by filter)
    const projects = await base44.asServiceRole.entities.Project.list("-created_date");

    return Response.json({ projects });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});