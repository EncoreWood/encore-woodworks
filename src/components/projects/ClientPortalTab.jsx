import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, UserPlus, Globe, GlobeLock, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const SECTIONS = [
  { key: "show_status",        label: "Project Status",      desc: "Status, dates, and address" },
  { key: "show_milestones",    label: "Progress Milestones", desc: "Design → Materials → Production → Install" },
  { key: "show_presentations", label: "3D Presentations",    desc: "Visual slideshow of renderings" },
  { key: "show_documents",     label: "Documents",           desc: "Downloadable project files" },
  { key: "show_photos",        label: "Job Photos",          desc: "Photo gallery" },
  { key: "show_financials",    label: "Financials",          desc: "Budget, deposit, and balance due" },
  { key: "show_messages",      label: "Messages",            desc: "Chat thread with project team" },
];

export default function ClientPortalTab({ project }) {
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["client_portal_settings", project.id],
    queryFn: () => base44.entities.ClientPortalSettings.filter({ project_id: project.id }).then(r => r[0] || null),
  });

  const { data: clientUser } = useQuery({
    queryKey: ["client_user", project.id],
    queryFn: async () => {
      if (!settings?.client_email) return null;
      const users = await base44.entities.User.list();
      return users.find(u => u.email === settings.client_email && u.role === "client") || null;
    },
    enabled: !!settings?.client_email,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.ClientPortalSettings.update(settings.id, data);
      } else {
        return base44.entities.ClientPortalSettings.create({ project_id: project.id, ...data });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_portal_settings", project.id] }),
  });

  const handleToggle = (key, value) => {
    saveMutation.mutate({ [key]: value });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), "client");
      // Find the new user and set their client_project_id
      await new Promise(r => setTimeout(r, 1500));
      const users = await base44.entities.User.list();
      const newUser = users.find(u => u.email === inviteEmail.trim());
      if (newUser) await base44.entities.User.update(newUser.id, { client_project_id: project.id });
      // Save settings with client_email
      await saveMutation.mutateAsync({ client_email: inviteEmail.trim() });
      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["client_user", project.id] });
    } catch (err) {
      toast.error("Failed to invite client: " + err.message);
    }
    setInviting(false);
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/ClientPortal");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>;

  const isActive = settings?.is_active !== false;

  return (
    <div className="space-y-6">
      {/* Portal Status */}
      <div className={`rounded-xl p-4 border flex items-center justify-between ${isActive ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex items-center gap-3">
          {isActive ? <Globe className="w-5 h-5 text-emerald-600" /> : <GlobeLock className="w-5 h-5 text-slate-400" />}
          <div>
            <p className="text-sm font-semibold text-slate-800">Client Portal {isActive ? "Active" : "Inactive"}</p>
            <p className="text-xs text-slate-500">{isActive ? "Client can log in and view their project" : "Portal is hidden from the client"}</p>
          </div>
        </div>
        <Switch checked={isActive} onCheckedChange={v => handleToggle("is_active", v)} />
      </div>

      {/* Invite Client */}
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-amber-500" />Client Access</h3>
        {clientUser ? (
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">{clientUser.full_name || clientUser.email}</p>
              <p className="text-xs text-slate-500">{clientUser.email} · Client role</p>
              {clientUser.updated_date && <p className="text-xs text-slate-400 mt-0.5">Last seen: {new Date(clientUser.updated_date).toLocaleDateString()}</p>}
            </div>
            <button onClick={copyPortalLink} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-300 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition-colors">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Invite the client by email. They will receive an invitation and see their portal when they log in.</p>
            <div className="flex gap-2">
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="client@email.com" className="h-9 text-sm" onKeyDown={e => e.key === "Enter" && handleInvite()} />
              <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting} className="bg-amber-600 hover:bg-amber-700 h-9 px-4" size="sm">
                {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Invite"}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400">Portal URL:</p>
              <button onClick={copyPortalLink} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {window.location.origin}/ClientPortal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Welcome Message */}
      <div className="rounded-xl border border-slate-200 p-4">
        <Label className="text-sm font-bold text-slate-700 mb-2 block">Welcome Message</Label>
        <input
          defaultValue={settings?.welcome_message || ""}
          onBlur={e => { if (e.target.value !== (settings?.welcome_message || "")) saveMutation.mutate({ welcome_message: e.target.value }); }}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          placeholder="e.g. Welcome to your project portal, we're excited to work with you!"
        />
      </div>

      {/* Section Toggles */}
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Portal Sections</h3>
        <div className="space-y-3">
          {SECTIONS.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{s.label}</p>
                <p className="text-xs text-slate-400">{s.desc}</p>
              </div>
              <Switch
                checked={settings ? (settings[s.key] !== false) : s.key !== "show_financials"}
                onCheckedChange={v => handleToggle(s.key, v)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}