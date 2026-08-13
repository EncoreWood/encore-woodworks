import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import { jsPDF } from 'npm:jspdf@4.0.0';

function hexToRgb(hex) {
  if (!hex) return null;
  let h = String(hex).replace('#', '');
  if (h.length === 3) { h = h.split('').map(c => c + c).join(''); }
  const n = parseInt(h, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const DEFAULT_TEMPLATE = {
  logo_url: '',
  company_name: 'Encore Woodworks',
  tagline: 'Custom Cabinetry',
  address: '736 S 5725 W Hurricane, Utah 84737',
  phone: '(435) 632-2903',
  email: 'Team@encorewood.com',
  website: 'www.encorewood.com',
  primary_color: '#8a7560',
  header_bg_color: '#1e293b',
  header_text_color: '#ffffff',
  footer_text: 'Payment is due within 15 days. Please make checks payable to Encore Woodworks. Thank you for your business!',
  font_family: 'helvetica',
  last_invoice_number: 0,
};

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, invoice_type, percentage, amount, invoice_number } = await req.json();
    if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });

    const project = await base44.asServiceRole.entities.Project.get(project_id);

    let template = DEFAULT_TEMPLATE;
    try {
      const list = await base44.asServiceRole.entities.InvoiceTemplate.list();
      if (list && list.length > 0) template = { ...DEFAULT_TEMPLATE, ...list[0] };
    } catch {}

    let proposal = null;
    try {
      const proposals = await base44.asServiceRole.entities.Proposal.filter({ project_id });
      if (proposals && proposals.length > 0) proposal = proposals[0];
    } catch {}

    const font = String(template.font_family || 'helvetica').toLowerCase();
    const fontFamily = ['helvetica', 'times', 'courier'].includes(font) ? font : 'helvetica';
    const primary = hexToRgb(template.primary_color) || { r: 138, g: 117, b: 96 };
    const headerBg = hexToRgb(template.header_bg_color) || { r: 30, g: 41, b: 59 };
    const headerText = hexToRgb(template.header_text_color) || { r: 255, g: 255, b: 255 };

    const doc = new jsPDF();
    const pageW = 210;
    const LM = 14, RM = 196;

    // Header bar
    doc.setFillColor(headerBg.r, headerBg.g, headerBg.b);
    doc.rect(0, 0, pageW, 34, 'F');

    let logoOffset = 0;
    if (template.logo_url) {
      try {
        const lr = await fetch(template.logo_url);
        if (lr.ok) {
          const ext = (template.logo_url.split('.').pop() || 'png').toLowerCase();
          const fmt = ext === 'jpg' || ext === 'jpeg' ? 'JPEG' : 'PNG';
          const buf = await lr.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const dataUrl = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${b64}`;
          doc.addImage(dataUrl, fmt, LM, 6, 26, 20, undefined, 'FAST');
          logoOffset = 30;
        }
      } catch {}
    }

    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(headerText.r, headerText.g, headerText.b);
    doc.text(template.company_name || 'Encore Woodworks', LM + logoOffset, 14);
    if (template.tagline) {
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(8);
      doc.text(template.tagline, LM + logoOffset, 19);
    }

    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(22);
    doc.text('INVOICE', RM, 16, { align: 'right' });
    doc.setFontSize(11);
    doc.text(`#${invoice_number || ''}`, RM, 24, { align: 'right' });
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString(), RM, 30, { align: 'right' });

    // Company contact info
    let y = 40;
    doc.setFontSize(8);
    doc.setTextColor(80);
    [template.address, template.phone, template.email, template.website].filter(Boolean).forEach((l) => {
      doc.text(l, LM, y); y += 4;
    });

    // Bill To
    y = Math.max(y, 52);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text('BILL TO', LM, y);
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(60);
    doc.setFontSize(9);
    let by = y + 5;
    [project.client_name, project.client_email, project.client_phone, project.address].filter(Boolean).forEach((l) => {
      doc.text(String(l), LM, by, { maxWidth: 90 }); by += 4;
    });

    // Invoice type badge
    const typeLabels = { deposit: 'DEPOSIT INVOICE', progress: 'PROGRESS PAYMENT', final: 'FINAL INVOICE' };
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(LM, by + 4, 76, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(10);
    doc.text(`${typeLabels[invoice_type] || 'INVOICE'} (${percentage || 0}%)`, LM + 3, by + 10);
    doc.setTextColor(0, 0, 0);

    let yPos = by + 20;

    const originalSubtotal = Number(project.base_amount || project.total_amount || project.estimated_budget || 0);
    const changeOrders = project.change_orders || [];
    const coTotal = changeOrders.reduce((s, co) => s + Number(co.amount || 0), 0);
    const grandTotal = originalSubtotal + coTotal;
    const amountDue = (amount != null && !isNaN(Number(amount))) ? Number(amount) : (Number(percentage || 0) / 100 * grandTotal);

    const drawTableHeader = (ty) => {
      doc.setFillColor(primary.r, primary.g, primary.b);
      doc.rect(LM, ty - 5, RM - LM, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(9);
      doc.text('Description', LM + 2, ty);
      doc.text('Amount', RM - 5, ty, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    };

    // Original contract
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(10);
    doc.text('Original Contract', LM, yPos);
    yPos += 5;
    drawTableHeader(yPos);
    yPos += 8;
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    if (proposal && proposal.rooms && proposal.rooms.length > 0) {
      proposal.rooms.forEach((room) => {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.text(String(room.room_name || 'Cabinet'), LM + 2, yPos, { maxWidth: 120 });
        doc.text(fmtMoney(room.price || 0), RM - 5, yPos, { align: 'right' });
        doc.setDrawColor(230, 230, 230);
        doc.line(LM, yPos + 2, RM, yPos + 2);
        yPos += 6;
      });
    } else {
      doc.text('Cabinet Contract', LM + 2, yPos, { maxWidth: 120 });
      doc.text(fmtMoney(originalSubtotal), RM - 5, yPos, { align: 'right' });
      yPos += 6;
    }
    doc.setFont(fontFamily, 'bold');
    doc.setFillColor(245, 245, 245);
    doc.rect(LM, yPos - 5, RM - LM, 7, 'F');
    doc.text('Subtotal (Original)', LM + 2, yPos);
    doc.text(fmtMoney(originalSubtotal), RM - 5, yPos, { align: 'right' });
    yPos += 10;

    // Change orders
    if (changeOrders.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(10);
      doc.text('Change Orders', LM, yPos);
      yPos += 5;
      drawTableHeader(yPos);
      yPos += 8;
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(9);
      changeOrders.forEach((co) => {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.text(String(co.description || 'Change Order'), LM + 2, yPos, { maxWidth: 120 });
        doc.text(fmtMoney(co.amount || 0), RM - 5, yPos, { align: 'right' });
        yPos += 6;
      });
      doc.setFont(fontFamily, 'bold');
      doc.setFillColor(245, 245, 245);
      doc.rect(LM, yPos - 5, RM - LM, 7, 'F');
      doc.text('Subtotal (Change Orders)', LM + 2, yPos);
      doc.text(fmtMoney(coTotal), RM - 5, yPos, { align: 'right' });
      yPos += 10;
    }

    // Totals + amount due
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    const boxX = RM - 70, boxW = 70;
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    let ty = yPos;
    doc.text('Subtotal:', boxX, ty); doc.text(fmtMoney(originalSubtotal), RM - 5, ty, { align: 'right' }); ty += 6;
    if (coTotal > 0) { doc.text('Change Orders:', boxX, ty); doc.text(fmtMoney(coTotal), RM - 5, ty, { align: 'right' }); ty += 6; }
    doc.text('Grand Total:', boxX, ty); doc.text(fmtMoney(grandTotal), RM - 5, ty, { align: 'right' }); ty += 8;
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(boxX, ty - 6, boxW, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(11);
    doc.text('Amount Due:', boxX + 2, ty);
    doc.text(fmtMoney(amountDue), RM - 5, ty, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos = ty + 12;

    // Footer
    if (template.footer_text) {
      if (yPos > 265) { doc.addPage(); yPos = 20; }
      doc.setDrawColor(primary.r, primary.g, primary.b);
      doc.setLineWidth(0.5);
      doc.line(LM, yPos, RM, yPos);
      yPos += 5;
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80);
      String(template.footer_text).split('\n').filter((l) => l.trim()).forEach((l) => {
        doc.text(l, LM, yPos, { maxWidth: RM - LM }); yPos += 4;
      });
    }

    const pdfBytes = doc.output('arraybuffer');
    const fileName = `Invoice_${invoice_number || project.project_name || 'document'}.pdf`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    return Response.json({ file_url, file_name: fileName });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});