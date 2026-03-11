import React, { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

export default function BidClientView({ open, onClose, bid, bidType }) {
  const printRef = useRef();

  if (!bid) return null;

  const rooms = bid.rooms || [];
  const grandTotal = rooms.reduce((s, room) =>
    s + (room.items || []).reduce((rs, item) => rs + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0), 0
  );

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${bid.project_name || "Bid"} - Cabinet Estimate</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Georgia, serif; color: #1e1e1e; background: white; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 3px solid #92400e; padding-bottom: 24px; margin-bottom: 28px; }
          .company { font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #92400e; margin-bottom: 6px; }
          h1 { font-size: 26px; font-weight: 700; color: #1e1e1e; }
          .meta { margin-top: 10px; font-size: 13px; color: #555; }
          .meta span { margin: 0 12px; }
          .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 8px; }
          .room { margin-bottom: 24px; page-break-inside: avoid; }
          .room-header { background: #1e293b; color: white; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-radius: 6px 6px 0 0; }
          .room-name { font-size: 15px; font-weight: 700; }
          .room-total { font-size: 15px; font-weight: 700; color: #fcd34d; }
          .items-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-top: none; }
          .items-table td, .items-table th { padding: 8px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
          .items-table th { background: #f8fafc; font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .items-table td:last-child, .items-table th:last-child { text-align: right; }
          .items-table tr:last-child td { border-bottom: none; }
          .cat-badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .cat-base { background: #fef3c7; color: #92400e; }
          .cat-upper { background: #dbeafe; color: #1d4ed8; }
          .cat-tall { background: #ede9fe; color: #6d28d9; }
          .cat-misc { background: #f1f5f9; color: #475569; }
          .totals-section { margin-top: 28px; border-top: 3px solid #92400e; padding-top: 20px; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; color: #475569; }
          .grand-total { display: flex; justify-content: space-between; padding: 14px 0 0; font-size: 22px; font-weight: 700; color: #1e1e1e; border-top: 1px solid #e2e8f0; margin-top: 8px; }
          .grand-total .amount { color: #92400e; }
          .specs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; }
          .spec-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; }
          .spec-value { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 11px; color: #94a3b8; text-align: center; }
          .payment-terms { margin-top: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; }
          .payment-terms h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px; }
          .payment-terms p { font-size: 12px; color: #475569; line-height: 1.6; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <span className="font-semibold text-slate-800">Client Bid Preview</span>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-amber-600 hover:bg-amber-700 h-9">
              <Printer className="w-4 h-4 mr-1.5" /> Print / Save PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 bg-white" ref={printRef}>
          {/* Header */}
          <div className="text-center border-b-2 border-amber-800 pb-6 mb-7">
            <p className="text-xs font-bold tracking-widest text-amber-700 uppercase mb-1">Cabinet Estimate</p>
            <h1 className="text-2xl font-bold text-slate-900">{bid.project_name || "Untitled Project"}</h1>
            <div className="text-sm text-slate-500 mt-2 space-x-4">
              {bid.client_name && <span>{bid.client_name}</span>}
              {bid.address && <span>· {bid.address}</span>}
            </div>
            {bidType && (
              <span className="inline-block mt-2 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">
                {bidType.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {/* Specs */}
          {(bid.wood_species || bid.door_style || bid.handles || bid.drawerbox || bid.drawer_glides || bid.hinges) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mb-7 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              {[
                { label: "Wood Species",  value: bid.wood_species },
                { label: "Door Style",    value: bid.door_style },
                { label: "Handles",       value: bid.handles },
                { label: "Drawerbox",     value: bid.drawerbox },
                { label: "Drawer Glides", value: bid.drawer_glides },
                { label: "Hinges",        value: bid.hinges },
              ].filter(s => s.value).map(s => (
                <div key={s.label}>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{s.label}</span>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Rooms */}
          <div className="space-y-5">
            {rooms.map((room) => {
              const roomTotal = (room.items || []).reduce((s, i) =>
                s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0
              );
              const displayItems = (room.items || []).filter(i => (parseFloat(i.quantity) || 0) > 0 || i.name);

              return (
                <div key={room.id} className="room">
                  {/* Room Header */}
                  <div className="room-header flex items-center justify-between bg-slate-800 text-white px-4 py-2.5 rounded-t-lg">
                    <span className="font-bold text-base">{room.room_name || "Unnamed Room"}</span>
                    <span className="font-bold text-amber-300 text-base">
                      ${roomTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* Items */}
                  <table className="w-full text-sm border border-slate-200 border-t-0 rounded-b-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Category</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayItems.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-3 text-slate-400 text-xs italic">No items</td></tr>
                      ) : displayItems.map(item => {
                        const catColors = { base: "bg-amber-100 text-amber-700", upper: "bg-blue-100 text-blue-700", tall: "bg-purple-100 text-purple-700", misc: "bg-slate-100 text-slate-600" };
                        const catLabels = { base: "Base", upper: "Upper", tall: "Tall", misc: "Misc" };
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-medium text-slate-800">{item.name || "—"}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${catColors[item.cabinet_category] || catColors.misc}`}>
                                {catLabels[item.cabinet_category] || item.cabinet_category}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-slate-700 font-medium">
                              {parseFloat(item.quantity) || 0}
                              <span className="text-slate-400 text-xs ml-1">{item.measure_type === "lf" ? "LF" : "ea"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Grand Total */}
          <div className="mt-8 border-t-2 border-amber-800 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{rooms.length} rooms</p>
                <p className="text-xs text-slate-400 mt-0.5">Pricing valid for 30 days</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Estimate</p>
                <p className="text-3xl font-bold text-amber-700">${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Payment Schedule</h3>
            <div className="text-xs text-slate-600 space-y-1">
              <p>50% Deposit required before Job Production Starts</p>
              <p>40% Payment required upon Completion of Cabinet Production</p>
              <p>Final 10% due at Completion of Installation</p>
            </div>
          </div>

          {bid.notes && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">Notes</h3>
              <p className="text-sm text-amber-900">{bid.notes}</p>
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
            This estimate is valid for 30 days from the date issued. Prices subject to change based on final measurements and specifications.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}