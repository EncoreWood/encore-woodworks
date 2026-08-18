import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const projectId = body.project_id;
    const projectName = body.project_name;
    if (!projectId || !projectName) {
      return Response.json({ error: 'project_id and project_name are required' }, { status: 400 });
    }

    // Skip archived projects — they're no longer active and shouldn't pull new emails.
    // This mirrors the `!p.archived` exclusion used in active-project views (e.g. the Project Board).
    let projectRecord = null;
    try {
      projectRecord = await base44.asServiceRole.entities.Project.get(projectId);
    } catch {}
    if (projectRecord?.archived) {
      return Response.json({ skipped: true, message: `Project '${projectName}' is archived — email sync skipped` });
    }

    // Get the Gmail access token (shared connector — builder's account)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Resolve email keywords: prefer the body param, otherwise fall back to the saved project field
    let emailKeywords = (body.email_keywords || '').trim();
    if (!emailKeywords) {
      emailKeywords = (projectRecord?.email_keywords || '').trim();
    }

    // Build a Gmail search query: subject matches the project name OR any keyword
    const terms = [projectName];
    if (emailKeywords) {
      emailKeywords.split(',').forEach(k => {
        const t = k.trim();
        if (t) terms.push(t);
      });
    }
    const query = terms.map(t => `subject:"${t}"`).join(' OR ');
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      { headers: authHeader }
    );
    if (!listRes.ok) {
      const errText = await listRes.text();
      return Response.json(
        { error: `Gmail list failed (${listRes.status}): ${errText}` },
        { status: 502 }
      );
    }
    const listData = await listRes.json();
    const messages = listData.messages || [];

    // Skip messages we've already stored for this project
    const existing = await base44.asServiceRole.entities.ProjectEmail.filter({ project_id: projectId });
    const seenIds = new Set((existing || []).map(e => e.gmail_message_id).filter(Boolean));

    const decodeBody = (data) => {
      if (!data) return '';
      const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(normalized);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    };

    let newCount = 0;
    for (const m of messages) {
      if (seenIds.has(m.id)) continue;

      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
        { headers: authHeader }
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();

      const headers = msg.payload?.headers || [];
      const getHeader = (name) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const from = getHeader('from');
      const subject = getHeader('subject');
      const dateHeader = getHeader('date');

      let senderName = from;
      let senderEmail = from;
      const fromMatch = from.match(/^(.*?)\s*<([^>]+)>$/);
      if (fromMatch) {
        senderName = fromMatch[1].trim().replace(/^"|"$/g, '');
        senderEmail = fromMatch[2];
      } else if (from.includes('@')) {
        senderName = '';
        senderEmail = from;
      }

      // Extract body (prefer plain text, then HTML, then top-level body)
      let bodyFull = '';
      const parts = msg.payload?.parts || [];
      const findPart = (mimeType) => {
        if (msg.payload?.mimeType === mimeType && msg.payload?.body?.data) return msg.payload;
        return parts.find(p => p.mimeType === mimeType && p.body?.data) || null;
      };
      const plain = findPart('text/plain');
      const html = findPart('text/html');
      if (plain) bodyFull = decodeBody(plain.body.data);
      else if (html) bodyFull = decodeBody(html.body.data);
      else if (msg.payload?.body?.data) bodyFull = decodeBody(msg.payload.body.data);

      // Cap stored body to avoid oversized records
      if (bodyFull.length > 100000) bodyFull = bodyFull.slice(0, 100000);

      const hasAttachments = parts.some(p => p.filename);
      const attachmentUrls = parts
        .filter(p => p.filename)
        .map(p => ({
          filename: p.filename,
          mimeType: p.mimeType || 'application/octet-stream',
          size: p.body?.size || 0,
          attachmentId: p.body?.attachmentId || '',
          messageId: m.id
        }));

      let dateReceived = '';
      try {
        dateReceived = dateHeader ? new Date(dateHeader).toISOString() : new Date(parseInt(msg.internalDate, 10)).toISOString();
      } catch {
        dateReceived = new Date(parseInt(msg.internalDate, 10)).toISOString();
      }

      await base44.asServiceRole.entities.ProjectEmail.create({
        project_id: projectId,
        project_name: projectName,
        gmail_message_id: m.id,
        thread_id: msg.threadId || '',
        sender: senderName,
        sender_email: senderEmail,
        subject: subject || '(no subject)',
        body_snippet: msg.snippet || bodyFull.slice(0, 200),
        body_full: bodyFull,
        date_received: dateReceived,
        has_attachments: !!hasAttachments,
        attachment_urls: attachmentUrls,
        labels: msg.labelIds || []
      });
      newCount++;
    }

    return Response.json({
      synced: newCount,
      message: `Synced ${newCount} new email(s) for '${projectName}'`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}