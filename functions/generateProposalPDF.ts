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

    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('PROPOSAL', 105, yPos, { align: 'center' });
    yPos += 10;

    // Company Info
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Encore Woodworks', 105, yPos, { align: 'center' });
    yPos += 4;
    doc.text('435-313-6984 | encore.woodworks@gmail.com', 105, yPos, { align: 'center' });
    yPos += 4;
    doc.text('2150 Industrial Parkway, Elk Ridge, UT 84651', 105, yPos, { align: 'center' });
    yPos += 10;

    // Project Info
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(proposal.job_name || proposal.project_name || 'Untitled Project', 20, yPos);
    yPos += 6;
    if (proposal.address) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(proposal.address, 20, yPos);
      yPos += 8;
    } else {
      yPos += 2;
    }

    // Specifications
    if (proposal.cabinet_style || proposal.wood_species || proposal.door_style) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Specifications:', 20, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      if (proposal.cabinet_style) {
        doc.text(`Cabinet Style: ${proposal.cabinet_style}`, 25, yPos);
        yPos += 5;
      }
      if (proposal.wood_species) {
        doc.text(`Wood Species: ${proposal.wood_species}`, 25, yPos);
        yPos += 5;
      }
      if (proposal.door_style) {
        doc.text(`Door Style: ${proposal.door_style}`, 25, yPos);
        yPos += 5;
      }
      if (proposal.handles) {
        doc.text(`Handles: ${proposal.handles}`, 25, yPos);
        yPos += 5;
      }
      if (proposal.drawerbox) {
        doc.text(`Drawerbox: ${proposal.drawerbox}`, 25, yPos);
        yPos += 5;
      }
      if (proposal.drawer_glides) {
        doc.text(`Drawer Glides: ${proposal.drawer_glides}`, 25, yPos);
        yPos += 5;
      }
      if (proposal.hinges) {
        doc.text(`Hinges: ${proposal.hinges}`, 25, yPos);
        yPos += 5;
      }
      yPos += 3;
    }

    // Standard Rooms
    if (proposal.rooms && proposal.rooms.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Standard Rooms:', 20, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Room', 20, yPos);
      doc.text('Finish', 80, yPos);
      doc.text('Price', 170, yPos);
      yPos += 5;

      doc.setFont(undefined, 'normal');
      proposal.rooms.forEach(room => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(room.room_name || '', 20, yPos);
        doc.text(room.finish || '', 80, yPos);
        doc.text(`$${(room.price || 0).toLocaleString()}`, 170, yPos);
        yPos += 5;
        if (room.items_of_recognition) {
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(room.items_of_recognition, 25, yPos);
          yPos += 4;
          doc.setFontSize(9);
          doc.setTextColor(0);
        }
      });

      doc.setFont(undefined, 'bold');
      yPos += 2;
      doc.text(`Standard Total: $${(proposal.standard_total || 0).toLocaleString()}`, 20, yPos);
      yPos += 8;
    }

    // Options
    const selectedOptions = proposal.options?.filter(opt => opt.selected) || [];
    if (selectedOptions.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Selected Options:', 20, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      selectedOptions.forEach(option => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`☑ ${option.description}`, 20, yPos);
        doc.text(`$${(option.price || 0).toLocaleString()}`, 170, yPos);
        yPos += 5;
      });
      yPos += 3;
    }

    // Overall Total
    if (proposal.overall_total) {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`TOTAL: $${proposal.overall_total.toLocaleString()}`, 20, yPos);
      yPos += 10;
    }

    // Payment Terms
    if (proposal.payment_terms) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Payment Terms:', 20, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const terms = proposal.payment_terms.split('\n');
      terms.forEach(line => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
        yPos += 5;
      });
      yPos += 3;
    }

    // Notes
    if (proposal.notes) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Notes:', 20, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const notes = proposal.notes.split('\n');
      notes.forEach(line => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
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