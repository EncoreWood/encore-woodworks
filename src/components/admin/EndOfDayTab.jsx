import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, startOfMonth, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Sun, Smile, Meh, Frown, AlertCircle, CheckCircle2, XCircle, Calendar, User, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const RATING_CONFIG = {
  great:        { label: "Great",        icon: Sun,         color: "bg-green-100 text-green-800 border-green-200",     dot: "bg-green-500" },
  good:         { label: "Good",         icon: Smile,       color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-400" },
  fuck_alright: { label: "F*** Alright", icon: Meh,         color: "bg-teal-100 text-teal-800 border-teal-200",         dot: "bg-teal-500" },
  okay:         { label: "Okay",         icon: Meh,         color: "bg-yellow-100 text-yellow-800 border-yellow-200",   dot: "bg-yellow-400" },
  bad:          { label: "Bad",          icon: Frown,       color: "bg-orange-100 text-orange-800 border-orange-200",   dot: "bg-orange-500" },
  terrible:     { label: "Terrible",     icon: AlertCircle, color: "bg-red-100 text-red-800 border-red-200",             dot: "bg-red-600" },
};

const RATING_ORDER = ["great", "good", "fuck_alright", "okay", "bad", "terrible"];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", accent || "text-slate-900")}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function RatingBar({ label, count, total, config }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs text-slate-600 font-medium">{label}</span>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", config.dot)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{count}</span>
    </div>
  );
}

export default function EndOfDayTab() {
  const [filterUser, setFilterUser] = useState("all");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["endOfDayReviews"],
    queryFn: () => base44.entities.EndOfDayReview.list("-submitted_at"),
    staleTime: 30_000,
  });

  const users = [...new Set(reviews.map(r => r.submitted_by).filter(Boolean))];
  const filtered = filterUser === "all" ? reviews : reviews.filter(r => r.submitted_by === filterUser);

  // Stats
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const reviewsThisWeek = filtered.filter(r => r.date && new Date(r.date) >= weekStart);
  const reviewsThisMonth = filtered.filter(r => r.date && new Date(r.date) >= monthStart);
  const cleanDays = filtered.filter(r => r.area_clean).length;
  const cleanPct = filtered.length > 0 ? Math.round((cleanDays / filtered.length) * 100) : 0;

  const ratingCounts = RATING_ORDER.reduce((acc, r) => {
    acc[r] = filtered.filter(x => x.day_rating === r).length;
    return acc;
  }, {});

  const avgRatingScore = filtered.length > 0
    ? (filtered.reduce((sum, r) => {
        const idx = RATING_ORDER.indexOf(r.day_rating);
        return sum + (idx >= 0 ? (4 - idx) : 2); // great=4, good=3, okay=2, bad=1, terrible=0
      }, 0) / filtered.length).toFixed(1)
    : "—";

  if (isLoading) return <div className="flex items-center justify-center h-40 text-slate-400">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-slate-600">Filter by employee:</span>
        <div className="flex gap-2 flex-wrap">
          {["all", ...users].map(u => (
            <button
              key={u}
              onClick={() => setFilterUser(u)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                filterUser === u ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
              )}
            >
              {u === "all" ? "All Employees" : u}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Reviews" value={filtered.length} sub="All time" />
        <StatCard label="This Week" value={reviewsThisWeek.length} sub="Mon–Sun" />
        <StatCard label="This Month" value={reviewsThisMonth.length} />
        <StatCard label="Area Clean %" value={`${cleanPct}%`} sub={`${cleanDays} of ${filtered.length}`} accent={cleanPct >= 80 ? "text-green-600" : "text-orange-500"} />
      </div>

      {/* Rating Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Day Rating Distribution</h3>
          <span className="text-sm text-slate-500">Avg score: <strong className="text-slate-800">{avgRatingScore}/4</strong></span>
        </div>
        <div className="space-y-3">
          {RATING_ORDER.map(r => (
            <RatingBar key={r} label={RATING_CONFIG[r].label} count={ratingCounts[r]} total={filtered.length} config={RATING_CONFIG[r]} />
          ))}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">Review History</h3>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Sun className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No end of day reviews yet</p>
          </div>
        ) : (
          filtered.map(review => {
            const cfg = RATING_CONFIG[review.day_rating] || RATING_CONFIG.okay;
            const Icon = cfg.icon;
            const localTime = review.submitted_at
              ? format(new Date(review.submitted_at), "h:mm a")
              : "";
            return (
              <div key={review.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", cfg.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{review.submitted_by}</span>
                      <Badge className={cn("text-xs border", cfg.color)}>
                        <Icon className="w-3 h-3 mr-1" />{cfg.label}
                      </Badge>
                      {review.area_clean ? (
                        <Badge className="text-xs bg-green-100 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Clean
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-red-100 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3 mr-1" /> Not Clean
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{review.date}</span>
                      {localTime && <span>· {localTime}</span>}
                    </div>
                  </div>
                </div>
                {/* Body */}
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {review.last_cabinet && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1"><Wrench className="w-3 h-3" /> Ended On</p>
                      <p className="text-slate-700">{review.last_cabinet}</p>
                    </div>
                  )}
                  {review.reason && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Why</p>
                      <p className="text-slate-700">{review.reason}</p>
                    </div>
                  )}
                  {review.accomplishments && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Accomplished</p>
                      <p className="text-slate-700">{review.accomplishments}</p>
                    </div>
                  )}
                  {review.blockers && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Blockers</p>
                      <p className="text-slate-600">{review.blockers}</p>
                    </div>
                  )}
                  {review.tomorrow_plan && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Tomorrow</p>
                      <p className="text-slate-700">{review.tomorrow_plan}</p>
                    </div>
                  )}
                  {!review.area_clean && review.area_notes && (
                    <div>
                      <p className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-0.5">Cleanliness Notes</p>
                      <p className="text-orange-700">{review.area_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}