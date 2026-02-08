import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to_email, template_id, subject, message } = await req.json();

    if (!to_email || !template_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the template
    const template = await base44.entities.ProposalTemplate.get(template_id);

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    // Build email content
    let emailBody = message || 'Please find the proposal template attached.';
    emailBody += `\n\nTemplate: ${template.template_name}\n`;
    
    if (template.cabinet_style) {
      emailBody += `\nCabinet Style: ${template.cabinet_style}`;
    }
    if (template.wood_species) {
      emailBody += `\nWood Species: ${template.wood_species}`;
    }
    if (template.door_style) {
      emailBody += `\nDoor Style: ${template.door_style}`;
    }
    
    if (template.rooms && template.rooms.length > 0) {
      emailBody += `\n\nRooms:`;
      template.rooms.forEach(room => {
        emailBody += `\n- ${room.room_name}${room.finish ? ` (${room.finish})` : ''}: $${room.price?.toLocaleString() || 0}`;
      });
    }

    if (template.options && template.options.length > 0) {
      emailBody += `\n\nOptions:`;
      template.options.forEach(option => {
        emailBody += `\n- ${option.description}: $${option.price?.toLocaleString() || 0}`;
      });
    }

    if (template.payment_terms) {
      emailBody += `\n\n${template.payment_terms}`;
    }

    // Create email message
    const email = [
      `To: ${to_email}`,
      `Subject: ${subject || `Proposal Template: ${template.template_name}`}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      emailBody
    ].join('\n');

    const encodedEmail = btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `Failed to send email: ${error}` }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});