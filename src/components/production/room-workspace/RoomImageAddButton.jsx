import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2 } from "lucide-react";

/**
 * Adds an image to a room from the Room Workspace right pane — uploads the
 * file and creates the RoomFile record the room galleries read from.
 */
export default function RoomImageAddButton({ projectId, projectName, roomName, roomId, label = "Add image" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !projectId || !roomName) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const ext = file.name.toLowerCase().split(".").pop();
      await base44.entities.RoomFile.create({
        project_id: projectId,
        project_name: projectName || "",
        room_name: roomName,
        room_id: roomId || "",
        file_url,
        file_name: file.name,
        file_type: ext === "pdf" ? "pdf" : "image",
      });
      await qc.invalidateQueries({ queryKey: ["roomFiles"] });
    } catch (err) {
      console.error("Failed to add room image:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50"
        title="Upload an image for this room"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        {label}
      </button>
    </>
  );
}