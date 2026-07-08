import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowDownCircle, ArrowUpCircle, Edit3, Delete, Check, Package, ScanLine } from "lucide-react";
import QRScanner from "@/components/inventory/QRScanner";

function recalcStatus(quantity, min_quantity) {
  if (quantity <= 0) return "reorder";
  if (min_quantity && quantity < min_quantity) return "low_stock";
  return "in_stock";
}

function NumberPad({ value, setValue }) {
  const keys = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map(k => (
        <button
          key={k}
          onClick={() => {
            if (k === "⌫") setValue(value.slice(0, -1));
            else if (k === ".") { if (!value.includes(".")) setValue(value + "."); }
            else setValue(value + k);
          }}
          className="h-14 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-xl font-bold text-slate-800 touch-manipulation select-none"
        >
          {k === "⌫" ? <Delete className="w-5 h-5 mx-auto" /> : k}
        </button>
      ))}
    </div>
  );
}

export default function InventoryScan() {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [action, setAction] = useState(null); // "Check In" | "Check Out" | null
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get("item");

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        if (itemId) {
          const data = await base44.entities.Inventory.get(itemId);
          setItem(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [itemId]);

  const loadItemById = async (id) => {
    setLoading(true);
    try {
      const data = await base44.entities.Inventory.get(id);
      setItem(data);
    } catch (err) {
      console.error(err);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleScanResult = (rawValue) => {
    setShowScanner(false);
    // Extract item ID from scanned URL (format: .../InventoryScan?item=ID)
    try {
      const url = new URL(rawValue);
      const id = url.searchParams.get("item");
      if (id) {
        loadItemById(id);
      } else {
        // Not a valid scan URL, just close scanner
      }
    } catch {
      // rawValue isn't a URL — could be a raw ID
      if (rawValue && rawValue.length > 5) {
        loadItemById(rawValue);
      }
    }
  };

  const handleSubmit = async () => {
    const quantity = parseFloat(qty);
    if (!quantity || quantity <= 0 || !item || !action || !user) return;
    setSubmitting(true);
    try {
      const newQty = action === "Check In"
      ? item.quantity + quantity
      : action === "Check Out"
        ? Math.max(0, item.quantity - quantity)
        : quantity;
      const newStatus = recalcStatus(newQty, item.min_quantity);

      await base44.entities.InventoryLog.create({
        item_id: item.id,
        item_name: item.name,
        action,
        quantity,
        performed_by: user.full_name || user.email,
        performed_at: new Date().toISOString(),
        notes: notes || undefined,
      });

      await base44.entities.Inventory.update(item.id, {
        quantity: newQty,
        status: newStatus,
      });

      setItem({ ...item, quantity: newQty, status: newStatus });
      setSuccess({ action, quantity, newQty });
      setAction(null);
      setQty("");
      setNotes("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Package className="w-10 h-10 text-slate-300 animate-pulse" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6 text-center">
        <Package className="w-12 h-12 text-slate-300 mb-3" />
        <p className="font-semibold text-slate-700">Item not found</p>
        <p className="text-sm text-slate-500 mt-1">No inventory item was found for this QR code.</p>
      </div>
    );
  }

  const statusStyles = {
    in_stock: "bg-green-100 text-green-800",
    low_stock: "bg-orange-100 text-orange-800",
    reorder: "bg-red-100 text-red-800",
    discontinued: "bg-gray-100 text-gray-800",
  };
  const statusLabel = {
    in_stock: "Full Stock",
    low_stock: "Low Stock",
    reorder: "Reorder",
    discontinued: "Discontinued",
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Item Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
              {item.category && <p className="text-sm text-slate-500 capitalize mt-1">{item.category}</p>}
            </div>
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="text-center">
                <p className="text-4xl font-bold text-slate-900">{item.quantity}</p>
                <p className="text-xs text-slate-500">{item.unit || "units"}</p>
              </div>
            </div>
            <div className="flex justify-center">
              <span className={`text-sm font-semibold px-4 py-1.5 rounded-full ${statusStyles[item.status] || statusStyles.in_stock}`}>
                {statusLabel[item.status] || item.status}
              </span>
            </div>
            {item.location && <p className="text-center text-sm text-slate-500 mt-3">📍 {item.location}</p>}
          </CardContent>
        </Card>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-3">
            <div>
              <Check className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-green-800">
                {success.action} of {success.quantity} {item.unit || "units"} recorded
              </p>
              <p className="text-xs text-green-600 mt-0.5">New stock: {success.newQty} {item.unit || ""}</p>
            </div>
            <button
              onClick={() => { setSuccess(null); setAction(null); setQty(""); setNotes(""); setShowScanner(true); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow active:scale-95 transition-all touch-manipulation"
            >
              <ScanLine className="w-5 h-5" />
              Scan Another Item
            </button>
            <button onClick={() => setSuccess(null)} className="text-xs text-green-700 underline">Dismiss</button>
          </div>
        )}

        {/* Action Buttons */}
        {!action && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setAction("Check In"); setQty(""); }}
                className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg active:scale-95 transition-all touch-manipulation"
              >
                <ArrowDownCircle className="w-10 h-10" />
                Check In
              </button>
              <button
                onClick={() => { setAction("Check Out"); setQty(""); }}
                className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg shadow-lg active:scale-95 transition-all touch-manipulation"
              >
                <ArrowUpCircle className="w-10 h-10" />
                Check Out
              </button>
            </div>
            <button
              onClick={() => { setAction("Update Stock"); setQty(String(item.quantity ?? "")); }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-base shadow-lg active:scale-95 transition-all touch-manipulation"
            >
              <Edit3 className="w-6 h-6" />
              Update Current Stock
            </button>
          </div>
        )}

        {/* Action Modal */}
        <Dialog open={!!action} onOpenChange={(open) => { if (!open) { setAction(null); setQty(""); setNotes(""); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {action === "Check In" ? <ArrowDownCircle className="w-5 h-5 text-green-600" /> : action === "Check Out" ? <ArrowUpCircle className="w-5 h-5 text-red-600" /> : <Edit3 className="w-5 h-5 text-slate-600" />}
                {action}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {action === "Update Stock" ? `New stock level (${item.unit || "units"})` : `Quantity (${item.unit || "units"})`}
                </label>
                <Input value={qty} readOnly placeholder="0" className="mt-1 text-center text-2xl font-bold h-14" />
              </div>
              <NumberPad value={qty} setValue={setQty} />
              <div>
                <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." className="mt-1" />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!qty || parseFloat(qty) <= 0 || submitting}
                className={`w-full h-12 text-base font-bold gap-2 ${action === "Check In" ? "bg-green-600 hover:bg-green-700" : action === "Check Out" ? "bg-red-600 hover:bg-red-700" : "bg-slate-700 hover:bg-slate-800"}`}
              >
                {submitting ? "Saving..." : <>Confirm {action}</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {showScanner && (
        <QRScanner onScan={handleScanResult} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}