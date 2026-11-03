import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionCard from "@/components/meeting/SectionCard";
import { denverDateStr } from "@/lib/stagePoints";

// Well dones from the last 7 production days that haven't been announced yet.
const WINDOW_DAYS = 7;

export default function WellDoneWidget() {
  const queryClient = useQueryClient();
  const cutoff = denverDateStr(new Date(Date.now() - (WINDOW_DAYS - 1) * 86400000));

  const { data: compliments = [], isLoading } = useQuery({
    queryKey: ["wellDone", cutoff],
    queryFn: async () => {
      const page = await base44.entities.Compliment.filter(
        { is_announced: { $ne: true }, date: { $gte: cutoff } },
        { sort: "-date", limit: 100 }
      );
      return page.items || [];
    },
    staleTime: 30_000,
  });

  // Announced is stored on the record, so a dismissal holds for every user and survives refresh.
  const announce = useMutation({
    mutationFn: async (ids) => {
      const announced_at = new Date().toISOString();
      await base44.entities.Compliment.bulkUpdate(
        ids.map(id => ({ id, is_announced: true, announced_at }))
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wellDone"] }),
    onError: (error) => console.error("Failed to mark well done announced:", error),
  });

  const pendingIds = announce.isPending ? (announce.variables || []) : [];
  const count = compliments.length;

  return (
    <SectionCard
      title="Well Done! 🎉"
      icon={Sparkles}
      color="amber"
      count={count}
      defaultOpen
      headerAction={count > 0 ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => announce.mutate(compliments.map(c => c.id))}
          disabled={announce.isPending}
          className="h-8 text-xs bg-white/80 border-amber-300 text-amber-800 hover:bg-white"
        >
          {announce.isPending && pendingIds.length > 1
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Check className="w-3.5 h-3.5" />}
          Mark all announced
        </Button>
      ) : null}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> <span className="text-sm">Loading well dones…</span>
        </div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-5 text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> <span className="text-sm font-medium">All caught up — no new well dones</span>
          </div>
          <span className="text-xs text-slate-400">Give one from the Production board and it shows up here.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            {count} unannounced from the last {WINDOW_DAYS} days
          </p>
          {compliments.map(c => {
            const busy = pendingIds.includes(c.id);
            return (
              <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{c.from}</span>
                    <span className="text-xs text-slate-400">→</span>
                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{c.to}</span>
                    <span className="text-xs text-slate-400 ml-auto">{c.date}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">"{c.message}"</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => announce.mutate([c.id])}
                  disabled={busy}
                  title="Mark as announced"
                  className="h-8 px-2 text-xs text-amber-800 hover:bg-amber-100 flex-shrink-0"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Announced
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}