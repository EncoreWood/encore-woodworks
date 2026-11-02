import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Loader2, Inbox, Package, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionSheet from "./SectionSheet";
import InventoryForm from "@/components/inventory/InventoryForm";
import QuantityStepper from "@/components/inventory/QuantityStepper";
import RequestOrderDialog from "./RequestOrderDialog";
import SectionTile from "./SectionTile";

const STATUS_LABEL = {
  in_stock: "Full Stock",
  low_stock: "Low Stock",
  needs_ordered: "Needs Ordered",
  discontinued: "Discontinued",
};

const STATUS_STYLE = {
  in_stock: "bg-green-50 text-green-700 border-green-200",
  low_stock: "bg-amber-50 text-amber-700 border-amber-200",
  needs_ordered: "bg-red-50 text-red-700 border-red-200",
  discontinued: "bg-slate-100 text-slate-500 border-slate-200",
};

function recalcStatus(quantity, min_quantity) {
  if ((quantity ?? 0) <= 0) return "needs_ordered";
  if (min_quantity && quantity < min_quantity) return "low_stock";
  return "in_stock";
}

/**
 * Inventory for one shop area. Reads and writes the real Inventory board items
 * filtered by their location (the area), so the two always stay in sync.
 * Employees can bump the count with −/+ or send an order request straight
 * from the row.
 */
export default function InventorySection({ area, section }) {
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [requesting, setRequesting] = useState(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory", "area", area],
    queryFn: async () => {
      const rows = await base44.entities.Inventory.filter({ location: area });
      return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing
        ? base44.entities.Inventory.update(editing.id, values)
        : base44.entities.Inventory.create({ ...values, location: area }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setFormOpen(false);
      setEditing(null);
    },
  });

  // Quick count correction straight from the row (typed or −/+).
  const adjustQuantity = (item, next) => {
    next = Math.max(next, 0);
    if (next === (item.quantity ?? 0)) return;
    queryClient.setQueryData(["inventory", "area", area], (prev = []) =>
      prev.map((row) => (row.id === item.id ? { ...row, quantity: next, status: recalcStatus(next, row.min_quantity) } : row))
    );
    base44.entities.Inventory.update(item.id, {
      quantity: next,
      status: recalcStatus(next, item.min_quantity),
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["inventory"] }))
      .catch((err) => {
        console.error("Quantity update failed:", err);
        queryClient.invalidateQueries({ queryKey: ["inventory", "area", area] });
      });
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setFormOpen(true);
  };

  const Icon = section.icon || Package;

  return (
    <>
      <SectionTile
        sectionKey={section.key}
        icon={Icon}
        label={section.label}
        count={items.length}
        loading={isLoading}
        onClick={() => setOpen(true)}
      />

      <SectionSheet
        open={open}
        onOpenChange={setOpen}
        icon={Icon}
        title={section.label}
        subtitle={`${area} · ${items.length} item${items.length === 1 ? "" : "s"}`}
        actions={
          <Button onClick={openNew} size="sm" className="h-9 px-3 bg-amber-600 hover:bg-amber-700 text-xs">
            <Plus className="w-4 h-4" /> Add
          </Button>
        }
      >
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Inbox className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs text-slate-400">No inventory in {area}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const status = item.status || "in_stock";
                  const low =
                    item.min_quantity != null && item.quantity != null && item.quantity <= item.min_quantity;
                  return (
                    <li key={item.id} className="px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-2">
                        {item.image_url ? (
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="flex-shrink-0"
                            title="View item"
                          >
                            <img
                              src={item.image_url}
                              alt={item.name || "Inventory item"}
                              className="w-10 h-10 rounded-md object-cover border border-slate-200 bg-slate-50"
                            />
                          </button>
                        ) : null}
                        <button type="button" onClick={() => openEdit(item)} className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold text-slate-900 break-words">{item.name}</p>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0 rounded border ${
                                STATUS_STYLE[status] || "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {STATUS_LABEL[status] || status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                            <span className={low ? "text-red-600 font-medium" : ""}>
                              {item.min_quantity != null ? `min ${item.min_quantity}` : ""}
                            </span>
                            {item.category && <span>{item.category}</span>}
                            {item.item_sku && <span className="font-mono">{item.item_sku}</span>}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50 flex-shrink-0"
                          title="Edit item"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quick count + request order */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <QuantityStepper
                          value={item.quantity ?? 0}
                          unit={item.unit}
                          low={low}
                          onChange={(next) => adjustQuantity(item, next)}
                        />
                        <button
                          type="button"
                          onClick={() => setRequesting(item)}
                          className="ml-auto flex items-center gap-1 h-7 px-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-[11px] font-semibold hover:bg-red-100 transition-colors touch-manipulation"
                          title="Send an order request to the office"
                        >
                          <BellRing className="w-3 h-3" /> Request Order
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
      </SectionSheet>

      <InventoryForm
        open={formOpen}
        onOpenChange={(isOpen) => {
          setFormOpen(isOpen);
          if (!isOpen) setEditing(null);
        }}
        editingItem={editing}
        defaultLocation={area}
        onSave={(values) => saveMutation.mutate(values)}
      />

      <RequestOrderDialog
        item={requesting}
        open={!!requesting}
        onOpenChange={(isOpen) => {
          if (!isOpen) setRequesting(null);
        }}
        onSubmitted={() => {
          queryClient.invalidateQueries({ queryKey: ["inventory"] });
          queryClient.invalidateQueries({ queryKey: ["inventoryRequests"] });
        }}
      />
    </>
  );
}