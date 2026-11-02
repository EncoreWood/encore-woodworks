import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Loader2, Inbox, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import InventoryForm from "@/components/inventory/InventoryForm";

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

/**
 * Inventory for one shop area. Reads and writes the real Inventory board items
 * filtered by their location (the area), so the two always stay in sync.
 */
export default function InventorySection({ area, section }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
        <Icon className="w-4 h-4 text-amber-700 flex-shrink-0" />
        <h2 className="text-sm font-bold text-slate-900 flex-1 min-w-0 truncate">{section.label}</h2>
        {!isLoading && items.length > 0 && (
          <span className="text-[11px] font-semibold text-slate-500">{items.length}</span>
        )}
        <Button onClick={openNew} size="sm" className="h-7 px-2 bg-amber-600 hover:bg-amber-700 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-7 px-4 text-center">
          <Inbox className="w-6 h-6 text-slate-300 mb-1.5" />
          <p className="text-xs text-slate-400">No inventory in {area}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
          {items.map((item) => {
            const status = item.status || "in_stock";
            const low =
              item.min_quantity != null && item.quantity != null && item.quantity <= item.min_quantity;
            return (
              <li key={item.id} className="px-3 py-2 hover:bg-slate-50 transition-colors group">
                <div className="flex items-start gap-2">
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
                      <span className={`font-medium ${low ? "text-red-600" : "text-slate-700"}`}>
                        {item.quantity ?? 0}
                        {item.unit ? ` ${item.unit}` : ""}
                        {item.min_quantity != null ? ` · min ${item.min_quantity}` : ""}
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
              </li>
            );
          })}
        </ul>
      )}

      <InventoryForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        editingItem={editing}
        defaultLocation={area}
        onSave={(values) => saveMutation.mutate(values)}
      />
    </section>
  );
}