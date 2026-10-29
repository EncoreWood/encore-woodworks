import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import RoomNotesTasksPanel from "./RoomNotesTasksPanel";
import RoomImageGallery from "./RoomImageGallery";
import ProjectFilesList from "@/components/projects/ProjectFilesList";
import RoomSelectionsEditor from "./RoomSelectionsEditor";
import RoomImageAddButton from "./RoomImageAddButton";
import { Loader2, Images, Palette, Paperclip, FileText, ArrowLeft, ChevronDown, Check, ExternalLink } from "lucide-react";

function Section({ icon: Icon, title, count, action, children }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <Icon className="w-3 h-3" /> {title}
          {count !== undefined && count > 0 && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-1.5">{count}</span>
          )}
        </p>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Right pane of the Room Workspace — everything about the room itself:
 * notes + tasks, images (with annotation editing), saved selections and the
 * project's files. Same data sources as the production Room Info view.
 */
export default function RoomInfoPane({ project, roomName, onClose, onSelectRoom }) {
  const navigate = useNavigate();
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const { data: liveProject } = useQuery({
    queryKey: ["project", project?.id],
    queryFn: () => base44.entities.Project.get(project.id),
    enabled: !!project?.id,
    initialData: project,
  });
  const proj = liveProject || project || {};

  const { data: roomFiles = [], isLoading } = useQuery({
    queryKey: ["roomFiles", proj.id, roomName],
    queryFn: () => base44.entities.RoomFile.filter({ project_id: proj.id }),
    select: (all) => all.filter(f => f.room_name?.toLowerCase().trim() === (roomName || "").toLowerCase().trim()),
    enabled: !!proj.id && !!roomName,
  });

  const room = (proj.rooms || []).find(
    r => (r.room_name || "").toLowerCase().trim() === (roomName || "").toLowerCase().trim()
  ) || {};

  const images = roomFiles.filter(f => f.file_type === "image");
  const documents = roomFiles.filter(f => f.file_type === "pdf");

  // Every room of this project (plus the active one, in case it isn't in the list yet)
  const roomNames = [];
  (proj.rooms || []).forEach(r => {
    const name = (r.room_name || "").trim();
    if (name && !roomNames.includes(name)) roomNames.push(name);
  });
  if (roomName && !roomNames.includes(roomName)) roomNames.push(roomName);

  const openProjectCard = () => {
    onClose?.();
    navigate(`${createPageUrl("Kanban")}?project=${proj.id}`);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Pinned pane header — room switcher + project jump + Exit View */}
      <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <Popover open={roomPickerOpen} onOpenChange={setRoomPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="group flex items-center gap-1 -ml-1 px-1.5 py-1 min-h-[32px] rounded-lg hover:bg-slate-200/70 active:bg-slate-200 transition-colors max-w-full text-left"
                title="Switch room"
                aria-label="Switch room"
              >
                <span className="text-sm font-bold text-slate-800 leading-tight break-words">{roomName}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 flex-shrink-0" />
              </button>
            </PopoverTrigger>
            {/* z-index must clear the Room Workspace layer (z-100) or the list opens behind it */}
            <PopoverContent align="start" sideOffset={6} className="z-[130] w-64 p-1 max-h-72 overflow-y-auto">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Rooms in this project
              </p>
              {roomNames.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-slate-400">No rooms listed</p>
              ) : roomNames.map(name => {
                const active = name === roomName;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setRoomPickerOpen(false);
                      if (!active) onSelectRoom?.(name);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-xs ${
                      active ? "bg-amber-100 text-amber-900 font-semibold" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="flex-1 truncate">{name}</span>
                    {active && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
          <p className="text-[11px] text-slate-400 truncate pl-0.5">{proj.project_name}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={openProjectCard}
            className="flex items-center gap-1 h-8 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 text-xs font-semibold"
            title="View this project on the Projects board"
            aria-label="View Project"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Project
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 h-8 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold"
              title="Exit View"
              aria-label="Exit View"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4">
        <Section icon={Paperclip} title="Room Notes & Tasks">
          <RoomNotesTasksPanel project={proj} roomName={roomName} />
        </Section>

        <Section
          icon={Images}
          title="Images"
          count={images.length}
          action={
            <RoomImageAddButton
              projectId={proj.id}
              projectName={proj.project_name}
              roomName={roomName}
              roomId={room?.id || roomName}
            />
          }
        >
          {isLoading ? (
            <div className="py-4 flex items-center justify-center text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <p className="text-xs text-slate-400">No images for this room yet.</p>
          ) : (
            <RoomImageGallery projectId={proj.id} roomName={roomName} images={images} />
          )}
        </Section>

        {documents.length > 0 && (
          <Section icon={FileText} title="Documents" count={documents.length}>
            <div className="space-y-1">
              {documents.map(f => (
                <a
                  key={f.id}
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 px-2 py-1.5 text-xs text-slate-700"
                  title={f.file_name}
                >
                  <FileText className="w-3 h-3 flex-shrink-0 text-red-500" />
                  <span className="truncate">{f.label || f.file_name}</span>
                </a>
              ))}
            </div>
          </Section>
        )}

        <Section icon={Palette} title="Room Selections">
          <RoomSelectionsEditor
            project={proj}
            room={room}
            roomIndex={(proj.rooms || []).findIndex(
              r => (r.room_name || "").toLowerCase().trim() === (roomName || "").toLowerCase().trim()
            )}
          />
        </Section>

        <Section icon={Paperclip} title="Project Files">
          <ProjectFilesList files={proj.files || []} dark={false} />
        </Section>
      </div>
    </div>
  );
}