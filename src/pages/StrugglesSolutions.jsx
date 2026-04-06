import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, MessageSquare, CheckCircle2, Clock, Plus, Send, Archive, ArchiveRestore } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
};

export default function StrugglesSolutions() {
  const [viewing, setViewing] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const queryClient = useQueryClient();

  const { data: struggles = [], isLoading } = useQuery({
    queryKey: ["struggles"],
    queryFn: () => base44.entities.Struggle.list("-created_date"),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ struggle, text }) => {
      const newComment = {
        author: currentUser?.full_name || currentUser?.email || "Anonymous",
        text,
        timestamp: new Date().toISOString(),
      };
      const updatedComments = [...(struggle.comments || []), newComment];
      return base44.entities.Struggle.update(struggle.id, { comments: updatedComments });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["struggles"] });
      setViewing(updated);
      setCommentText("");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Struggle.update(id, { status }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["struggles"] });
      setViewing(updated);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }) => base44.entities.Struggle.update(id, { archived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["struggles"] });
      setViewing(null);
    },
  });

  const activeStruggles = struggles.filter(s => !s.archived);
  const archivedStruggles = struggles.filter(s => s.archived);
  const displayList = showArchived ? archivedStruggles : activeStruggles;
  const filtered = filterStatus === "all" ? displayList : displayList.filter(s => s.status === filterStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-red-500" /> Struggles &amp; Solutions
            </h1>
            <p className="text-slate-500 mt-1">Report struggles from production and collaborate on solutions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(v => !v)}
              className={showArchived ? "bg-slate-700 hover:bg-slate-800" : ""}
            >
              <Archive className="w-4 h-4 mr-1" />
              {showArchived ? `Archive (${archivedStruggles.length})` : `Show Archive`}
            </Button>
            {!showArchived && (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-slate-400 text-center py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-300" />
            <p className="text-lg font-medium">{showArchived ? "No archived struggles" : "No struggles reported"}</p>
            {!showArchived && <p className="text-sm">Use the ! button on any production card to report one</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {showArchived && <p className="text-xs text-slate-400 text-center">Showing {archivedStruggles.length} archived struggle{archivedStruggles.length !== 1 ? "s" : ""}. Click any to unarchive.</p>}
            {filtered.map((struggle) => (
              <div
                key={struggle.id}
                onClick={() => setViewing(struggle)}
                className={`bg-white rounded-xl border shadow-sm px-5 py-4 cursor-pointer hover:shadow-md transition-all ${showArchived ? "border-slate-200 opacity-75 hover:opacity-100" : "border-slate-200 hover:border-red-300"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`text-xs ${STATUS_COLORS[struggle.status] || STATUS_COLORS.open}`}>
                        {struggle.status?.replace("_", " ") || "open"}
                      </Badge>
                      {struggle.project_name && (
                        <span className="text-xs text-slate-400">{struggle.project_name}</span>
                      )}
                      {struggle.production_item_name && (
                        <span className="text-xs text-slate-500 font-medium">· {struggle.production_item_name}</span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800 truncate">{struggle.problem}</p>
                    {struggle.solution && (
                      <p className="text-sm text-green-700 mt-1 truncate">✅ {struggle.solution}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">
                      {struggle.created_date ? format(new Date(struggle.created_date), "MMM d, h:mm a") : ""}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{struggle.reported_by || "Unknown"}</p>
                    <div className="flex items-center gap-1 justify-end mt-1 text-slate-400">
                      <MessageSquare className="w-3 h-3" />
                      <span className="text-xs">{(struggle.comments || []).length}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Struggle Detail
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                <Badge className={`${STATUS_COLORS[viewing.status] || STATUS_COLORS.open}`}>
                  {viewing.status?.replace("_", " ") || "open"}
                </Badge>
                {viewing.reported_by && <span>by <strong>{viewing.reported_by}</strong></span>}
                {viewing.created_date && <span>· {format(new Date(viewing.created_date), "MMM d, yyyy h:mm a")}</span>}
                {viewing.project_name && <span>· {viewing.project_name}</span>}
                {viewing.production_item_name && <span>· {viewing.production_item_name}</span>}
              </div>

              {/* Problem */}
              <div>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Problem</p>
                <p className="text-slate-800 text-sm bg-red-50 rounded-lg p-3">{viewing.problem}</p>
              </div>

              {/* Solution */}
              {viewing.solution && (
                <div>
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Solution</p>
                  <p className="text-slate-800 text-sm bg-green-50 rounded-lg p-3">{viewing.solution}</p>
                </div>
              )}

              {/* Status change (admin) */}
              {currentUser?.role === "admin" && (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs text-slate-500 font-medium">Update status:</span>
                    {["open", "in_progress", "resolved"].map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatusMutation.mutate({ id: viewing.id, status: s })}
                        className={`text-xs px-2 py-1 rounded-full border transition-all ${viewing.status === s ? "bg-slate-800 text-white border-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archiveMutation.mutate({ id: viewing.id, archived: !viewing.archived })}
                    disabled={archiveMutation.isPending}
                    className={viewing.archived ? "text-green-700 border-green-300 hover:bg-green-50" : "text-slate-500 border-slate-300 hover:bg-slate-50"}
                  >
                    {viewing.archived ? <><ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Unarchive</> : <><Archive className="w-3.5 h-3.5 mr-1" /> Archive</>}
                  </Button>
                </div>
              )}

              {/* Comments */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Comments ({(viewing.comments || []).length})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(viewing.comments || []).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">No comments yet. Share your ideas!</p>
                  )}
                  {(viewing.comments || []).map((c, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-semibold text-slate-700">{c.author}</span>
                        <span className="text-xs text-slate-400">
                          · {c.timestamp ? format(new Date(c.timestamp), "MMM d, h:mm a") : ""}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Add comment */}
            <div className="flex gap-2 pt-3 border-t mt-2">
              <Input
                placeholder="Add your idea or comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && commentText.trim() && addCommentMutation.mutate({ struggle: viewing, text: commentText })}
                className="flex-1 text-sm"
              />
              <Button
                size="icon"
                onClick={() => addCommentMutation.mutate({ struggle: viewing, text: commentText })}
                disabled={!commentText.trim() || addCommentMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}