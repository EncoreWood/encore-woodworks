import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function SendToClientModal({ open, onOpenChange, presentation, onSent }) {
  const [email, setEmail] = useState(presentation?.client_name || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const shareLink = presentation?.shared_link_token
    ? `${window.location.origin}/Presentations?mode=share&token=${presentation.shared_link_token}`
    : null;

  const handleSend = async () => {
    setSending(true);
    // Generate token if not set
    let token = presentation.shared_link_token;
    if (!token) {
      token = Math.random().toString(36).substring(2, 15);
      await base44.entities.Presentation.update(presentation.id, {
        shared_link_token: token,
        status: "sent",
        sent_date: format(new Date(), "yyyy-MM-dd"),
      });
    }
    const link = `${window.location.origin}/Presentations?mode=share&token=${token}`;
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `Your Presentation: ${presentation.project_name}`,
      body: `Hello,\n\nPlease find your cabinet design presentation here:\n\n${link}\n\nThank you,\nEncore Woodworks`,
    });
    setSending(false);
    setSent(true);
    onSent && onSent();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Presentation to Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {shareLink && (
            <div className="bg-slate-50 rounded-lg p-3">
              <Label className="text-xs text-slate-500 mb-1 block">Share Link</Label>
              <div className="flex gap-2">
                <Input value={shareLink} readOnly className="text-xs" />
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(shareLink)}>Copy</Button>
              </div>
            </div>
          )}
          <div>
            <Label>Client Email</Label>
            <Input
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          {sent ? (
            <div className="text-green-600 text-sm font-medium text-center py-2">✓ Email sent successfully!</div>
          ) : (
            <Button
              onClick={handleSend}
              disabled={sending || !email}
              className="w-full bg-amber-700 hover:bg-amber-800"
            >
              {sending ? "Sending..." : "Send Email"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}