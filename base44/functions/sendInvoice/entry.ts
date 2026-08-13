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

    const { project_id, invoice_type, percentage, amount, invoice_number, invoice_number_int, to_email, subject, body } = await req.json();
    if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });
    if (!to_email) return Response.json({ error: 'Missing recipient email' }, { status: 400 });

    const project = await base44.asServiceRole.entities.Project.get(project_id);

    // Generate the invoice PDF
    const pdfResult = await base44.functions.invoke('generateInvoicePDF', { project_id, invoice_type, percentage, amount, invoice_number });
    const pdfUrl = pdfResult.data.file_url;
    const pdfName = pdfResult.data.file_name;

    // Download the PDF bytes
    const pr = await fetch(pdfUrl);
    const pdfBytes = await pr.arrayBuffer();
    const pdfBase64 = bytesToBase64(new Uint8Array(pdfBytes), false);

    // Build the MIME message
    const boundary = '----=_Part_' + Date.now();
    const emailLines = [
      `To: ${to_email}`,
      `Subject: ${subject || 'Invoice from Encore Woodworks'}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      body || 'Please find attached your invoice.',
      '',
      `--${boundary}`,
      `Content-Type: application/pdf; name="${pdfName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${pdfName}"`,
      '',
      pdfBase64,
      `--${boundary}--`,
      '',
    ];
    const email = emailLines.join('\r\n');
    const encodedEmail = bytesToBase64(new TextEncoder().encode(email), true);

    // Send via Gmail
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

    // Increment the invoice number counter
    try {
      const tlist = await base44.asServiceRole.entities.InvoiceTemplate.list();
      if (tlist && tlist.length > 0 && invoice_number_int) {
        await base44.asServiceRole.entities.InvoiceTemplate.update(tlist[0].id, { last_invoice_number: invoice_number_int });
      }
    } catch {}

    // Record the sent invoice
    const originalSubtotal = Number(project.base_amount || project.total_amount || project.estimated_budget || 0);
    const coTotal = (project.change_orders || []).reduce((s, co) => s + Number(co.amount || 0), 0);
    const grandTotal = originalSubtotal + coTotal;
    const today = new Date().toISOString().split('T')[0];
    try {
      await base44.asServiceRole.entities.InvoiceRecord.create({
        invoice_number: invoice_number || '',
        project_id,
        project_name: project.project_name,
        client_name: project.client_name,
        client_email: to_email,
        invoice_type,
        percentage: Number(percentage || 0),
        amount: Number(amount || 0),
        subtotal: originalSubtotal,
        change_orders_total: coTotal,
        grand_total: grandTotal,
        status: 'sent',
        sent_date: today,
        pdf_url: pdfUrl,
        email_subject: subject || '',
        created_by_name: user.full_name || user.email,
      });
    } catch {}

    // Update the project's stage sent date
    const projUpdate = {};
    if (invoice_type === 'deposit') projUpdate.deposit_invoice_sent_date = today;
    else if (invoice_type === 'progress') projUpdate.ninety_percent_invoice_sent_date = today;
    else if (invoice_type === 'final') projUpdate.final_invoice_sent_date = today;
    if (Object.keys(projUpdate).length > 0) {
      try { await base44.asServiceRole.entities.Project.update(project_id, projUpdate); } catch {}
    }

    return Response.json({ success: true, invoice_number, pdf_url: pdfUrl });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});