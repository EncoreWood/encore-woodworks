import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, Plus, Trash2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ChatFolders({ roomId }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderType, setFolderType] = useState('files');
  const queryClient = useQueryClient();

  const { data: folders = [] } = useQuery({
    queryKey: ['chatFolders', roomId],
    queryFn: () => base44.entities.ChatFolder.filter({ room_id: roomId }),
    enabled: !!roomId
  });

  const createFolderMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatFolder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatFolders', roomId] });
      setShowAddDialog(false);
      setFolderName('');
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId) => base44.entities.ChatFolder.delete(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatFolders', roomId] });
    }
  });

  const handleCreateFolder = () => {
    if (folderName.trim()) {
      createFolderMutation.mutate({
        room_id: roomId,
        name: folderName.trim(),
        type: folderType,
        files: []
      });
    }
  };

  const filesFolders = folders.filter(f => f.type === 'files');
  const photosFolders = folders.filter(f => f.type === 'photos');

  return (
    <>
      <Card className="p-4 bg-white border-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Folders</h3>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            variant="outline"
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            New
          </Button>
        </div>

        <div className="space-y-4">
          {filesFolders.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase">Files</h4>
              <div className="space-y-2">
                {filesFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Folder className="w-4 h-4 text-slate-600" />
                      <span className="text-slate-700">{folder.name}</span>
                      {folder.files && (
                        <span className="text-xs text-slate-500">({folder.files.length})</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteFolderMutation.mutate(folder.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {photosFolders.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase">Photos</h4>
              <div className="space-y-2">
                {photosFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Folder className="w-4 h-4 text-yellow-600" />
                      <span className="text-slate-700">{folder.name}</span>
                      {folder.files && (
                        <span className="text-xs text-slate-500">({folder.files.length})</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteFolderMutation.mutate(folder.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {folders.length === 0 && (
            <p className="text-sm text-slate-500">No folders yet</p>
          )}
        </div>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Folder Name
              </label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Folder Type
              </label>
              <select
                value={folderType}
                onChange={(e) => setFolderType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="files">Files</option>
                <option value="photos">Photos</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!folderName.trim()}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}