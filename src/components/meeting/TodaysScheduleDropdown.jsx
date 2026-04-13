import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function TodaysScheduleDropdown({ designMeetings, installs, deliveries }) {
  const total = designMeetings.length + installs.length + deliveries.length;
  const [open, setOpen] = useState(total > 0);

  return (
    <div className="border border-blue-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-sky-50 hover:brightness-95 transition-all"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <span className="font-bold text-blue-800 text-sm">Today's Schedule</span>
          {total > 0 && (
            <span className="text-xs font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">{total}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="bg-white px-4 py-3 space-y-3">
          {total === 0 && (
            <p className="text-slate-400 text-sm text-center py-2">Nothing on the calendar today.</p>
          )}

          {designMeetings.length > 0 && (
            <div>
              <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2">🎨 Design Meetings</p>
              <div className="space-y-1.5">
                {designMeetings.map(m => (
                  <div key={m.id} className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2.5">
                    <p className="font-semibold text-violet-800 text-sm">{m.client_name}</p>
                    {m.project_name && <p className="text-xs text-violet-600">{m.project_name}</p>}
                    {m.time && <p className="text-xs text-slate-500">🕐 {m.time}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {installs.length > 0 && (
            <div>
              <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2">🔨 Installs</p>
              <div className="space-y-1.5">
                {installs.map(a => (
                  <div key={a.id} className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
                    <p className="font-semibold text-orange-800 text-sm">{a.project_name}</p>
                    {a.client_name && <p className="text-xs text-orange-600">{a.client_name}</p>}
                    {a.address && <p className="text-xs text-slate-500">📍 {a.address}</p>}
                    {a.crew?.length > 0 && <p className="text-xs text-slate-500">👷 {a.crew.join(", ")}</p>}
                    {a.time && <p className="text-xs text-slate-500">🕐 {a.time}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {deliveries.length > 0 && (
            <div>
              <p className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-2">🚚 Deliveries</p>
              <div className="space-y-1.5">
                {deliveries.map(a => (
                  <div key={a.id} className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5">
                    <p className="font-semibold text-teal-800 text-sm">{a.project_name}</p>
                    {a.client_name && <p className="text-xs text-teal-600">{a.client_name}</p>}
                    {a.address && <p className="text-xs text-slate-500">📍 {a.address}</p>}
                    {a.driver && <p className="text-xs text-slate-500">🚚 {a.driver}</p>}
                    {a.time && <p className="text-xs text-slate-500">🕐 {a.time}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}