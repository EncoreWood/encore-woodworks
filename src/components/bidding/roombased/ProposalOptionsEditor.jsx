import React from "react";
import { Card } from "@/components/ui/card";
import OptionRow, { QuickAddOptionRow } from "./OptionRow";
import RoomRow, { QuickAddRoomRow } from "./RoomRow";
import { money } from "./roomBasedTotals";

/** Options section: upgrades on a room, plus whole rooms that are optional. */
export default function ProposalOptionsEditor({
  options, optionalRooms, rooms,
  onAddOption, onChangeOption, onMoveOption, onDuplicateOption, onDeleteOption,
  onAddRoom, onChangeRoom, onMoveRoom, onDuplicateRoom, onDeleteRoom,
}) {
  const optionsValue = options.reduce((sum, option) => sum + (parseFloat(option.price) || 0), 0)
    + optionalRooms.reduce((sum, room) => sum + (parseFloat(room.price) || 0), 0);

  return (
    <Card className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900">Options &amp; Upgrades</p>
          <p className="text-xs text-slate-500">Nothing here counts toward the Standard Total</p>
        </div>
        <span className="text-sm font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
          {money(optionsValue)} if all selected
        </span>
      </div>

      {/* Room upgrades */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Room upgrades</p>
        {options.length === 0 && (
          <p className="text-xs text-slate-400 italic">No upgrades yet — add one below.</p>
        )}
        {options.map((option, index) => (
          <OptionRow
            key={option.id}
            option={option}
            index={index}
            total={options.length}
            rooms={rooms}
            onChange={onChangeOption}
            onMove={onMoveOption}
            onDuplicate={onDuplicateOption}
            onDelete={onDeleteOption}
          />
        ))}
        <QuickAddOptionRow onAdd={onAddOption} />
      </div>

      {/* Optional rooms */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Optional rooms</p>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
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
              {optionalRooms.map((room, index) => (
                <RoomRow
                  key={room.id}
                  room={room}
                  index={index}
                  total={optionalRooms.length}
                  onChange={onChangeRoom}
                  onMove={onMoveRoom}
                  onDuplicate={onDuplicateRoom}
                  onDelete={onDeleteRoom}
                />
              ))}
              <QuickAddRoomRow optional onAdd={(payload) => onAddRoom(payload, true)} />
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}