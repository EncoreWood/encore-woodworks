import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function to12(hour24) {
  const h = hour24 % 12 || 12;
  return h;
}
function getPeriod(hour24) {
  return hour24 >= 12 ? "PM" : "AM";
}

export default function TimePicker({ value, onChange }) {
  const [h24, m24] = (value || "").split(":").map(Number);
  const hasValue = !isNaN(h24) && !isNaN(m24);
  const hour12 = hasValue ? to12(h24) : null;
  const period = hasValue ? getPeriod(h24) : null;
  const minutes = hasValue ? m24 : null;

  const commit = (newHour, newMinute, newPeriod) => {
    // Fill in any part not picked yet so a fresh (empty) picker commits right away
    const hour = newHour ?? hour12 ?? 12;
    const minute = newMinute ?? minutes ?? 0;
    const per = newPeriod ?? period ?? "AM";
    const h24Out = per === "PM" ? (hour % 12) + 12 : hour % 12;
    onChange(`${String(h24Out).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  };

  return (
    <div className="flex gap-2">
      <Select value={hour12 != null ? String(hour12) : undefined} onValueChange={v => commit(Number(v), null, null)}>
        <SelectTrigger className="w-[5.5rem]"><SelectValue placeholder="Hr" /></SelectTrigger>
        <SelectContent className="max-h-60">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
            <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={minutes != null ? String(minutes) : undefined} onValueChange={v => commit(null, Number(v), null)}>
        <SelectTrigger className="w-[5.5rem]"><SelectValue placeholder="Min" /></SelectTrigger>
        <SelectContent className="max-h-60">
          {Array.from({ length: 60 }, (_, i) => i).map(m => (
            <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={period || undefined} onValueChange={v => commit(null, null, v)}>
        <SelectTrigger className="w-[5.5rem]"><SelectValue placeholder="AM/PM" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}