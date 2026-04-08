import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Link2, Upload, FileText, ChevronDown, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WeeklyTopicsTab() {
  const [showArchived, setShowArchived] = useState(false);
  const [collapsedWeeks, setCollapsedWeeks] = useState({});
  const queryClient = useQueryClient();

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["weeklyTopics"],
    queryFn: () => base44.entities.WeeklyTopic.list("-week_start", 200),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }) => base44.entities.WeeklyTopic.update(id, { archived }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weeklyTopics"] }),
  });

  const visibleTopics = showArchived ? topics : topics.filter(t => !t.archived);

  // Group by week_start
  const grouped = visibleTopics.reduce((acc, t) => {
    const key = t.week_start || "Unknown Week";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const sortedWeeks = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const toggleWeek = (weekKey) => setCollapsedWeeks(prev => ({ ...prev, [weekKey]: !prev[weekKey] }));

  if (isLoading) return <div className="text-center py-12 text-slate-400">Loading topics...</div>;

  const archivedCount = topics.filter(t => t.archived).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-bold text-slate-800">Weekly Topics Log</h2>
          <Badge className="bg-green-100 text-green-700 border-green-200">{topics.filter(t => !t.archived).length} active</Badge>
          {archivedCount > 0 && (
            <Badge className="bg-slate-100 text-slate-500 border-slate-200">{archivedCount} archived</Badge>
          )}
        </div>
        <button
          onClick={() => setShowArchived(s => !s)}
          className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
            showArchived ? "bg-slate-600 text-white border-slate-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
          )}
        >
          {showArchived ? "Hide Archived" : "Show Archived"}
        </button>
      </div>

      {sortedWeeks.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No weekly topics recorded yet.</p>
          <p className="text-sm mt-1">Topics added in Morning Meeting will appear here.</p>
        </div>
      ) : (
        sortedWeeks.map(weekStart => {
          const weekTopics = grouped[weekStart];
          const isCollapsed = collapsedWeeks[weekStart];
          let weekLabel = weekStart;
          try { weekLabel = "Week of " + format(parseISO(weekStart), "MMMM d, yyyy"); } catch {}
          const activeCount = weekTopics.filter(t => !t.archived).length;
          const archivedCount = weekTopics.filter(t => t.archived).length;

          return (
            <div key={weekStart} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleWeek(weekStart)}
                className="w-full px-5 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between hover:bg-green-100 transition-colors"
              >
                <span className="font-bold text-green-800">{weekLabel}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-green-700 border-green-300">{activeCount} topic{activeCount !== 1 ? "s" : ""}</Badge>
                  {archivedCount > 0 && (
                    <Badge className="text-xs bg-slate-100 text-slate-500 border-slate-200">{archivedCount} archived</Badge>
                  )}
                  <ChevronDown className={cn("w-4 h-4 text-green-600 transition-transform", !isCollapsed && "rotate-180")} />
                </div>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-slate-100">
                  {weekTopics.map(topic => (
                    <div key={topic.id} className={cn("px-5 py-4", topic.archived && "opacity-60 bg-slate-50")}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {topic.item_type === "file"
                            ? <Upload className="w-4 h-4 text-green-600" />
                            : topic.url
                              ? <Link2 className="w-4 h-4 text-green-600" />
                              : <FileText className="w-4 h-4 text-green-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800">{topic.label}</p>
                            {topic.archived && <Badge className="text-xs bg-slate-100 text-slate-500 border border-slate-200">Archived</Badge>}
                            {topic.url && (
                              <a href={topic.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline truncate max-w-[200px]">
                                {topic.url}
                              </a>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                            {topic.presented_by && <span>👤 {topic.presented_by}</span>}
                            {topic.presented_at && (
                              <span>🕐 {format(new Date(topic.presented_at), "EEE, MMM d 'at' h:mm a")}</span>
                            )}
                          </div>
                          {topic.notes && (
                            <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{topic.notes}</p>
                            </div>
                          )}
                        </div>
                        <Button
                          size="icon" variant="ghost"
                          onClick={() => archiveMutation.mutate({ id: topic.id, archived: !topic.archived })}
                          title={topic.archived ? "Unarchive" : "Archive"}
                          className="h-7 w-7 text-slate-400 hover:text-amber-600 flex-shrink-0"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}