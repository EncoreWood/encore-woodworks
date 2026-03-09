import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Mail, LogOut, Trash2, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageSlideWrapper from "@/components/PageSlideWrapper";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AccountSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Dashboard"));
  };

  return (
    <PageSlideWrapper>
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your account</p>
        </div>

        {/* Profile Info */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-4">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Profile</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{currentUser?.full_name || "—"}</p>
                <p className="text-sm text-slate-500 capitalize">{currentUser?.role || "user"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{currentUser?.email || "—"}</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-4">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Session</h2>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-slate-700"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 bg-white border-0 shadow-sm border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Deleting your account is permanent and cannot be undone. All your data will be removed.
          </p>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </Button>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeleteConfirmText(""); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                <Trash2 className="w-5 h-5" /> Delete Account
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>This will permanently delete your account and all associated data. <strong>This cannot be undone.</strong></p>
                  <p className="text-sm">To confirm, type <strong>DELETE</strong> below:</p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="border-red-200 focus:border-red-400"
                    autoCapitalize="characters"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteConfirmText !== "DELETE"}
                onClick={() => {
                  base44.integrations.Core.SendEmail({
                    to: "team@encorewood.com",
                    subject: "Account Deletion Request",
                    body: `User ${currentUser?.full_name} (${currentUser?.email}) has requested account deletion.`
                  });
                  setShowDeleteDialog(false);
                  setDeleteConfirmText("");
                  alert("Your deletion request has been sent to the administrator.");
                }}
              >
                Permanently Delete Account
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}