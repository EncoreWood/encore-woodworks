import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

/**
 * Order requests sent by employees from the shop areas.
 * Shows at the top of the inventory board until they are cleared.
 */
export default function InventoryRequestsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["inventoryRequests"],
    queryFn: async () => {
      const rows = await base44.entities.InventoryRequest.filter({ status: "pending" });
      return [...rows].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
    },
  });

  const clear = async (request, status) => {
    try {
      const user = await base44.auth.me();
      await base44.entities.InventoryRequest.update(request.id, {
        status,
        reviewed_by: user?.full_name || user?.email || "",
        reviewed_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["inventoryRequests"] });
      toast({
        title: status === "ordered" ? "Marked as ordered" : "Request cleared",
        description: request.item_name,
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't update the request", description: err.message });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="py-4 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) return null;

  return (
    <Card className="border-red-200 bg-red-50/70 shadow-sm">
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-red-600" />
          <h2 className="font-semibold text-sm text-red-900">
            Order requests from the shop
          </h2>
          <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 h-4">{requests.length}</Badge>
        </div>

        <ul className="divide-y divide-red-200/70">
          {requests.map((request) => (
            <li key={request.id} className="py-2 flex items-start gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 break-words">
                  {request.item_name}
                  <span className="ml-1.5 text-xs font-bold text-red-700">
                    {request.requested_quantity}
                    {request.unit ? ` ${request.unit}` : ""} to order
                  </span>
                </p>
                <p className="text-[11px] text-slate-600">
                  {request.location ? `${request.location} · ` : ""}
                  on hand {request.current_quantity ?? 0}
                  {request.item_sku ? ` · ${request.item_sku}` : ""}
                </p>
                {request.note && <p className="text-[11px] text-slate-700 italic mt-0.5">"{request.note}"</p>}
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {request.requested_by}
                  {request.created_date ? ` · ${format(new Date(request.created_date), "MMM d, h:mm a")}` : ""}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={() => clear(request, "ordered")}
                  className="h-7 px-2 text-xs gap-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-3 h-3" /> Ordered
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => clear(request, "dismissed")}
                  className="h-7 px-2 text-xs gap-1 bg-white"
                >
                  <X className="w-3 h-3" /> Clear
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}