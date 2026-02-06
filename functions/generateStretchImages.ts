import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const stretches = [
      { name: "Neck Rolls", prompt: "Simple stick figure doing neck rolls, side view, minimalist line drawing, white background" },
      { name: "Shoulder Rolls", prompt: "Simple stick figure doing shoulder rolls with circular motion arrows, minimalist line drawing, white background" },
      { name: "Standing Forward Bend", prompt: "Simple stick figure bending forward at the hips with hands reaching down, minimalist line drawing, white background" },
      { name: "Standing Spinal Twist", prompt: "Simple stick figure twisting torso side to side with rotation arrows, minimalist line drawing, white background" },
      { name: "Quad Stretch", prompt: "Simple stick figure standing on one leg pulling foot toward buttocks, minimalist line drawing, white background" },
      { name: "Calf Stretch", prompt: "Simple stick figure with one leg extended behind in a lunge position, minimalist line drawing, white background" }
    ];

    const images = await Promise.all(
      stretches.map(stretch =>
        base44.integrations.Core.GenerateImage({
          prompt: stretch.prompt
        }).then(result => ({
          name: stretch.name,
          url: result.url
        }))
      )
    );

    return Response.json({ images });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});