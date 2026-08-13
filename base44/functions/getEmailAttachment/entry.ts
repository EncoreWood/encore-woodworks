import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const MIME_BY_EXT = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const messageId = body.messageId;
    const attachmentId = body.attachmentId;
    const filename = body.filename || 'attachment';
    if (!messageId || !attachmentId) {
      return Response.json({ error: 'messageId and attachmentId are required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const attRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: authHeader }
    );
    if (!attRes.ok) {
      const errText = await attRes.text();
      return Response.json(
        { error: `Gmail attachment fetch failed (${attRes.status}): ${errText}` },
        { status: 502 }
      );
    }
    const att = await attRes.json();

    // Gmail returns base64url-encoded data; normalize to standard base64
    const b64 = (att.data || '').replace(/-/g, '+').replace(/_/g, '/');

    const ext = (filename.split('.').pop() || '').toLowerCase();
    const mimeType = body.mimeType || MIME_BY_EXT[ext] || 'application/octet-stream';

    const dataUrl = `data:${mimeType};base64,${b64}`;
    return Response.json({
      filename,
      mimeType,
      size: att.size || 0,
      dataUrl
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}