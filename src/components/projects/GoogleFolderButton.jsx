import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FolderOpen, ExternalLink, Edit, Loader2 } from "lucide-react";

export default function GoogleFolderButton({ project, onSave, isLoading }) {
  const [showDialog, setShowDialog] = useState(false);
  const [url, setUrl] = useState("");

  const folderUrl = project?.google_drive_folder_url;

  const openDialog = () => {
    setUrl(folderUrl || "");
    setShowDialog(true);
  };

  const handleSave = () => {
    onSave({ google_drive_folder_url: url.trim() || null });
    setShowDialog(false);
  };

  if (folderUrl) {
    return (
      <div className="flex items-center gap-1">
        <a href={folderUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            <FolderOpen className="w-4 h-4 mr-1.5" />Google Folder
          </Button>
        </a>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={openDialog} title="Edit folder link">
          <Edit className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <FolderOpen className="w-4 h-4 mr-1.5" />Google Folder
      </Button>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Google Drive Folder Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Paste the Google Drive folder URL</Label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
            />
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                <ExternalLink className="w-3.5 h-3.5" />Open folder to verify
              </a>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}