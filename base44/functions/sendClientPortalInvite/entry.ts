import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

function bytesToBase64(bytes, urlSafe) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  let b = btoa(bin);
  if (urlSafe) b = b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to_email, client_name, project_name, portal_url } = await req.json();
    if (!to_email) return Response.json({ error: 'Missing recipient email' }, { status: 400 });
    if (!portal_url) return Response.json({ error: 'Missing portal_url' }, { status: 400 });

    const firstName = (client_name || '').trim().split(/\s+/)[0] || 'there';
    const subject = `Your Encore Woodworks Client Portal${project_name ? ` — ${project_name}` : ''}`;

    const textBody =
      `Hi ${firstName},\n\n` +
      `Welcome to your Encore Woodworks Client Portal${project_name ? ` for ${project_name}` : ''}. ` +
      `You can log in anytime to view your project's status, milestones, documents, 3D presentations, and messages with our team.\n\n` +
      `Open your portal here:\n${portal_url}\n\n` +
      `If you have any trouble logging in, just reply to this email and we'll help you out.\n\n` +
      `— The Encore Woodworks Team`;

    const htmlBody =
      `<div style="font-family:Helvetica,Arial,sans-serif;color:#1e293b;max-width:560px;margin:0 auto;">` +
      `<div style="background:#1e293b;padding:24px;border-radius:12px 12px 0 0;text-align:center;">` +
      `<img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" alt="Encore Woodworks" style="height:56px;object-fit:contain;" />` +
      `</div>` +
      `<div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px;">` +
      `<h2 style="margin:0 0 16px;color:#8a7560;">Welcome to your Client Portal${project_name ? ` — ${project_name}` : ''}</h2>` +
      `<p style="font-size:15px;line-height:1.6;">Hi ${firstName},</p>` +
      `<p style="font-size:15px;line-height:1.6;">` +
      `You can log in anytime to view your project's status, milestones, documents, 3D presentations, and messages with our team.` +
      `</p>` +
      `<p style="margin:24px 0;text-align:center;">` +
      `<a href="${portal_url}" style="display:inline-block;background:#8a7560;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;">Open My Portal</a>` +
      `</p>` +
      `<p style="font-size:13px;color:#64748b;word-break:break-all;">If the button doesn't work, copy this link:<br/>${portal_url}</p>` +
      `<p style="font-size:14px;line-height:1.6;color:#64748b;">If you have any trouble logging in, just reply to this email and we'll help you out.</p>` +
      `<p style="font-size:14px;margin-top:24px;color:#64748b;">— The Encore Woodworks Team</p>` +
      `</div></div>`;

    const boundary = '----=_Part_' + Date.now();
    const emailLines = [
      `To: ${to_email}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      textBody,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlBody,
      `--${boundary}--`,
      '',
    ];
    const email = emailLines.join('\r\n');
    const encodedEmail = bytesToBase64(new TextEncoder().encode(email), true);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encodedEmail }),
    });
    if (!resp.ok) {
      const errTxt = await resp.text();
      return Response.json({ error: `Failed to send email: ${errTxt}` }, { status: 500 });
    }

    return Response.json({ success: true, to: to_email });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});