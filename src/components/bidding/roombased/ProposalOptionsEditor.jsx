import React from "react";
import { Card } from "@/components/ui/card";
import OptionRow, { QuickAddOptionRow } from "./OptionRow";
import { QuickAddRoomRow } from "./RoomRow";
import RoomBlock from "./RoomBlock";
import { groupOptionsByRoom, money } from "./roomBasedTotals";

/**
 * Options section. Optional rooms carry their own nested upgrades, so nothing
 * floats loose; only whole-job add-ons live in a flat list. Nothing here ever
 * counts toward the Standard Total.
 */
export default function ProposalOptionsEditor({
  options, optionalRooms, rooms, upgradesByRoom = {}, mainFields, onEditMain,
  onAddOption, onChangeOption, onMoveOption, onDuplicateOption, onDeleteOption,
  onAddRoom, onChangeRoom, onMoveRoom, onDuplicateRoom, onDeleteRoom,
  onAddUpgrade, onChangeUpgrade, onMoveUpgrade, onDuplicateUpgrade, onDeleteUpgrade,
  onSetUseMain, onSelectionChange,
}) {
  const { loose } = groupOptionsByRoom(options);
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

      {/* Optional rooms — upgrades nest under the room they belong to */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Optional rooms</p>
        <p className="text-[11px] text-slate-400">
          Upgrades on a standard room live under that room in the Standard Rooms table above.
        </p>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-8" />
                <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Room Name</th>
                <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Finish</th>
                <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items of Recognition</th>
                <th className="text-right px-2 py-2 w-40 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="w-48" />
              </tr>
            </thead>
            <tbody>
              {optionalRooms.map((room, index) => (
                <RoomBlock
                  key={room.id}
                  room={room}
                  index={index}
                  total={optionalRooms.length}
                  mainFields={mainFields}
                  upgrades={upgradesByRoom[room.id] || []}
                  onEditMain={onEditMain}
                  onChange={onChangeRoom}
                  onMove={onMoveRoom}
                  onDuplicate={onDuplicateRoom}
                  onDelete={onDeleteRoom}
                  onAddUpgrade={onAddUpgrade}
                  onChangeOption={onChangeUpgrade}
                  onMoveOption={onMoveUpgrade}
                  onDuplicateOption={onDuplicateUpgrade}
                  onDeleteOption={onDeleteUpgrade}
                  onSetUseMain={onSetUseMain}
                  onSelectionChange={onSelectionChange}
                />
              ))}
              <QuickAddRoomRow optional onAdd={(payload) => onAddRoom(payload, true)} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Whole-job add-ons that aren't tied to a room */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Whole-job options</p>
        {loose.length === 0 && (
          <p className="text-xs text-slate-400 italic">No whole-job options — add one below, or hit + on a room to add its upgrade.</p>
        )}
        {loose.map((option, index) => (
          <OptionRow
            key={option.id}
            option={option}
            index={index}
            total={loose.length}
            rooms={rooms}
            onChange={onChangeOption}
            onMove={(id, delta) => onMoveOption(id, delta, "")}
            onDuplicate={onDuplicateOption}
            onDelete={onDeleteOption}
          />
        ))}
        <QuickAddOptionRow onAdd={onAddOption} />
      </div>
    </Card>
  );
}