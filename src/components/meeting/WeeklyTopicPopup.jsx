import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Sparkles, X, Link2, Upload, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function WeeklyTopicPopup({ topic, selectedDate, onClose, onArchive, onSaveNotes, isSaving }) {
  const [notesDraft, setNotesDraft] = useState(topic.notes || "");
  const [saved, setSaved] = useState(false);

  let dailySlices = [];
  try { dailySlices = JSON.parse(topic.daily_slices || "[]"); } catch (e) {}
  const todayDayName = format(selectedDate, "EEEE");

  const handleSave = () => {
    onSaveNotes(topic.id, notesDraft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="flex-1 flex flex-col max-h-screen overflow-hidden bg-white">

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {topic.auto_generated
                ? <span className="flex items-center gap-1 text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-full"><Sparkles className="w-3 h-3" /> AI Generated</span>
                : <span className="flex items-center gap-1 text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-full"><BookOpen className="w-3 h-3" /> Topic</span>
              }
              <span className="text-emerald-200 text-xs">Week of {format(new Date(topic.week_start + "T12:00:00"), "MMM d, yyyy")}</span>
            </div>
            <h2 className="text-white font-bold text-2xl leading-tight">{topic.label}</h2>
            {topic.presented_at && (
              <p className="text-emerald-200 text-xs mt-1">
                Added {format(new Date(topic.presented_at), "EEE MMM d")}
                {topic.presented_by && ` · ${topic.presented_by}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onArchive}
              className="flex items-center gap-1.5 text-xs text-white/70 hover:text-red-300 bg-white/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Archive
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

            {/* Daily Slices */}
            {dailySlices.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">📅 Daily Focus</h3>
                <div className="grid gap-3">
                  {dailySlices.map((s, i) => {
                    const isToday = s.day === todayDayName;
                    return (
                      <div
                        key={i}
                        className={`rounded-2xl px-5 py-4 border-2 transition-all ${
                          isToday
                            ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400 shadow-md"
                            : "bg-white border-slate-200 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${isToday ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                            {s.day}
                          </span>
                          {isToday && <span className="text-xs text-emerald-600 font-semibold">← Today</span>}
                        </div>
                        <p className={`font-bold text-base mb-1.5 ${isToday ? "text-emerald-900" : "text-slate-800"}`}>{s.title}</p>
                        <p className={`text-sm leading-relaxed ${isToday ? "text-emerald-800" : "text-slate-600"}`}>{s.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes section */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">📝 Meeting Notes</h3>
              <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden focus-within:border-emerald-400 transition-all">
                <Textarea
                  placeholder="Add discussion notes, key takeaways, action items from this topic…"
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  className="border-0 shadow-none focus-visible:ring-0 text-base leading-relaxed min-h-[240px] resize-none p-5 bg-transparent"
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-slate-400">Notes are saved per topic and visible in the Admin panel.</p>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`transition-all ${saved ? "bg-emerald-500 hover:bg-emerald-500" : "bg-emerald-600 hover:bg-emerald-700"}`}
                >
                  {saved ? "✓ Saved!" : isSaving ? "Saving…" : "Save Notes"}
                </Button>
              </div>
            </div>

            {/* External link */}
            {topic.url && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">🔗 Resource</h3>
                <a
                  href={topic.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white rounded-2xl border-2 border-slate-200 px-5 py-4 hover:border-emerald-400 hover:shadow-md transition-all shadow-sm group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                    {topic.item_type === "file" ? <Upload className="w-5 h-5 text-emerald-600" /> : <Link2 className="w-5 h-5 text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{topic.label}</p>
                    <p className="text-emerald-600 text-xs truncate">{topic.url}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
                </a>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Week of <span className="font-semibold text-slate-700">{format(new Date(topic.week_start + "T12:00:00"), "MMMM d, yyyy")}</span>
          </p>
          <Button onClick={onClose} variant="outline" className="gap-2">
            <X className="w-4 h-4" /> Close
          </Button>
        </div>

      </div>
    </div>
  );
}