import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposal_id } = await req.json();

    if (!proposal_id) {
      return Response.json({ error: 'Missing proposal_id' }, { status: 400 });
    }

    const proposal = await base44.entities.Proposal.get(proposal_id);
    const doc = new jsPDF();

    let yPos = 25;
    const leftMargin = 20;
    const rightMargin = 190;
    const pageWidth = 210;

    // Company Info Header
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text('736 S 5725 W Hurricane, Utah 84737', 105, yPos, { align: 'center' });
    yPos += 4;
    doc.text('(435)632-2903 - Mitch', 105, yPos, { align: 'center' });
    yPos += 4;
    doc.text('(435)632-2292 - Ben', 105, yPos, { align: 'center' });
    yPos += 4;
    doc.text('Team@encorewood.com', 105, yPos, { align: 'center' });
    yPos += 8;

    // Proposal Title
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text('Proposal', 105, yPos, { align: 'center' });
    yPos += 12;

    // Divider line
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 10;

    // Project Info Section (2 columns)
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(80);
    doc.text('Job Name:', leftMargin, yPos);
    doc.text('Address:', 110, yPos);
    yPos += 6;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.text(proposal.job_name || proposal.project_name || 'Untitled Project', leftMargin, yPos);
    doc.text(proposal.address || 'N/A', 110, yPos);
    yPos += 12;

    // Specifications Box
    if (proposal.cabinet_style || proposal.wood_species || proposal.door_style) {
      // Draw box background
      doc.setFillColor(248, 250, 252);
      doc.rect(leftMargin, yPos, rightMargin - leftMargin, 40, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(leftMargin, yPos, rightMargin - leftMargin, 40, 'S');
      
      yPos += 7;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0);
      doc.text('Specifications', leftMargin + 5, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60);
      
      const col1X = leftMargin + 5;
      const col2X = 110;
      let specRow = yPos;
      
      const specs = [
        { label: 'Cabinet Style:', value: proposal.cabinet_style },
        { label: 'Wood Species:', value: proposal.wood_species },
        { label: 'Door Style:', value: proposal.door_style },
        { label: 'Handles:', value: proposal.handles },
        { label: 'Drawerbox:', value: proposal.drawerbox },
        { label: 'Drawer Glides:', value: proposal.drawer_glides },
        { label: 'Hinges:', value: proposal.hinges }
      ];
      
      specs.forEach((spec, idx) => {
        if (spec.value) {
          const xPos = idx % 2 === 0 ? col1X : col2X;
          if (idx % 2 === 0 && idx > 0) specRow += 5;
          doc.setFont(undefined, 'bold');
          doc.text(spec.label, xPos, specRow);
          doc.setFont(undefined, 'normal');
          doc.text(spec.value, xPos + 25, specRow);
          if (idx % 2 === 1) specRow += 5;
        }
      });
      
      yPos += 35;
    }

    // Standard Rooms Table
    if (proposal.rooms && proposal.rooms.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0);
      doc.text('Standard Rooms', leftMargin, yPos);
      yPos += 8;

      // Table header
      doc.setFillColor(241, 245, 249);
      doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, 8, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, yPos + 3, rightMargin, yPos + 3);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0);
      doc.text('Room Name', leftMargin + 2, yPos);
      doc.text('Finish', 70, yPos);
      doc.text('Items of Recognition', 100, yPos);
      doc.text('Price', rightMargin - 5, yPos, { align: 'right' });
      yPos += 8;

      // Table rows
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      proposal.rooms.forEach((room, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setTextColor(0);
        doc.text(room.room_name || '', leftMargin + 2, yPos);
        doc.text(room.finish || '', 70, yPos);
        doc.text(room.items_of_recognition || '', 100, yPos);
        doc.text(`$${(room.price || 0).toLocaleString()}`, rightMargin - 5, yPos, { align: 'right' });
        
        // Row separator
        doc.setDrawColor(226, 232, 240);
        doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);
        yPos += 7;
      });

      // Standard Total row
      doc.setFillColor(248, 250, 252);
      doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, 8, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text('Standard Total:', rightMargin - 55, yPos);
      doc.setFontSize(11);
      doc.text(`$${(proposal.standard_total || 0).toLocaleString()}`, rightMargin - 5, yPos, { align: 'right' });
      yPos += 12;
    }

    // Options Table
    if (proposal.options && proposal.options.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0);
      doc.text('Options', leftMargin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      proposal.options.forEach((option, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        // Checkbox
        const boxSize = 3;
        doc.setDrawColor(150);
        doc.rect(leftMargin + 2, yPos - 3, boxSize, boxSize, 'S');
        if (option.selected) {
          doc.setDrawColor(0);
          doc.line(leftMargin + 2.5, yPos - 1.5, leftMargin + 3.5, yPos - 0.5);
          doc.line(leftMargin + 3.5, yPos - 0.5, leftMargin + 5, yPos - 3);
        }
        
        doc.setTextColor(0);
        doc.text(option.description || '', leftMargin + 8, yPos);
        if (option.selected) {
          doc.setFont(undefined, 'bold');
          doc.text(`$${(option.price || 0).toLocaleString()}`, rightMargin - 5, yPos, { align: 'right' });
          doc.setFont(undefined, 'normal');
        }
        
        // Row separator
        doc.setDrawColor(226, 232, 240);
        doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);
        yPos += 7;
      });

      // Options Total
      const selectedOptionsTotal = proposal.options
        .filter(opt => opt.selected)
        .reduce((sum, opt) => sum + (opt.price || 0), 0);
      
      if (selectedOptionsTotal > 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('Options Total:', rightMargin - 55, yPos);
        doc.text(`$${selectedOptionsTotal.toLocaleString()}`, rightMargin - 5, yPos, { align: 'right' });
        yPos += 2;
      }
      yPos += 10;
    }

    // Overall Total Box
    if (proposal.overall_total) {
      if (yPos > 255) {
        doc.addPage();
        yPos = 20;
      }
      
      // Amber-colored box
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(251, 191, 36);
      doc.setLineWidth(1);
      doc.rect(leftMargin, yPos, rightMargin - leftMargin, 12, 'FD');
      
      yPos += 8;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text('Overall Total:', leftMargin + 5, yPos);
      doc.text(`$${proposal.overall_total.toLocaleString()}`, rightMargin - 5, yPos, { align: 'right' });
      doc.setTextColor(0);
      yPos += 12;
    }

    // Payment Terms Box
    if (proposal.payment_terms) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      const termsLines = proposal.payment_terms.split('\n').filter(line => line.trim());
      const boxHeight = Math.min(termsLines.length * 5 + 10, 60);
      
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(leftMargin, yPos, rightMargin - leftMargin, boxHeight, 'FD');
      
      yPos += 7;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0);
      doc.text('Payment Terms', leftMargin + 5, yPos);
      yPos += 7;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60);
      termsLines.forEach(line => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, leftMargin + 5, yPos);
        yPos += 5;
      });
      yPos += 8;
    }

    // Notes Box
    if (proposal.notes) {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      
      const notesLines = proposal.notes.split('\n').filter(line => line.trim());
      const boxHeight = Math.min(notesLines.length * 5 + 10, 60);
      
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(leftMargin, yPos, rightMargin - leftMargin, boxHeight, 'FD');
      
      yPos += 7;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0);
      doc.text('Additional Notes', leftMargin + 5, yPos);
      yPos += 7;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60);
      notesLines.forEach(line => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, leftMargin + 5, yPos);
        yPos += 5;
      });
    }

    const pdfBytes = doc.output('arraybuffer');
    const fileName = `proposal_${proposal.job_name || proposal.project_name || 'document'}.pdf`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    // Upload to Base44 storage
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({ file_url, file_name: fileName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});