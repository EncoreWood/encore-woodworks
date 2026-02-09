import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendUp, className, onClick }) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden p-6 bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 tracking-wide uppercase">{title}</p>
          <p className="text-3xl font-semibold text-slate-900 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium mt-2",
              trendUp ? "text-emerald-600" : "text-amber-600"
            )}>
              <span>{trend}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-slate-50 rounded-xl">
            <Icon className="w-6 h-6 text-slate-600" />
          </div>
        )}
      </div>
    </Card>
  );
}