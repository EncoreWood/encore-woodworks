import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const ORDER_TYPES = [
  { id: "drawer_boxes", label: "Drawer Boxes" },
  { id: "fronts", label: "Fronts" },
  { id: "face_frame", label: "Face Frame" },
  { id: "panel_stock", label: "Panel Stock" },
  { id: "case", label: "Case" },
  { id: "internal_hardware", label: "Int. Hardware" },
  { id: "inserts", label: "Inserts" },
  { id: "external_hardware", label: "Ext. Hardware" },
  { id: "glass", label: "Glass" },
];

const STATUS_CONFIG = {
  not_ordered:    { label: "Not Ordered",   bg: "bg-slate-100",   text: "text-slate-500",  dot: "bg-slate-400" },
  ordered:        { label: "Ordered",       bg: "bg-blue-100",    text: "text-blue-700",   dot: "bg-blue-500" },
  in_production:  { label: "In Production", bg: "bg-yellow-100",  text: "text-yellow-700", dot: "bg-yellow-500" },
  received:       { label: "Received",      bg: "bg-green-100",   text: "text-green-700",  dot: "bg-green-500" },
  installed:      { label: "Installed",     bg: "bg-purple-100",  text: "text-purple-700", dot: "bg-purple-500" },
  not_applicable: { label: "N/A",           bg: "bg-gray-100",    text: "text-gray-400",   dot: "bg-gray-300" },
};

export default function ProjectOrdersPanel({ inProductionProjects }) {
  const { data: orders = [] } = useQuery({
    queryKey: ["projectOrders"],
    queryFn: () => base44.entities.ProjectOrder.list(),
  });

  if (inProductionProjects.length === 0) return null;

  const getOrder = (projectId, orderType) =>
    orders.find(o => o.project_id === projectId && o.order_type === orderType);

  return (
    <div className="mt-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Project Orders — In Production</h3>
        <p className="text-xs text-slate-400 mt-0.5">{inProductionProjects.length} active project{inProductionProjects.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-44">Project</th>
              {ORDER_TYPES.map(t => (
                <th key={t.id} className="text-center px-2 py-3 font-semibold text-slate-500 text-xs">{t.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inProductionProjects.map(project => (
              <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {project.card_color && (
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.card_color }} />
                    )}
                    <span className="font-semibold text-slate-800 truncate max-w-[130px]" title={project.project_name}>
                      {project.project_name}
                    </span>
                  </div>
                </td>
                {ORDER_TYPES.map(t => {
                  const order = getOrder(project.id, t.id);
                  const status = order?.status || "not_ordered";
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_ordered;
                  return (
                    <td key={t.id} className="px-2 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}