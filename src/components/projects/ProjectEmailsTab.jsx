import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2, Mail, Paperclip, RefreshCw, Inbox, FileText, Image as ImageIcon,
  File, Download, Eye, X
} from "lucide-react";
import { format } from "date-fns";

function isHtml(text) {
  if (!text) return false;
  return /<\/?(html|body|div|p|span|table|br)\b/i.test(text);
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentIcon(mimeType) {
  const m = (mimeType || "").toLowerCase();
  if (m === "application/pdf") return <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />;
  if (m.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />;
  return <File className="w-5 h-5 text-slate-500 flex-shrink-0" />;
}

export default function ProjectEmailsTab({ project }) {
  const projectId = project?.id;
  const projectName = project?.project_name;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loadingAtt, setLoadingAtt] = useState(null); // `${attachmentId}:view` | `${attachmentId}:download`
  const [viewer, setViewer] = useState(null); // { dataUrl, mimeType, filename }

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

  const fetchAttachment = async (att) => {
    const res = await base44.functions.invoke("getEmailAttachment", {
      messageId: att.messageId,
      attachmentId: att.attachmentId,
      filename: att.filename,
      mimeType: att.mimeType,
    });
    return res.data;
  };

  const triggerDownload = (dataUrl, filename) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleView = async (att) => {
    if (!att.attachmentId || !att.messageId) {
      toast({ variant: "destructive", title: "Unavailable", description: "This attachment can't be fetched (missing IDs)." });
      return;
    }
    setLoadingAtt(`${att.attachmentId}:view`);
    try {
      const data = await fetchAttachment(att);
      const m = (data.mimeType || "").toLowerCase();
      if (m === "application/pdf" || m.startsWith("image/")) {
        setViewer({ dataUrl: data.dataUrl, mimeType: data.mimeType, filename: data.filename });
      } else {
        triggerDownload(data.dataUrl, data.filename);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "View failed",
        description: err?.response?.data?.error || err?.message || "Unknown error",
      });
    } finally {
      setLoadingAtt(null);
    }
  };

  const handleDownload = async (att) => {
    if (!att.attachmentId || !att.messageId) {
      toast({ variant: "destructive", title: "Unavailable", description: "This attachment can't be fetched (missing IDs)." });
      return;
    }
    setLoadingAtt(`${att.attachmentId}:download`);
    try {
      const data = await fetchAttachment(att);
      triggerDownload(data.dataUrl, data.filename);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: err?.response?.data?.error || err?.message || "Unknown error",
      });
    } finally {
      setLoadingAtt(null);
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

              {/* Attachments */}
              {(() => {
                const rawAtts = selected.attachment_urls || [];
                const atts = rawAtts.map(a => (typeof a === "string" ? { filename: a } : a));
                if (!selected.has_attachments || atts.length === 0) return null;
                return (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" /> Attachments ({atts.length})
                    </p>
                    <div className="space-y-2">
                      {atts.map((att, i) => {
                        const canFetch = !!att.attachmentId && !!att.messageId;
                        const viewLoading = loadingAtt === `${att.attachmentId}:view`;
                        const dlLoading = loadingAtt === `${att.attachmentId}:download`;
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50"
                          >
                            {attachmentIcon(att.mimeType)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{att.filename}</p>
                              {att.size ? (
                                <p className="text-xs text-slate-400">{formatSize(att.size)}</p>
                              ) : null}
                            </div>
                            {canFetch && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() => handleView(att)}
                                  disabled={viewLoading || dlLoading}
                                >
                                  {viewLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() => handleDownload(att)}
                                  disabled={viewLoading || dlLoading}
                                >
                                  {dlLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                  Download
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Attachment lightbox viewer (images + PDFs) */}
      {viewer && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewer(null)}
        >
          <div className="relative max-w-4xl max-h-full w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-sm truncate">{viewer.filename}</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1"
                  onClick={() => triggerDownload(viewer.dataUrl, viewer.filename)}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
                <button
                  className="bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70"
                  onClick={() => setViewer(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {viewer.mimeType === "application/pdf" ? (
              <object
                data={viewer.dataUrl}
                type="application/pdf"
                className="w-full bg-white rounded-lg"
                style={{ height: "80vh" }}
              >
                <p className="text-white text-center p-8">PDF preview unavailable. Use Download.</p>
              </object>
            ) : (
              <img
                src={viewer.dataUrl}
                alt={viewer.filename}
                className="max-h-[85vh] max-w-full mx-auto rounded-lg object-contain"
              />
            )}
          </div>
        </div>
      )}
    </Card>
  );
}