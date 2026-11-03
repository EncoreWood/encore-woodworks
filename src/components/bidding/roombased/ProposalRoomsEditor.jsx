import React from "react";
import { Card } from "@/components/ui/card";
import RoomRow, { QuickAddRoomRow } from "./RoomRow";
import { money } from "./roomBasedTotals";

/** The Standard table: one priced row per included room. */
export default function ProposalRoomsEditor({ rooms, onAdd, onChange, onMove, onDuplicate, onDelete }) {
  const total = rooms.reduce((sum, room) => sum + (parseFloat(room.price) || 0), 0);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 bg-slate-800 text-white flex items-center justify-between">
        <div>
          <p className="font-semibold">Standard Rooms</p>
          <p className="text-xs text-slate-300">One price per room — these make up the Standard Total</p>
        </div>
        <span className="font-bold text-amber-300">{money(total)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-8" />
              <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Room Name</th>
              <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Finish</th>
              <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items of Recognition</th>
              <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {rooms.map((room, index) => (
              <RoomRow
                key={room.id}
                room={room}
                index={index}
                total={rooms.length}
                onChange={onChange}
                onMove={onMove}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
            <QuickAddRoomRow onAdd={(payload) => onAdd(payload, false)} />
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-300">
              <td colSpan={4} className="px-3 py-2.5 text-right font-semibold text-slate-700">Standard Total</td>
              <td className="px-3 py-2.5 text-right font-bold text-slate-900">{money(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}