import React, { useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Mail, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BidClientView({ open, onClose, bid, bidType }) {
  const printRef = useRef();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  if (!bid) return null;

  const rooms = bid.rooms || [];

  const getItemSubtotal = (item, roomItems) => {
    if (item.measure_type === "percentage") {
      const appliesTo = item.upgrade_applies_to || ["base", "upper", "tall"];
      const base = (roomItems || [])
        .filter(i => i.measure_type !== "percentage" && appliesTo.includes(i.cabinet_category))
        .reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
      return base * ((parseFloat(item.percentage) || 0) / 100);
    }
    return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  };

  const grandTotal = rooms.reduce((s, room) =>
    s + (room.items || []).reduce((rs, item) => rs + getItemSubtotal(item, room.items), 0), 0
  );

  const handleSendEmail = async () => {
    if (!emailTo) return;
    setSendingEmail(true);
    const content = printRef.current.innerHTML;
    const emailBody = `
      <html><head><style>
        body { font-family: Georgia, serif; color: #1e1e1e; background: white; padding: 40px; max-width: 800px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 8px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        th { background: #f8fafc; font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; }
      </style></head><body>${content}</body></html>
    `;
    await base44.integrations.Core.SendEmail({
      to: emailTo,
      subject: `Cabinet Estimate — ${bid.project_name || "Your Project"}`,
      body: emailBody,
    });
    setSendingEmail(false);
    setEmailSent(true);
    setShowEmailInput(false);
    setTimeout(() => setEmailSent(false), 3000);
  };

  const handlePrint = () => {
    // Reuse the EXACT on-screen preview markup (printRef) — no separate print
    // template. To make the preview's Tailwind utility classes render identically
    // in the print window, inject the app's own compiled stylesheet (read from
    // the live document's styleSheets) instead of a hand-rolled substitute.
    const content = printRef.current.innerHTML;
    const appCss = Array.from(document.styleSheets).map(sheet => {
      try { return Array.from(sheet.cssRules).map(r => r.cssText).join("\n"); }
      catch (e) { return ""; } // cross-origin sheets are unreadable; skip them
    }).join("\n");

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8" />
      <title>${(bid.project_name || "Bid")} - Cabinet Estimate</title>
      <style>
        ${appCss}
        /* Force background colors/graphics to render when printing */
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @page { margin: 0.5in; }
        /* Keep room headers with their items, avoid splitting rows */
        .room { page-break-inside: avoid; }
        .room-header { page-break-after: avoid; }
        thead { display: table-header-group; }
        tr, img { page-break-inside: avoid; }
        img { max-width: 100%; height: auto; }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    // Give the logo image a moment to load before opening the print dialog.
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 flex-wrap gap-2">
          <span className="font-semibold text-slate-800">Client Bid Preview</span>
          <div className="flex gap-2 items-center flex-wrap">
            {showEmailInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="client@email.com"
                  className="h-9 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 w-52"
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && handleSendEmail()}
                />
                <Button onClick={handleSendEmail} disabled={sendingEmail || !emailTo} className="bg-blue-600 hover:bg-blue-700 h-9">
                  {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Mail className="w-4 h-4 mr-1" />}
                  Send
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEmailInput(false)} className="h-9">Cancel</Button>
              </div>
            ) : (
              <Button onClick={() => setShowEmailInput(true)} variant="outline" className="h-9 border-blue-300 text-blue-700 hover:bg-blue-50">
                {emailSent ? <><Mail className="w-4 h-4 mr-1" /> Sent!</> : <><Mail className="w-4 h-4 mr-1.5" /> Send via Email</>}
              </Button>
            )}
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
          <div className="text-center border-b-2 border-amber-800 pb-6 mb-7 relative">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" alt="Encore Woodworks" className="absolute left-0 top-0 h-16 w-auto" />
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
            const roomTotal = (room.items || []).reduce((s, i) => s + getItemSubtotal(i, room.items), 0);
            const regularItems = (room.items || []).filter(i => i.measure_type !== "percentage" && ((parseFloat(i.quantity) || 0) > 0 || i.name));
            const upgradeItems = (room.items || []).filter(i => i.measure_type === "percentage");
            const displayItems = regularItems;

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
                        <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Qty</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayItems.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-3 text-slate-400 text-xs italic">No items</td></tr>
                      ) : displayItems.map(item => {
                        const isPercent = item.measure_type === "percentage";
                        const sub = getItemSubtotal(item, room.items);
                        return (
                          <tr key={item.id} className={isPercent ? "bg-green-50/60" : "hover:bg-slate-50/50"}>
                            <td className="px-4 py-2.5 font-medium text-slate-800">
                              {item.name || "—"}
                              {isPercent && (
                                <span className="ml-2 text-xs text-green-600 font-normal">({item.percentage || 0}% upgrade)</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center text-slate-700 font-medium">
                              {isPercent ? "—" : (
                                <>
                                  {parseFloat(item.quantity) || 0}
                                  <span className="text-slate-400 text-xs ml-1">{item.measure_type === "lf" ? "LF" : item.measure_type === "sqft" ? "SF" : "ea"}</span>
                                </>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                              ${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Upgrades Section */}
                  {upgradeItems.length > 0 && (
                    <div className="mt-2 border border-green-200 rounded-lg overflow-hidden">
                      <div className="bg-green-700 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wide">
                        Upgrades
                      </div>
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-green-100">
                          {upgradeItems.map(item => {
                            const sub = getItemSubtotal(item, room.items);
                            return (
                              <tr key={item.id} className="bg-green-50/60">
                                <td className="px-4 py-2.5 font-medium text-slate-800">
                                  {item.name || "—"}
                                </td>
                                <td className="px-4 py-2.5 text-center text-green-600 text-xs">
                                  {item.percentage || 0}%
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                                  ${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
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

          {/* Disclaimer */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-2">Important Disclaimer</h3>
            <p className="text-xs text-blue-900 leading-relaxed">
              This estimate is based on house plans and is intended as a preliminary budget reference only. For a more accurate and detailed bid, a design drawing fee will be collected prior to producing detailed drawings. <strong>This fee is non-refundable</strong>, except in the event that you accept the final bid — at which point the full drawing fee will be applied toward your project cost.
            </p>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
            This estimate is valid for 30 days from the date issued. Prices subject to change based on final measurements and specifications.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}