import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, FolderOpen, Folder, ChevronRight, ArrowRight, Package, Search, X } from "lucide-react";
import ProductionCard from "./ProductionCard";

// A single room folder within a project
function RoomFolder({ project, roomName, items, onAddCard, onSendToProduction, sharedCardProps, autoOpen, onAutoOpened }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      onAutoOpened?.();
    }
  }, [autoOpen]);
  const [selected, setSelected] = useState(new Set());

  const roomItems = items.filter(i => i.project_id === project.id && i.room_name === roomName && !i.is_job_info && !i.stage);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === roomItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(roomItems.map(i => i.id)));
    }
  };

  const handleBulkSend = () => {
    const toSend = roomItems.filter(i => selected.has(i.id));
    onSendToProduction(toSend);
    setSelected(new Set());
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
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 flex-shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle className="text-lg">
                  <span className="text-slate-500 font-normal">{project.project_name} /</span> {roomName}
                </DialogTitle>
                <p className="text-sm text-slate-400 mt-0.5">{roomItems.length} item{roomItems.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 gap-2"
                    onClick={handleBulkSend}
                  >
                    <ArrowRight className="w-4 h-4" />
                    Send {selected.size} to Production
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 gap-2"
                  onClick={() => onAddCard(project, roomName)}
                >
                  <Plus className="w-4 h-4" /> Add Card
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Select all */}
          {roomItems.length > 0 && (
            <div className="flex items-center gap-2 px-1 pt-1 pb-2 border-b border-slate-100">
              <Checkbox
                checked={selected.size === roomItems.length && roomItems.length > 0}
                onCheckedChange={toggleAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm text-slate-500 cursor-pointer select-none">
                Select all
              </label>
              {selected.size > 0 && (
                <span className="ml-2 text-xs text-slate-400">{selected.size} selected</span>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {roomItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Package className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No items in this room yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => onAddCard(project, roomName)}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add first card
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1 pt-3">
                {roomItems.map(item => (
                  <div key={item.id} className="relative">
                    {/* Selection checkbox overlay */}
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="bg-white shadow"
                      />
                    </div>
                    {/* Send individually */}
                    <div className="absolute top-2 right-2 z-10">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs bg-white hover:bg-green-50 hover:border-green-400 hover:text-green-700"
                        onClick={() => onSendToProduction([item])}
                        title="Send to Production"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                    <div
                      className={`rounded-lg transition-all ${selected.has(item.id) ? "ring-2 ring-amber-400" : ""}`}
                      onClick={() => toggleSelect(item.id)}
                    >
                      <ProductionCard
                        item={item}
                        isDragging={false}
                        {...sharedCardProps}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Main tab component
export default function JobPacketsTab({ projects, items, openFolderContext, onFolderOpened, onAddCard, onSendToProduction, sharedCardProps }) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Package className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No active projects found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {projects.map(project => {
        const rooms = project.rooms?.map(r => r.room_name).filter(Boolean) || [];
        const projectItems = items.filter(i => i.project_id === project.id && !i.is_job_info && !i.stage);

        return (
          <div key={project.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
  );
}