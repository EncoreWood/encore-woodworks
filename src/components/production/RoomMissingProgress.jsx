import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// MissingItem statuses grouped into the three progress buckets
const OPEN_STATUSES = ["Open", "Ordered", "Received"];
const IN_PRODUCTION_STATUSES = ["In Production", "Ready"];
const COMPLETE_STATUSES = ["Completed", "Resolved"];

export default function RoomMissingProgress({ projectId, roomName }) {
  const { data: reports = [] } = useQuery({
    queryKey: ["missingItems", projectId],
    queryFn: () => base44.entities.MissingItem.filter({ project_id: projectId }),
    staleTime: 30_000,
  });

  const roomReports = reports.filter(
    (r) => !r.archived && r.room_name === roomName
  );
  if (roomReports.length === 0) return null;

  const counts = { open: 0, inProduction: 0, complete: 0 };
  roomReports.forEach((r) => {
    if (COMPLETE_STATUSES.includes(r.status)) counts.complete++;
    else if (IN_PRODUCTION_STATUSES.includes(r.status)) counts.inProduction++;
    else counts.open++;
  });

  const total = roomReports.length;
  const pct = (n) => Math.round((n / total) * 100);

  const title = `Missing items — ${pct(counts.open)}% open (${counts.open}), ${pct(counts.inProduction)}% in production (${counts.inProduction}), ${pct(counts.complete)}% complete (${counts.complete})`;

  return (
    <span
      className="inline-flex items-center gap-1 flex-shrink-0"
      title={title}
    >
      <span className="flex h-1.5 w-14 rounded-full overflow-hidden bg-slate-200">
        {counts.open > 0 && (
          <span className="bg-red-400" style={{ width: `${pct(counts.open)}%` }} />
        )}
        {counts.inProduction > 0 && (
          <span className="bg-amber-400" style={{ width: `${pct(counts.inProduction)}%` }} />
        )}
        {counts.complete > 0 && (
          <span className="bg-green-500" style={{ width: `${pct(counts.complete)}%` }} />
        )}
      </span>
      <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
        {counts.complete}/{total} done
      </span>
    </span>
  );
}