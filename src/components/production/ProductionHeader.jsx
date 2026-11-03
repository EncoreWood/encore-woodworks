import { Plus, Sunset, PackageX, AlertTriangle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PacingHeaderSummary from "./pacing/PacingHeaderSummary";
import StageStrip from "./StageStrip";

// Compact header: title + subtitle (subtitle only on wide screens) on the left, and on
// the right the pacing chip, today's per-stage strip, action icons, then Add Item.
// Below lg only the two most-used actions stay inline; the rest sit behind an overflow
// menu so the row never fights the pacing strip for space.
export default function ProductionHeader({
  points,
  series,
  loading,
  error,
  onOpenPacing,
  onEndOfDay,
  onReportMissing,
  onReportStruggle,
  onWellDone,
  onMistake,
  onAddItem,
}) {
  const actions = [
    { key: "missing", label: "Report Missing", icon: PackageX, onClick: onReportMissing, className: "border-orange-300 text-orange-600 hover:bg-orange-50" },
    { key: "end_of_day", label: "End of Day", icon: Sunset, onClick: onEndOfDay, className: "border-amber-300 text-amber-700 hover:bg-amber-50" },
    { key: "struggle", label: "Report Struggle", icon: AlertTriangle, onClick: onReportStruggle, className: "border-red-300 text-red-600 hover:bg-red-50" },
    { key: "well_done", label: "Well Done", emoji: "🎉", onClick: onWellDone, className: "border-amber-300 text-amber-600 hover:bg-amber-50" },
    { key: "mistake", label: "Report Mistake", icon: AlertTriangle, onClick: onMistake, className: "border-red-300 text-red-600 hover:bg-red-50" },
  ];
  const inlineActions = actions.slice(0, 2);
  const overflowActions = actions.slice(2);

  const renderAction = (action) => {
    const Icon = action.icon;
    return (
      <Button
        key={action.key}
        onClick={action.onClick}
        variant="outline"
        size="icon"
        title={action.label}
        aria-label={action.label}
        className={`h-8 w-8 flex-shrink-0 ${action.className}`}
      >
        {Icon ? <Icon className="w-4 h-4" /> : <span className="text-sm leading-none">{action.emoji}</span>}
      </Button>
    );
  };

  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 lg:text-2xl">Shop Production</h1>
        <p className="mt-0.5 hidden text-xs text-slate-500 xl:block">Track projects through production stages</p>
      </div>

      <div className="flex min-w-0 flex-shrink-0 items-center gap-1.5">
        <PacingHeaderSummary
          points={points}
          series={series}
          loading={loading}
          onOpen={onOpenPacing}
        />

        <StageStrip points={points} loading={loading} error={error} onOpen={onOpenPacing} />

        <div className="hidden items-center gap-1.5 lg:flex">
          {actions.map(renderAction)}
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          {inlineActions.map(renderAction)}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                title="More actions"
                aria-label="More actions"
                className="h-8 w-8 flex-shrink-0 border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {overflowActions.map(action => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem key={action.key} onClick={action.onClick} className="gap-2">
                    {Icon ? <Icon className="w-4 h-4" /> : <span className="text-sm leading-none">{action.emoji}</span>}
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Primary action: labelled on desktop, square icon-only below lg */}
        <Button
          onClick={onAddItem}
          size="sm"
          title="Add Item"
          aria-label="Add Item"
          className="h-8 w-8 flex-shrink-0 bg-amber-600 px-0 hover:bg-amber-700 lg:w-auto lg:px-2.5"
        >
          <Plus className="w-4 h-4 lg:mr-1" />
          <span className="hidden lg:inline">Add Item</span>
        </Button>
      </div>
    </div>
  );
}