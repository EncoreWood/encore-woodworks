import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { week_start } = body;

    if (!week_start) {
      return Response.json({ error: "week_start is required" }, { status: 400 });
    }

    // Check if a topic already exists for this week
    const existing = await base44.asServiceRole.entities.WeeklyTopic.filter({ week_start });
    const hasAutoTopic = existing.some(t => t.auto_generated === true);
    if (hasAutoTopic) {
      return Response.json({ message: "Auto topic already exists for this week", skipped: true });
    }

    // Build a prompt for a weekly theme + 5 daily slices
    const prompt = `You are a workplace improvement coach for a custom cabinet woodworking shop.
Generate a compelling weekly learning topic and 5 daily "teachable slices" (Mon–Fri).

The topic should relate to one or more of these areas:
- Self-improvement and personal growth
- Work quality and craftsmanship excellence
- Shop cleanliness, organization, and 5S principles
- Lean manufacturing and waste reduction
- Communication and teamwork
- Safety and best practices
- Time management and efficiency

Return a JSON object with this exact structure:
{
  "theme": "Short engaging topic title (e.g., 'The Power of 5S')",
  "overview": "2-3 sentence overview of why this topic matters for the shop",
  "daily_slices": [
    { "day": "Monday", "title": "Slice title", "content": "2-4 sentence practical tip or insight the team can apply that day" },
    { "day": "Tuesday", "title": "Slice title", "content": "..." },
    { "day": "Wednesday", "title": "Slice title", "content": "..." },
    { "day": "Thursday", "title": "Slice title", "content": "..." },
    { "day": "Friday", "title": "Slice title", "content": "..." }
  ]
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          theme: { type: "string" },
          overview: { type: "string" },
          daily_slices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                title: { type: "string" },
                content: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Save the weekly topic with all daily slices embedded as notes
    const dailySlicesText = result.daily_slices
      .map(s => `**${s.day} — ${s.title}**\n${s.content}`)
      .join("\n\n");

    const fullNotes = `${result.overview}\n\n---\n\n${dailySlicesText}`;

    const topic = await base44.asServiceRole.entities.WeeklyTopic.create({
      week_start,
      label: result.theme,
      notes: fullNotes,
      auto_generated: true,
      daily_slices: JSON.stringify(result.daily_slices),
      presented_at: new Date().toISOString()
    });

    return Response.json({ success: true, topic });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});