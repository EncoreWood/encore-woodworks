import React, { useState } from "react";
import RoomRow from "./RoomRow";
import RoomUpgradeRow, { QuickAddUpgradeRow } from "./RoomUpgradeRow";
import RoomSelectionsPanel from "./RoomSelectionsPanel";

/**
 * A room together with everything that belongs to it: its nested upgrades and
 * its expandable selections panel. Rendered as table rows so upgrades and
 * selections travel with the room through reorder, duplicate and delete.
 */
export default function RoomBlock({
  room, index, total, mainFields, upgrades = [], onEditMain,
  onChange, onMove, onDuplicate, onDelete,
  onAddUpgrade, onChangeOption, onMoveOption, onDuplicateOption, onDeleteOption,
  onSetUseMain, onSelectionChange,
}) {
  const [selectionsOpen, setSelectionsOpen] = useState(false);
  const [addingUpgrade, setAddingUpgrade] = useState(false);

  return (
    <>
      <RoomRow
        room={room}
        index={index}
        total={total}
        mainFields={mainFields}
        upgradeCount={upgrades.length}
        selectionsOpen={selectionsOpen}
        onChange={onChange}
        onMove={onMove}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onAddUpgrade={() => setAddingUpgrade(true)}
        onToggleSelections={() => setSelectionsOpen((open) => !open)}
      />

      {upgrades.map((option, upgradeIndex) => (
        <RoomUpgradeRow
          key={option.id}
          option={option}
          index={upgradeIndex}
          total={upgrades.length}
          onChange={onChangeOption}
          onMove={(id, delta) => onMoveOption(id, delta, room.id)}
          onDuplicate={onDuplicateOption}
          onDelete={onDeleteOption}
        />
      ))}

      {addingUpgrade && (
        <QuickAddUpgradeRow
          onAdd={(payload) => onAddUpgrade(room.id, payload)}
          onDone={() => setAddingUpgrade(false)}
        />
      )}

      {selectionsOpen && (
        <tr className="bg-amber-50/40 border-b border-slate-200">
          <td className="w-8" />
          <td colSpan={5} className="p-0 border-l-2 border-amber-300">
            <RoomSelectionsPanel
              room={room}
              mainFields={mainFields}
              onSetUseMain={(useMain) => onSetUseMain(room.id, useMain)}
              onChange={(patch) => onSelectionChange(room.id, patch)}
              onEditMain={onEditMain}
            />
          </td>
        </tr>
      )}
    </>
  );
}