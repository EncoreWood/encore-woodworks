import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function QRCodeDialog({ item, open, onOpenChange }) {
  if (!item) return null;
  const scanUrl = `${window.location.origin}/InventoryScan?item=${item.id}`;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=400,height=300");
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(scanUrl)}`;
    const imgHtml = item.image_url
      ? `<img src="${item.image_url}" style="width:100px;height:100px;object-fit:cover;border-radius:6px;" />`
      : "";
    printWindow.document.write(`
      <html><head><title>QR - ${item.name}</title>
      <style>
        @page { size: 4in 2in; margin: 0; }
        body { margin:0; font-family:Arial,sans-serif; }
        .label {
          width:4in; height:2in; box-sizing:border-box;
          display:flex; align-items:center; gap:10px;
          padding:8px 10px; overflow:hidden;
        }
        .label img { flex-shrink:0; }
        .label-text { min-width:0; flex:1; }
        h2 { font-size:16px; margin:0 0 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        p { font-size:12px; color:#555; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      </style></head><body>
      <div class="label">
        <img src="${qrSrc}" width="150" height="150" />
        ${imgHtml}
        <div class="label-text">
          <h2>${item.name}</h2>
          ${item.item_sku ? `<p style="font-family:monospace;font-weight:bold;color:#333;">ID: ${item.item_sku}</p>` : ""}
          <p>${item.location || ""}</p>
        </div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>QR Code</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white border-2 border-slate-200 rounded-xl">
              <QRCodeSVG value={scanUrl} size={160} includeMargin={true} />
            </div>
            {item.image_url && (
              <img src={item.image_url} alt={item.name} className="w-24 h-24 rounded-xl object-cover border-2 border-slate-200" />
            )}
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900">{item.name}</p>
            {item.item_sku && <p className="text-sm font-mono font-semibold text-slate-700">ID: {item.item_sku}</p>}
            {item.location && <p className="text-sm text-slate-500">{item.location}</p>}
          </div>
          <Button onClick={handlePrint} className="w-full bg-amber-600 hover:bg-amber-700 gap-2">
            <Printer className="w-4 h-4" /> Print Label
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}