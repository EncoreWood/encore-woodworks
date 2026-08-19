import { getEffectiveInvoices, calcCollected } from "@/components/invoicing/CustomInvoicesEditor";

// Client-facing financial summary. Mirrors the internal admin Financials
// (PaymentLog) calculation exactly: Current Total = base + change orders,
// Amount Paid = sum of received invoices, Balance Due = Current Total - Paid.
export default function ClientFinancials({ project }) {
  const estimated = project.estimated_budget || 0;
  const baseTotal = project.base_amount || project.total_amount || estimated;
  const changeOrdersTotal = (project.change_orders || []).reduce(
    (s, co) => s + (parseFloat(co.amount) || 0), 0
  );
  const currentTotal = baseTotal + changeOrdersTotal;
  const collected = calcCollected(getEffectiveInvoices(project));
  const remaining = currentTotal - collected;

  const money = (n) => `$${Number(n || 0).toLocaleString()}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
        <span className="text-sm text-slate-600">Project Total</span>
        <span className="font-bold text-blue-800">{money(currentTotal)}</span>
      </div>
      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
        <span className="text-sm text-emerald-700">Amount Paid</span>
        <span className="font-bold text-emerald-700">{money(collected)}</span>
      </div>
      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
        <span className="text-sm text-amber-700">Balance Due</span>
        <span className="font-bold text-amber-700">{money(remaining)}</span>
      </div>
    </div>
  );
}