import React, { useState } from "react";
import { ChevronDown, ChevronRight, CalendarDays } from "lucide-react";
import { format, subDays } from "date-fns";

// Complete stage: cards moved today render as full cards at the top; cards from
// the previous 6 days are grouped into collapsible per-day folders; anything
// older than a week (7 days including today) no longer shows on the board —
// the cards still live in the project's room folder.
export default function CompleteStageCards({ items, isFocused, renderCard }) {
  const [openFolders, setOpenFolders] = useState({});

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const cutoffStr = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const todays = items.filter(i => i.completed_date === todayStr);
  const foldered = items
    .filter(i => i.completed_date && i.completed_date !== todayStr && i.completed_date >= cutoffStr)
    .sort((a, b) => (b.completed_date || "").localeCompare(a.completed_date || ""));
  const undated = items.filter(i => !i.completed_date);

  const folders = [];
  foldered.forEach(item => {
    const last = folders[folders.length - 1];
    if (last && last.date === item.completed_date) last.items.push(item);
    else folders.push({ date: item.completed_date, items: [item] });
  });
  if (undated.length > 0) folders.push({ date: null, items: undated });

  const labelFor = (dateStr) => {
    if (!dateStr) return "Earlier";
    const diffDays = Math.round((new Date(todayStr + "T12:00:00") - new Date(dateStr + "T12:00:00")) / 86400000);
    if (diffDays === 1) return "Yesterday";
    return format(new Date(dateStr + "T12:00:00"), "EEE, MMM d");
  };

  const FolderHeader = ({ label, count, open, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2"
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-300 rounded-full px-2.5 py-1 flex items-center gap-1.5 flex-shrink-0">
        <CalendarDays className="w-3 h-3" /> {label} ({count})
      </span>
      <div className="flex-1 h-px bg-slate-200" />
      {open
        ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
        : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
    </button>
  );

  return (
    <>
      {todays.map(item => (
        <div key={item.id} className={isFocused ? "relative" : undefined}>
          {renderCard(item)}
        </div>
      ))}
      {folders.map(folder => {
        const key = folder.date || "undated";
        const isOpen = !!openFolders[key];
        const header = (
          <FolderHeader
            label={labelFor(folder.date)}
            count={folder.items.length}
            open={isOpen}
            onClick={() => setOpenFolders(prev => ({ ...prev, [key]: !prev[key] }))}
          />
        );
        if (isFocused) {
          return (
            <React.Fragment key={key}>
              <div style={{ gridColumn: "1 / -1" }}>{header}</div>
              {isOpen && folder.items.map(item => (
                <div key={item.id} className="relative">{renderCard(item)}</div>
              ))}
            </React.Fragment>
          );
        }
        return (
          <div key={key} className="space-y-2">
            {header}
            {isOpen && (
              <div className="space-y-3 pl-2 border-l border-slate-200">
                {folder.items.map(item => <div key={item.id}>{renderCard(item)}</div>)}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}