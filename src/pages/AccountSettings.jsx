import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Mail, LogOut, Trash2, ShieldAlert, Camera, Loader2, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageSlideWrapper from "@/components/PageSlideWrapper";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AccountSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [employeeRecord, setEmployeeRecord] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setEditName(user?.full_name || "");
      const emps = await base44.entities.Employee.list();
      const emp = emps.find(e => e.user_email === user?.email || e.email === user?.email);
      if (emp) {
        setEmployeeRecord(emp);
        setEditPhone(emp.phone || "");
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Dashboard"));
  };

  const handleSave = async () => {
    setSaving(true);
    if (employeeRecord) {
      await base44.entities.Employee.update(employeeRecord.id, {
        phone: editPhone,
        full_name: editName,
      });
      setEmployeeRecord(prev => ({ ...prev, phone: editPhone, full_name: editName }));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !employeeRecord) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Employee.update(employeeRecord.id, { profile_image: file_url });
    setEmployeeRecord(prev => ({ ...prev, profile_image: file_url }));
    setUploadingPhoto(false);
  };

  const profilePhoto = employeeRecord?.profile_image;

  return (
    <PageSlideWrapper>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link to={createPageUrl("Dashboard")} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
            <p className="text-slate-500 text-sm mt-1">View and update your personal information</p>
          </div>

          {/* Profile Photo + Basic Info */}
          <Card className="p-6 bg-white border-0 shadow-sm mb-4">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Profile</h2>

            <div className="flex items-center gap-5 mb-5">
              <div className="relative">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-20 h-20 rounded-full object-cover ring-2 ring-amber-200" />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors">
                  {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto || !employeeRecord} />
                </label>
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-lg">{currentUser?.full_name || "—"}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" />
                  {currentUser?.email || "—"}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 capitalize">
                  {currentUser?.role || "user"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="edit_name">Display Name</Label>
                <Input
                  id="edit_name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Your name"
                  disabled={!employeeRecord}
                />
              </div>
              <div>
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={!employeeRecord}
                />
              </div>
              {!employeeRecord && (
                <p className="text-xs text-slate-400">No employee record linked to your account — contact an admin to edit your profile.</p>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || !employeeRecord}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : saved ? "Saved!" : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
              </Button>
            </div>
          </Card>

          {/* Session */}
          <Card className="p-6 bg-white border-0 shadow-sm mb-4">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Session</h2>
            <Button variant="outline" onClick={handleLogout} className="w-full justify-start gap-2 text-slate-700">
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
            <p className="text-sm text-slate-500 mb-4">Deleting your account is permanent and cannot be undone.</p>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </Button>
          </Card>

          <AlertDialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeleteConfirmText(""); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                  <Trash2 className="w-5 h-5" /> Delete Account
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>This will permanently delete your account. <strong>This cannot be undone.</strong></p>
                    <p className="text-sm">Type <strong>DELETE</strong> to confirm:</p>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE to confirm"
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
    </PageSlideWrapper>
  );
}