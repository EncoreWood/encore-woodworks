import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function QRCodeDialog({ item, open, onOpenChange }) {
  if (!item) return null;
  const scanUrl = `${window.location.origin}/InventoryScan?item=${item.id}`;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=400,height=500");
    printWindow.document.write(`
      <html><head><title>QR - ${item.name}</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; font-family:Arial,sans-serif; }
        h2 { font-size:18px; margin:8px 0 4px; }
        p { font-size:12px; color:#666; margin:0; }
      </style></head><body>
      <div id="qr"></div>
      <h2>${item.name}</h2>
      <p>${item.location || ""}</p>
      <p>Qty: ${item.quantity} ${item.unit || ""}</p>
      </body></html>
    `);
    // Generate QR as SVG string
    const svgEl = document.querySelector("#qr-svg-clone");
    printWindow.document.body.innerHTML = printWindow.document.body.innerHTML;
    // Use a simple approach: write the QR via the library's toString
    const qrContainer = printWindow.document.getElementById("qr");
    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanUrl)}" width="200" height="200" />`;
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>QR Code</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-white border-2 border-slate-200 rounded-xl">
            <QRCodeSVG value={scanUrl} size={200} includeMargin={true} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900">{item.name}</p>
            {item.location && <p className="text-sm text-slate-500">{item.location}</p>}
            <p className="text-sm text-slate-500">{item.quantity} {item.unit}</p>
          </div>
          <Button onClick={handlePrint} className="w-full bg-amber-600 hover:bg-amber-700 gap-2">
            <Printer className="w-4 h-4" /> Print Label
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}