import { Button } from "@/components/ui/button";
import { ExternalLink, RotateCcw } from "lucide-react";

export default function GustoPanel() {
  const gustoUrl = "https://app.gusto.com/";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-800">Gusto</span>
          <span className="text-xs text-slate-500 hidden lg:inline">Payroll · sign in inside this panel</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Reload Gusto"
            onClick={() => document.getElementById("gusto-frame").src = gustoUrl}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Open Gusto in a new tab"
            onClick={() => window.open(gustoUrl, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <iframe
        id="gusto-frame"
        src={gustoUrl}
        title="Gusto payroll"
        className="w-full flex-1 min-h-[600px] bg-white"
        allow="clipboard-read; clipboard-write"
      />
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
        If this panel stays blank, Gusto blocks being embedded — use the new-tab button on the right.
      </div>
    </div>
  );
}