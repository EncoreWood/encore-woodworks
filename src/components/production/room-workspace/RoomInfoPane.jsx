import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RoomNotesTasksPanel from "./RoomNotesTasksPanel";
import RoomImageGallery from "./RoomImageGallery";
import RoomSelectionsPanel from "@/components/projects/RoomSelectionsPanel";
import ProjectFilesList from "@/components/projects/ProjectFilesList";
import { Loader2, Images, Palette, Paperclip, FileText } from "lucide-react";

function Section({ icon: Icon, title, count, children }) {
  return (
    <section>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
        <Icon className="w-3 h-3" /> {title}
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-1.5">{count}</span>
        )}
      </p>
      {children}
    </section>
  );
}

/**
 * Right pane of the Room Workspace — everything about the room itself:
 * notes + tasks, images (with annotation editing), saved selections and the
 * project's files. Same data sources as the production Room Info view.
 */
export default function RoomInfoPane({ project, roomName }) {
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

  return (
    <div className="h-full overflow-y-auto px-3 py-3 space-y-4">
      <div>
        <p className="text-sm font-bold text-slate-800 leading-tight">{roomName}</p>
        <p className="text-[11px] text-slate-400">{proj.project_name}</p>
      </div>

      <Section icon={Paperclip} title="Room Notes & Tasks">
        <RoomNotesTasksPanel project={proj} roomName={roomName} />
      </Section>

      <Section icon={Images} title="Images" count={images.length}>
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
        <RoomSelectionsPanel room={room} />
      </Section>

      <Section icon={Paperclip} title="Project Files">
        <ProjectFilesList files={proj.files || []} dark={false} />
      </Section>
    </div>
  );
}