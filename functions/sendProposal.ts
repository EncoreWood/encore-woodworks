import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to_email, proposal_id, subject, message } = await req.json();

    if (!to_email || !proposal_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the proposal
    const proposal = await base44.entities.Proposal.get(proposal_id);

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    // Build email content
    let emailBody = message || 'Please find the proposal details below.';
    emailBody += `\n\nProposal: ${proposal.job_name || proposal.project_name}`;
    
    if (proposal.address) {
      emailBody += `\nAddress: ${proposal.address}`;
    }
    
    if (proposal.cabinet_style) {
      emailBody += `\n\nCabinet Style: ${proposal.cabinet_style}`;
    }
    if (proposal.wood_species) {
      emailBody += `\nWood Species: ${proposal.wood_species}`;
    }
    if (proposal.door_style) {
      emailBody += `\nDoor Style: ${proposal.door_style}`;
    }
    
    if (proposal.rooms && proposal.rooms.length > 0) {
      emailBody += `\n\nRooms:`;
      proposal.rooms.forEach(room => {
        emailBody += `\n- ${room.room_name}${room.finish ? ` (${room.finish})` : ''}: $${room.price?.toLocaleString() || 0}`;
        if (room.items_of_recognition) {
          emailBody += `\n  ${room.items_of_recognition}`;
        }
      });
    }

    const selectedOptions = proposal.options?.filter(opt => opt.selected) || [];
    if (selectedOptions.length > 0) {
      emailBody += `\n\nSelected Options:`;
      selectedOptions.forEach(option => {
        emailBody += `\n- ${option.description}: $${option.price?.toLocaleString() || 0}`;
      });
    }

    if (proposal.overall_total) {
      emailBody += `\n\nTotal: $${proposal.overall_total.toLocaleString()}`;
    }

    if (proposal.payment_terms) {
      emailBody += `\n\n${proposal.payment_terms}`;
    }

    if (proposal.notes) {
      emailBody += `\n\nNotes:\n${proposal.notes}`;
    }

    // Create email message
    const email = [
      `To: ${to_email}`,
      `Subject: ${subject || `Proposal: ${proposal.job_name || proposal.project_name}`}`,
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

    return Response.json({ success: true, message: 'Proposal sent successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});