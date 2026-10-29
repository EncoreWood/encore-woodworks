import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderOpen, Folder, ChevronRight, Package, Search, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProductionCard from "./ProductionCard";
import RoomWorkspace from "./room-workspace/RoomWorkspace";
import SendToProductionDialog from "./SendToProductionDialog";
import { roomPts } from "@/lib/roomPts";

// Job Packet group order: In Production → Ready → Installing → Production Prep → everything else
const STAGE_PRIORITY = ["in_production", "ready_for_install", "ready", "installing", "production_prep"];

// A single room folder within a project — clicking it opens the combined Room Workspace
function RoomFolder({ project, roomName, items, onAddCard, onSendToProduction, sharedCardProps, autoOpen, onAutoOpened }) {
  const [open, setOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState(null);

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      onAutoOpened?.();
    }
  }, [autoOpen]);

  const roomItems = items.filter(i => i.project_id === project.id && i.room_name === roomName && !i.is_job_info);

  const confirmSend = (stage) => {
    onSendToProduction(sendTarget, stage);
    setSendTarget(null);
    // Sending moves the user to the production board — drop the workspace with it
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 transition-all group shadow-sm"
      >
        <div className="text-amber-500 group-hover:text-amber-600">
          {open ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 truncate">{roomName}</p>
          <p className="text-xs text-slate-400">{roomItems.length} item{roomItems.length !== 1 ? "s" : ""}</p>
        </div>
        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 flex-shrink-0">
          {roomPts(roomItems)} PTS
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 flex-shrink-0" />
      </button>

      {open && (
        <RoomWorkspace
          project={project}
          roomName={roomName}
          items={items}
          currentUser={sharedCardProps?.currentUser}
          cardProps={sharedCardProps}
          onAddCard={() => onAddCard(project, roomName)}
          onSendToProduction={(list) => setSendTarget(list)}
          onClose={() => setOpen(false)}
        />
      )}

      <SendToProductionDialog
        open={!!sendTarget}
        items={sendTarget}
        onConfirm={confirmSend}
        onClose={() => setSendTarget(null)}
      />
    </>
  );
}

// Main tab component
export default function JobPacketsTab({ projects, items, openFolderContext, onFolderOpened, onAddCard, onSendToProduction, sharedCardProps, scrollToProjectId }) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!scrollToProjectId) return;
    const el = document.getElementById(`job-packets-project-${scrollToProjectId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-amber-400");
      setTimeout(() => el.classList.remove("ring-2", "ring-amber-400"), 2000);
    }
  }, [scrollToProjectId, projects]);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Package className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No active projects found.</p>
      </div>
    );
  }

  const q = search.trim().toLowerCase();

  // When searching, flatten to matching items across all projects
  const searchResults = q
    ? items.filter(i => {
        if (i.is_job_info || i.stage) return false;
        const proj = projects.find(p => p.id === i.project_id);
        if (!proj) return false;
        const contractor = proj.contractor?.name || "";
        return (
          (i.name || "").toLowerCase().includes(q) ||
          (i.project_name || "").toLowerCase().includes(q) ||
          (i.room_name || "").toLowerCase().includes(q) ||
          contractor.toLowerCase().includes(q)
        );
      })
    : null;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by job name, room, contractor, cabinet…"
          className="pl-9 pr-9 bg-white"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchResults !== null ? (
        searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Search className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No cards match "{search}"</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-400 mb-3">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-1">
                  <div className="text-xs text-slate-400 px-2 pt-1 pb-0.5 font-medium">{item.project_name} / {item.room_name}</div>
                  <ProductionCard item={item} isDragging={false} {...sharedCardProps} />
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
      <div className="space-y-8">
      {(() => {
        // Group order follows the project's production-board stage, then job name
        const stageRank = (p) => {
          const idx = STAGE_PRIORITY.indexOf((p.status || "").toLowerCase());
          return idx === -1 ? STAGE_PRIORITY.length : idx;
        };
        return [...projects].sort((a, b) =>
          stageRank(a) - stageRank(b) ||
          (a.project_name || "").localeCompare(b.project_name || "")
        );
      })().map(project => {
        const rooms = project.rooms?.map(r => r.room_name).filter(Boolean) || [];
        const projectItems = items.filter(i => i.project_id === project.id && !i.is_job_info && !i.stage);

        return (
          <div key={project.id} id={`job-packets-project-${project.id}`} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Project header */}
            <div
              className="px-5 py-4 flex items-center gap-3 border-b border-slate-100"
              style={project.card_color ? { borderLeftColor: project.card_color, borderLeftWidth: 4 } : {}}
            >
              {project.card_color && (
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.card_color }} />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">{project.project_name}</h2>
                <p className="text-xs text-slate-400">
                  {rooms.length} room{rooms.length !== 1 ? "s" : ""} · {projectItems.length} job packet{projectItems.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Link
                to={`${createPageUrl("ProjectDetails")}?id=${project.id}`}
                className="flex-shrink-0 text-slate-400 hover:text-amber-600 transition-colors p-1"
                title="Open project"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <Badge
                className="capitalize text-xs"
                variant="outline"
              >
                {project.status?.replace(/_/g, " ")}
              </Badge>
            </div>

            {/* Room folders grid */}
            <div className="p-5">
              {rooms.length === 0 ? (
                <p className="text-sm text-slate-400">No rooms defined for this project.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {rooms.map(roomName => {
                    const autoOpen = !!(openFolderContext && openFolderContext.projectId === project.id && openFolderContext.roomName === roomName);
                    return (
                      <RoomFolder
                        key={roomName}
                        project={project}
                        roomName={roomName}
                        items={items}
                        onAddCard={onAddCard}
                        onSendToProduction={onSendToProduction}
                        sharedCardProps={sharedCardProps}
                        autoOpen={autoOpen}
                        onAutoOpened={onFolderOpened}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
      )}
    </div>
  );
}