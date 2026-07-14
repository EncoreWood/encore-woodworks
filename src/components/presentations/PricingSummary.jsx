import { X } from "lucide-react";

export default function PricingSummary({ specs, editable, onUpdatePricingItem, onAddPricingItem, onRemovePricingItem, onDepositChange, onShowPricingChange }) {
  const total = specs.pricing_items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const deposit = total * (specs.deposit_percentage / 100);
  const balance = total - deposit;

  return (
    <div className="mt-5 max-w-sm w-full">
      <h3 className="text-[9px] font-semibold tracking-[0.2em] uppercase text-amber-700 mb-1.5">Pricing Summary</h3>
      <table className="w-full text-xs">
        <tbody>
          {specs.pricing_items.map((item, idx) => (
            <tr key={idx} className="group">
              <td className="py-0.5 pr-2">
                {editable ? (
                  <input
                    className="w-full border-none outline-none bg-transparent placeholder-slate-300 text-slate-700"
                    value={item.label}
                    onChange={e => onUpdatePricingItem(idx, "label", e.target.value)}
                    placeholder="Item"
                  />
                ) : (
                  <span className="text-slate-700">{item.label}</span>
                )}
              </td>
              <td className="py-0.5 text-right whitespace-nowrap">
                {editable ? (
                  <span className="inline-flex items-center">
                    <span className="text-slate-400">$</span>
                    <input
                      className="w-16 text-right border-none outline-none bg-transparent text-slate-700"
                      type="number"
                      value={item.amount}
                      onChange={e => onUpdatePricingItem(idx, "amount", Number(e.target.value) || 0)}
                    />
                    <button onClick={() => onRemovePricingItem(idx)} className="ml-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : (
                  <span className="text-slate-700">${(Number(item.amount) || 0).toLocaleString()}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-400 font-bold">
            <td className="pt-1.5 text-slate-900">TOTAL</td>
            <td className="pt-1.5 text-right text-slate-900">${total.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
      {editable && (
        <button onClick={onAddPricingItem} className="text-[10px] text-amber-600 hover:text-amber-700 mt-1">+ Add Line Item</button>
      )}

      <div className="mt-3 text-xs text-slate-600 space-y-0.5">
        <div className="flex justify-between items-center">
          <span>
            Deposit Due{" "}
            {editable ? (
              <>
                (
                <input
                  type="number"
                  className="w-8 text-center border-b border-slate-200 outline-none text-slate-600 inline-block"
                  value={specs.deposit_percentage}
                  onChange={e => onDepositChange(Number(e.target.value) || 0)}
                />
                %)
              </>
            ) : `(${specs.deposit_percentage}%)`}
            :
          </span>
          <span className="font-medium">${deposit.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Balance on Completion:</span>
          <span className="font-medium">${balance.toLocaleString()}</span>
        </div>
      </div>

      {editable && (
        <label className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
          <input
            type="checkbox"
            checked={specs.show_pricing}
            onChange={e => onShowPricingChange(e.target.checked)}
            className="w-3 h-3"
          />
          Show pricing to client
        </label>
      )}
    </div>
  );
}