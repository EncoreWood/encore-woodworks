import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";

// Avery 5160: 3 columns × 10 rows = 30 labels, 2.625" × 1.0" each
export default function PrintAllLabels({ items, open, onOpenChange }) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    const labels = items.map(item => {
      const url = `${window.location.origin}/InventoryScan?item=${item.id}`;
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(url)}`;
      const imgHtml = item.image_url ? `<img src="${item.image_url}" class="item-img" />` : "";
      return `
        <div class="label">
          <img src="${qrSrc}" width="70" height="70" />
          ${imgHtml}
          <div class="label-text">
            <div class="label-name">${item.name}</div>
            <div class="label-meta">${item.location || ""}</div>
            <div class="label-meta">Qty: ${item.quantity} ${item.unit || ""}</div>
          </div>
        </div>`;
    }).join("");

    printWindow.document.write(`
      <html><head><title>QR Labels</title>
      <style>
        @page { size: letter; margin: 0.5in 0.1875in; }
        body { margin:0; font-family:Arial,sans-serif; }
        .labels { display:flex; flex-wrap:wrap; gap:0; }
        .label {
          width:2.625in; height:1in; box-sizing:border-box;
          display:flex; align-items:center; gap:6px;
          padding:4px 8px; overflow:hidden;
          border:1px dashed #ddd;
        }
        .label img { flex-shrink:0; }
        .label .item-img { width:50px; height:50px; object-fit:cover; border-radius:4px; }
        .label-text { min-width:0; flex:1; }
        .label-name { font-size:10px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .label-meta { font-size:8px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      </style></head><body>
      <div class="labels">${labels}</div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Print All QR Labels</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Generates a printable sheet of QR code labels for all {items.length} inventory items, formatted for Avery 5160 label sheets (3 columns × 10 rows).
          </p>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg">
            {items.slice(0, 9).map(item => (
              <div key={item.id} className="flex flex-col items-center text-center p-1">
                <QRCodeSVG value={`${window.location.origin}/InventoryScan?item=${item.id}`} size={50} />
                <span className="text-[8px] font-medium text-slate-600 truncate w-full mt-1">{item.name}</span>
              </div>
            ))}
          </div>
          {items.length > 9 && <p className="text-xs text-slate-400 text-center">+ {items.length - 9} more</p>}
          <Button onClick={handlePrint} className="w-full bg-amber-600 hover:bg-amber-700 gap-2">
            <Printer className="w-4 h-4" /> Print Labels Sheet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}