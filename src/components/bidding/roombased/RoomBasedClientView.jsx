import React, { Fragment, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, X, Mail, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { computeRoomBasedTotals, groupOptionsByRoom, money, signedMoney } from "./roomBasedTotals";
import { effectiveFinish, mainFieldsFromBid, roomSelectionLines, roomNotes } from "./roomSelections";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png";

const JOB_FIELDS = [
  { label: "Job Name", key: "project_name" },
  { label: "Address", key: "address" },
  { label: "Cabinet Style", key: "cabinet_style" },
  { label: "Wood Species", key: "wood_species" },
  { label: "Door Style", key: "door_style" },
  { label: "Handles", key: "handles" },
  { label: "Drawerbox", key: "drawerbox" },
  { label: "Drawer Glides", key: "drawer_glides" },
  { label: "Hinges", key: "hinges" },
];

/**
 * Client-facing room-based proposal. Standard rooms come first with the
 * Standard Total, then a visually separated Options section where each upgrade
 * or optional room can be toggled — the running total updates live.
 */
export default function RoomBasedClientView({ open, onClose, bid, onSelectionSaved }) {
  const printRef = useRef();
  const [rooms, setRooms] = useState([]);
  const [options, setOptions] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  useEffect(() => {
    setRooms((bid?.proposal_rooms || []).map((room) => ({
      ...room,
      selected: room.selected ?? !!room.default_selected,
    })));
    setOptions((bid?.proposal_options || []).map((option) => ({
      ...option,
      selected: option.selected ?? !!option.default_selected,
    })));
  }, [bid?.id]);

  if (!bid) return null;

  const totals = computeRoomBasedTotals({ rooms, options });
  const mainFields = mainFieldsFromBid(bid);
  const { byRoom: upgradesByRoom, loose: looseOptions } = groupOptionsByRoom(options);
  const hasOptions = looseOptions.length > 0 || totals.optionalRooms.length > 0;
  const standardUpgradeCount = totals.standardRooms
    .reduce((count, room) => count + (upgradesByRoom[room.id] || []).length, 0);
  const dateLabel = bid.created_date
    ? new Date(bid.created_date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const persist = (nextRooms, nextOptions) => {
    setRooms(nextRooms);
    setOptions(nextOptions);
    onSelectionSaved?.({ proposal_rooms: nextRooms, proposal_options: nextOptions });
  };

  const toggleOption = (id) => {
    const next = options.map((option) => option.id === id ? { ...option, selected: !option.selected } : option);
    persist(rooms, next);
  };

  const toggleOptionalRoom = (id) => {
    const next = rooms.map((room) => room.id === id ? { ...room, selected: !room.selected } : room);
    persist(next, options);
  };

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const appCss = Array.from(document.styleSheets).map((sheet) => {
      try { return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n"); }
      catch (e) { return ""; }
    }).join("\n");

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8" />
      <title>${(bid.project_name || "Proposal")} - Proposal</title>
      <style>
        ${appCss}
        html, body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @page { margin: 0.5in; }
        thead { display: table-header-group; }
        tr, img { page-break-inside: avoid; }
        img { max-width: 100%; height: auto; }
        .options-section { page-break-inside: avoid; }
        .signature-block { page-break-inside: avoid; }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleSendEmail = async () => {
    if (!emailTo) return;
    setSendingEmail(true);
    const content = printRef.current.innerHTML;
    await base44.integrations.Core.SendEmail({
      to: emailTo,
      subject: `Proposal — ${bid.project_name || "Your Project"}`,
      body: `<html><head><style>
        body { font-family: Georgia, serif; color: #1e1e1e; background: white; padding: 40px; max-width: 800px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        th { background: #f8fafc; font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; }
      </style></head><body>${content}</body></html>`,
    });
    setSendingEmail(false);
    setShowEmailInput(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 flex-wrap gap-2">
          <span className="font-semibold text-slate-800">Client Proposal Preview</span>
          <div className="flex gap-2 items-center flex-wrap">
            {showEmailInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="client@email.com"
                  className="h-9 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 w-52"
                  autoFocus
                />
                <Button onClick={handleSendEmail} disabled={sendingEmail || !emailTo} className="bg-blue-600 hover:bg-blue-700 h-9">
                  {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Mail className="w-4 h-4 mr-1" />} Send
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowEmailInput(true)} variant="outline" className="h-9 border-blue-300 text-blue-700 hover:bg-blue-50">
                <Mail className="w-4 h-4 mr-1.5" /> Send via Email
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

        <div className="p-6 bg-white" ref={printRef}>
          {/* Header */}
          <div className="text-center border-b-2 border-amber-800 pb-5 mb-6">
            <img src={LOGO} alt="Encore Woodworks" className="h-20 mx-auto mb-3" />
            <div className="text-xs text-slate-600 leading-relaxed">
              736 S 5725 W Hurricane, Utah 84737<br />
              (435) 632-2903 — Mitch &nbsp;·&nbsp; (435) 632-2292 — Ben<br />
              Team@encorewood.com
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mt-4 tracking-wide">Proposal</h1>
            <p className="text-xs text-slate-500 mt-1">This proposal is valid for 30 days</p>
            <p className="text-sm font-medium text-slate-700 mt-2">Date: {dateLabel}</p>
          </div>

          {/* Job fields */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 mb-6">
            {JOB_FIELDS.map((field) => (
              <div key={field.key} className="flex items-baseline gap-2 border-b border-slate-100 pb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{field.label}:</span>
                <span className="text-sm text-slate-900 font-medium truncate">{bid[field.key] || "—"}</span>
              </div>
            ))}
          </div>

          {/* Standard table */}
          <table className="w-full border-collapse text-sm mb-8">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide">Room Name</th>
                <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide">Finish</th>
                <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide">Items of Recognition</th>
                <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wide">Price</th>
              </tr>
            </thead>
            <tbody>
              {totals.standardRooms.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400 italic">No rooms added yet</td></tr>
              ) : totals.standardRooms.map((room) => {
                const roomUpgrades = upgradesByRoom[room.id] || [];
                const selectionLines = roomSelectionLines(room, mainFields);
                const notes = roomNotes(room);
                return (
                  <Fragment key={room.id}>
                    <tr className="border-b border-slate-200 align-top">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-slate-900">{room.room_name || "—"}</p>
                        {selectionLines.map((line) => (
                          <p key={line.key} className="text-[11px] text-slate-500 leading-snug">{line.label}: {line.value}</p>
                        ))}
                        {notes && <p className="text-[11px] text-slate-400 italic leading-snug mt-0.5">{notes}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{effectiveFinish(room, mainFields) || "—"}</td>
                      <td className="px-3 py-2.5 text-slate-600">{room.items_of_recognition || "—"}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{money(room.price)}</td>
                    </tr>
                    {roomUpgrades.map((option) => (
                      <tr
                        key={option.id}
                        className={`border-b border-slate-100 ${option.selected ? "bg-green-50/70" : "bg-slate-50/80"}`}
                      >
                        <td colSpan={3} className="px-3 py-1.5 pl-8 border-l-2 border-amber-300">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <Checkbox checked={!!option.selected} onCheckedChange={() => toggleOption(option.id)} className="mt-0.5" />
                            <span className="min-w-0">
                              <span className="text-sm text-slate-800">↳ {option.title || "Option"}</span>
                              {option.description && (
                                <span className="block text-[11px] text-slate-500 leading-relaxed">{option.description}</span>
                              )}
                            </span>
                          </label>
                        </td>
                        <td className="px-3 py-1.5 text-right text-sm font-semibold text-green-700 whitespace-nowrap">
                          {(option.price_mode || "delta") === "delta" ? signedMoney(option.price) : money(option.price)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-amber-50 border-y-2 border-amber-800">
                <td colSpan={3} className="px-3 py-3 text-right font-bold text-slate-900 uppercase tracking-wide text-xs">Standard Total</td>
                <td className="px-3 py-3 text-right font-bold text-lg text-amber-800">{money(totals.standardTotal)}</td>
              </tr>
            </tfoot>
          </table>

          {standardUpgradeCount > 0 && (
            <p className="text-[11px] text-slate-500 -mt-5 mb-6">
              Upgrades shown beneath a room are optional and not included in the Standard Total.
            </p>
          )}

          {/* Options */}
          {hasOptions && (
            <div className="options-section mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Options</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Everything below is optional and not included in the Standard Total. Check what you would like to add.
              </p>

              <div className="space-y-2">
                {totals.optionalRooms.map((room) => {
                  const roomUpgrades = upgradesByRoom[room.id] || [];
                  const finish = effectiveFinish(room, mainFields);
                  return (
                    <div
                      key={room.id}
                      className={`rounded-lg border transition-colors ${room.selected ? "border-green-400 bg-green-50/70" : "border-slate-200 bg-white"}`}
                    >
                      <label className="flex items-start gap-3 p-3 cursor-pointer">
                        <Checkbox checked={!!room.selected} onCheckedChange={() => toggleOptionalRoom(room.id)} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{room.room_name || "Optional room"}</p>
                          {room.items_of_recognition && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{room.items_of_recognition}</p>}
                          <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">
                            Optional room{finish ? ` · ${finish}` : ""}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-green-700 whitespace-nowrap">{money(room.price)}</span>
                      </label>

                      {roomUpgrades.length > 0 && (
                        <div className="pl-8 pr-3 pb-2 space-y-1">
                          {roomUpgrades.map((option) => (
                            <label
                              key={option.id}
                              className={`flex items-start gap-2 p-2 rounded-md border-l-2 border-green-300 cursor-pointer ${option.selected ? "bg-green-100/70" : "bg-slate-50/80"}`}
                            >
                              <Checkbox checked={!!option.selected} onCheckedChange={() => toggleOption(option.id)} className="mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-800">↳ {option.title || "Option"}</p>
                                {option.description && <p className="text-[11px] text-slate-500 leading-relaxed">{option.description}</p>}
                              </div>
                              <span className="text-sm font-semibold text-green-700 whitespace-nowrap">
                                {(option.price_mode || "delta") === "delta" ? signedMoney(option.price) : money(option.price)}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {looseOptions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Additional options</p>
                    {looseOptions.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${option.selected ? "border-green-400 bg-green-50/70" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
                        <Checkbox checked={!!option.selected} onCheckedChange={() => toggleOption(option.id)} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{option.title || "Option"}</p>
                          {option.description && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{option.description}</p>}
                        </div>
                        <span className="text-sm font-bold text-green-700 whitespace-nowrap">
                          {(option.price_mode || "delta") === "delta" ? signedMoney(option.price) : money(option.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="border-t-2 border-amber-800 pt-4 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Standard Total</span>
              <span className="font-semibold text-slate-800">{money(totals.standardTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Options selected</span>
              <span className="font-semibold text-green-700">{money(totals.optionsTotal)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-700">Projected Total</span>
              <span className="text-3xl font-bold text-amber-700">{money(totals.selectedTotal)}</span>
            </div>
            {totals.ceilingTotal > totals.selectedTotal && (
              <p className="text-right text-xs text-slate-500">
                If all options are selected: <span className="font-semibold text-slate-700">{money(totals.ceilingTotal)}</span>
              </p>
            )}
          </div>

          {/* Payment terms */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-1.5">Payment Schedule</h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {bid.notes || `50% Deposit required before Job Production Starts
40% Payment will be required upon Completion of cabinet Production
Final 10% Will be due at completion of Installation`}
            </p>
          </div>

          {/* Signature */}
          <div className="signature-block mt-8 grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-slate-400 h-10" />
              <p className="text-xs text-slate-500 mt-1">Client Signature</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10" />
              <p className="text-xs text-slate-500 mt-1">Date</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-6 text-center">
            Encore Woodworks · 736 S 5725 W Hurricane, Utah 84737 · (435) 632-2903
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}