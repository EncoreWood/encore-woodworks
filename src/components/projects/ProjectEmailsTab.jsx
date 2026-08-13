import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail, Paperclip, RefreshCw, Inbox } from "lucide-react";
import { format } from "date-fns";

function isHtml(text) {
  if (!text) return false;
  return /<\/?(html|body|div|p|span|table|br)\b/i.test(text);
}

export default function ProjectEmailsTab({ project }) {
  const projectId = project?.id;
  const projectName = project?.project_name;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["projectEmails", projectId],
    queryFn: () => base44.entities.ProjectEmail.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const sorted = [...emails].sort(
    (a, b) => new Date(b.date_received || 0) - new Date(a.date_received || 0)
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncProjectEmails", {
        project_id: projectId,
        project_name: projectName,
      });
      toast({
        title: "Emails Synced",
        description: res.data?.message || `Synced ${res.data?.synced ?? 0} email(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ["projectEmails", projectId] });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: err?.response?.data?.error || err?.message || "Unknown error",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Mail className="w-5 h-5 text-amber-500" /> Project Emails ({sorted.length})
        </h2>
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 gap-1.5"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? "Syncing..." : "Sync Emails"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
          <Inbox className="w-8 h-8 mb-2" />
          <p className="text-sm text-center max-w-sm">
            No emails synced yet. Click "Sync Emails" to pull in Gmail messages whose subject matches this project.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((email) => (
            <button
              key={email.id}
              onClick={() => setSelected(email)}
              className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {email.sender || email.sender_email || "Unknown sender"}
                    </span>
                    {email.has_attachments && (
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {email.subject || "(no subject)"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{email.body_snippet}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {email.sender_email}
                    {email.date_received
                      ? ` · ${format(new Date(email.date_received), "MMM d, yyyy h:mm a")}`
                      : ""}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-8">{selected.subject || "(no subject)"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-500">From: </span>
                  <span className="font-medium text-slate-800">
                    {selected.sender || "—"}
                    {selected.sender_email ? ` <${selected.sender_email}>` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Date: </span>
                  <span className="text-slate-800">
                    {selected.date_received
                      ? format(new Date(selected.date_received), "MMM d, yyyy h:mm a")
                      : "—"}
                  </span>
                </div>
                {selected.has_attachments && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Paperclip className="w-3.5 h-3.5" />
                    {(selected.attachment_urls || []).join(", ") || "Has attachments"}
                  </div>
                )}
              </div>
              <div>
                {isHtml(selected.body_full) ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selected.body_full }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-slate-700">
                    {selected.body_full || selected.body_snippet || "(no body)"}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}