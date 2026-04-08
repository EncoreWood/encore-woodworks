import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import BillingCard from "@/components/billing/BillingCard";
import BillingItemDrawer from "@/components/billing/BillingItemDrawer";
import BillingCalendar from "@/components/billing/BillingCalendar";

function fmt(n) {
  if (!n) return "$0";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatCard({ label, value, red }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
      <div className={`text-2xl font-bold ${red ? "text-red-600" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function DebtBarChart({ items }) {
  if (!items.length) return null;
  const data = items.map(i => ({
    name: i.name.length > 18 ? i.name.slice(0, 16) + "…" : i.name,
    "Total Owed": i.total_owed || 0,
    "Original": i.original_amount || 0,
  }));
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
      <div className="text-sm font-semibold text-slate-700 mb-3">Payoff Progress Overview</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => "$" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
          <Tooltip formatter={v => "$" + Number(v).toLocaleString()} />
          <Legend />
          <Bar dataKey="Original" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Total Owed" fill="#b45309" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BillingTab({ items, category, onEdit, onAdd }) {
  const filtered = items.filter(i => i.category === category);
  const showChart = category === "Supplier Debt" || category === "Loan";
  return (
    <div className="space-y-3">
      <div className="flex justify-end mb-2">
        <Button onClick={onAdd} size="sm" className="bg-amber-700 hover:bg-amber-800 gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Item
        </Button>
      </div>
      {showChart && <DebtBarChart items={filtered} />}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No items yet. Add one above.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(item => (
            <BillingCard key={item.id} item={item} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BillingTracker() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [defaultCategory, setDefaultCategory] = useState("Monthly Bill");

  const { data: items = [] } = useQuery({
    queryKey: ["billing-items"],
    queryFn: () => base44.entities.BillingItem.list("-created_date"),
  });

  const totalMonthly = items.reduce((s, i) => s + (i.monthly_amount || 0), 0);
  const totalSupplierDebt = items.filter(i => i.category === "Supplier Debt").reduce((s, i) => s + (i.total_owed || 0), 0);
  const totalLoans = items.filter(i => i.category === "Loan").reduce((s, i) => s + (i.total_owed || 0), 0);
  const alertCount = items.filter(i => i.status === "Behind" || i.priority === "Critical").length;

  const handleEdit = (item) => {
    setEditingItem(item);
    setDefaultCategory(item.category);
    setDrawerOpen(true);
  };

  const handleAdd = (category) => {
    setEditingItem(null);
    setDefaultCategory(category);
    setDrawerOpen(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["billing-items"] });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: "#d1d5db" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing Tracker</h1>
          <p className="text-slate-600 text-sm mt-0.5">Track monthly bills, supplier debt, and loans</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Monthly Obligations" value={fmt(totalMonthly)} />
          <StatCard label="Total Supplier Debt" value={fmt(totalSupplierDebt)} />
          <StatCard label="Total Loans Remaining" value={fmt(totalLoans)} />
          <StatCard
            label="Behind / Critical Items"
            value={
              <span className="flex items-center gap-1">
                {alertCount > 0 && <AlertTriangle className="w-5 h-5" />}
                {alertCount}
              </span>
            }
            red={alertCount > 0}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <Tabs defaultValue="monthly">
            <TabsList className="mb-4">
              <TabsTrigger value="monthly">Monthly Bills</TabsTrigger>
              <TabsTrigger value="supplier">Supplier Debt</TabsTrigger>
              <TabsTrigger value="loans">Loans</TabsTrigger>
              <TabsTrigger value="calendar">📅 Calendar</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly">
              <BillingTab items={items} category="Monthly Bill" onEdit={handleEdit} onAdd={() => handleAdd("Monthly Bill")} />
            </TabsContent>

            <TabsContent value="supplier">
              <BillingTab items={items} category="Supplier Debt" onEdit={handleEdit} onAdd={() => handleAdd("Supplier Debt")} />
            </TabsContent>

            <TabsContent value="loans">
              <BillingTab items={items} category="Loan" onEdit={handleEdit} onAdd={() => handleAdd("Loan")} />
            </TabsContent>

            <TabsContent value="calendar">
              <BillingCalendar items={items} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BillingItemDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={editingItem}
        defaultCategory={defaultCategory}
        onSaved={handleSaved}
      />
    </div>
  );
}