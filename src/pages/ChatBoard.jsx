import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Trash2, Send, Paperclip, X, ExternalLink, FileText, Image, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChatEmployees from '@/components/chat/ChatEmployees';

export default function ChatBoard() {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomGroup, setNewRoomGroup] = useState('encore');
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const [showPhotosDialog, setShowPhotosDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [movingRoomId, setMovingRoomId] = useState(null);
  const [moveToGroup, setMoveToGroup] = useState('');
  const queryClient = useQueryClient();

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch chat rooms
  const { data: chatRooms = [] } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: () => base44.entities.ChatRoom.list('-created_date')
  });

  // Fetch messages for selected room
  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedRoom?.id],
    queryFn: () => {
      if (!selectedRoom) return [];
      return base44.entities.ChatMessage.filter({ room_id: selectedRoom.id }, '-created_date');
    },
    enabled: !!selectedRoom
  });

  // Fetch folders for selected room
  const { data: folders = [] } = useQuery({
    queryKey: ['chatFolders', selectedRoom?.id],
    queryFn: () => {
      if (!selectedRoom) return [];
      return base44.entities.ChatFolder.filter({ room_id: selectedRoom.id });
    },
    enabled: !!selectedRoom
  });

  // Mutations
  const createRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatRoom.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      setShowAddDialog(false);
      setNewRoomName('');
      setNewRoomGroup('encore');
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId) => base44.entities.ChatRoom.delete(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      setSelectedRoom(null);
    }
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChatRoom.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      setMovingRoomId(null);
      setMoveToGroup('');
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: (payload) =>
      base44.entities.ChatMessage.create({
        room_id: selectedRoom.id,
        message: payload.message,
        user_name: currentUser?.full_name || currentUser?.email,
        attachments: payload.attachments
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedRoom?.id] });
      setNewMessage('');
      setAttachments([]);
    }
  });

  const handleAddRoom = () => {
    if (newRoomName.trim()) {
      createRoomMutation.mutate({
        name: newRoomName.trim(),
        project_id: newRoomGroup === 'project' ? 'manual' : undefined
      });
    }
  };

  const handleSendMessage = async () => {
    if ((newMessage.trim() || attachments.length > 0) && selectedRoom) {
      sendMessageMutation.mutate({
        message: newMessage.trim(),
        attachments
      });

      // Auto-organize attachments into folders
      if (attachments.length > 0) {
        try {
          const folders = await base44.entities.ChatFolder.filter({ room_id: selectedRoom.id });
          
          attachments.forEach(attachment => {
            const folderType = attachment.type === 'photo' ? 'photos' : 'files';
            const folder = folders.find(f => f.type === folderType);
            
            if (folder) {
              const updatedFiles = folder.files ? [...folder.files] : [];
              updatedFiles.push({
                name: attachment.name,
                url: attachment.url,
                uploaded_by: currentUser?.full_name || currentUser?.email
              });
              
              base44.entities.ChatFolder.update(folder.id, { files: updatedFiles });
            }
          });
        } catch (error) {
          console.error('Error organizing attachments:', error);
        }
      }
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const { url } = await base44.integrations.Core.UploadFile({ file });
        const isPhoto = file.type.startsWith('image/');
        setAttachments(prev => [
          ...prev,
          {
            name: file.name,
            url,
            type: isPhoto ? 'photo' : 'file'
          }
        ]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveRoom = (roomId, toGroup) => {
    const projectIdValue = toGroup === 'project' ? 'manual' : null;
    updateRoomMutation.mutate({
      id: roomId,
      data: { project_id: projectIdValue }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Team Chat</h1>
            <p className="text-slate-500 mt-1">Collaborate with your team</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat Room
            </Button>
            {currentUser?.role === 'admin' && (
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Rooms
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Chat Rooms List */}
            <Card className="p-4 bg-white border-0 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Rooms</h2>
              <div className="space-y-6">
                {/* Encore Chats */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Encore Chats</h3>
                  <div className="space-y-2">
                    {chatRooms.filter(r => !r.project_id).length === 0 ? (
                      <p className="text-xs text-slate-500">No encore chats</p>
                    ) : (
                      chatRooms.filter(r => !r.project_id).map((room) => (
                        <div
                           key={room.id}
                           className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between group ${
                             selectedRoom?.id === room.id
                               ? 'bg-amber-100 text-amber-900'
                               : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                           }`}
                         >
                           <button
                             onClick={() => setSelectedRoom(room)}
                             className="flex-1 text-left font-medium text-sm truncate"
                           >
                             {room.name}
                           </button>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                               onClick={() => deleteRoomMutation.mutate(room.id)}
                             >
                               <Trash2 className="w-4 h-4 text-red-600 hover:text-red-700" />
                             </button>
                           </div>
                         </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Project Chats */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Project Chats</h3>
                  <div className="space-y-2">
                    {chatRooms.filter(r => r.project_id).length === 0 ? (
                      <p className="text-xs text-slate-500">No project chats</p>
                    ) : (
                      chatRooms.filter(r => r.project_id).map((room) => (
                        <div
                           key={room.id}
                           className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between group ${
                             selectedRoom?.id === room.id
                               ? 'bg-blue-100 text-blue-900'
                               : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                           }`}
                         >
                           <button
                             onClick={() => setSelectedRoom(room)}
                             className="flex-1 text-left font-medium text-sm truncate"
                           >
                             {room.name}
                           </button>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             {room.project_id && (
                               <Link to={createPageUrl("ProjectDetails") + "?id=" + room.project_id}>
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   className="h-6 w-6"
                                   onClick={(e) => e.stopPropagation()}
                                 >
                                   <ExternalLink className="w-3 h-3 text-blue-600" />
                                 </Button>
                               </Link>
                             )}
                             <button
                               onClick={() => deleteRoomMutation.mutate(room.id)}
                             >
                               <Trash2 className="w-4 h-4 text-red-600 hover:text-red-700" />
                             </button>
                           </div>
                         </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Employees */}
            {selectedRoom && (
              <ChatEmployees room={selectedRoom} />
            )}
          </div>

          {/* Messages */}
          <div className="lg:col-span-3">
            {selectedRoom ? (
              <Card className="p-6 bg-white border-0 shadow-lg flex flex-col h-[600px]">
                <div className="mb-4 pb-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedRoom.name}</h2>
                    {selectedRoom.description && (
                      <p className="text-sm text-slate-500 mt-1">{selectedRoom.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFilesDialog(true)}
                      className="p-2 hover:bg-slate-100 rounded transition-colors"
                      title="Files"
                    >
                      <FileText className="w-5 h-5 text-slate-600" />
                    </button>
                    <button
                      onClick={() => setShowPhotosDialog(true)}
                      className="p-2 hover:bg-slate-100 rounded transition-colors"
                      title="Photos"
                    >
                      <Image className="w-5 h-5 text-slate-600" />
                    </button>
                    {selectedRoom.project_id && (
                      <Link to={createPageUrl("ProjectDetails") + "?id=" + selectedRoom.project_id}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          title="View Project"
                        >
                          <ExternalLink className="w-5 h-5 text-blue-600" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {msg.user_name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {msg.created_date &&
                              new Date(msg.created_date).toLocaleTimeString()}
                          </span>
                        </div>
                        {msg.message && (
                          <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                            {msg.message}
                          </p>
                        )}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="space-y-2">
                            {msg.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 bg-slate-100 rounded text-xs hover:bg-slate-200 transition-colors"
                              >
                                {att.type === 'photo' ? (
                                  <img src={att.url} alt={att.name} className="h-12 w-12 object-cover rounded" />
                                ) : (
                                  <Paperclip className="w-4 h-4 text-slate-600" />
                                )}
                                <span className="text-slate-700 truncate flex-1">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative">
                        {att.type === 'photo' ? (
                          <img src={att.url} alt={att.name} className="h-16 w-16 object-cover rounded" />
                        ) : (
                          <div className="h-16 w-16 bg-slate-200 rounded flex items-center justify-center">
                            <Paperclip className="w-6 h-6 text-slate-600" />
                          </div>
                        )}
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Input */}
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message... (Ctrl+Enter to send)"
                    className="text-sm resize-none"
                    rows={3}
                  />
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={uploading}
                        className="h-9"
                        asChild
                      >
                        <span>
                          <Paperclip className="w-4 h-4" />
                        </span>
                      </Button>
                    </label>
                    <Button
                      onClick={handleSendMessage}
                      disabled={(newMessage.trim() === '' && attachments.length === 0) || sendMessageMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 bg-white border-0 shadow-lg flex items-center justify-center h-[600px]">
                <p className="text-slate-500 text-center">
                  Select a chat room to start messaging
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Files Dialog */}
        <Dialog open={showFilesDialog} onOpenChange={setShowFilesDialog}>
          <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Files</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {(() => {
                const filesFolder = folders.find(f => f.type === 'files');
                const files = filesFolder?.files || [];
                return files.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">No files uploaded yet</p>
                ) : (
                  files.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded transition-colors"
                    >
                      <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{file.uploaded_by}</p>
                      </div>
                    </a>
                  ))
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* Photos Dialog */}
        <Dialog open={showPhotosDialog} onOpenChange={setShowPhotosDialog}>
          <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Photos</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3">
              {(() => {
                const photosFolder = folders.find(f => f.type === 'photos');
                const photos = photosFolder?.files || [];
                return photos.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center col-span-3">No photos uploaded yet</p>
                ) : (
                  photos.map((photo, idx) => (
                    <a
                      key={idx}
                      href={photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded"
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-32 object-cover group-hover:opacity-80 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-xs text-white text-center px-2">{photo.uploaded_by}</span>
                      </div>
                    </a>
                  ))
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Room Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Chat Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="roomGroup">Group</Label>
                <Select value={newRoomGroup} onValueChange={setNewRoomGroup}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="encore">Encore Chats</SelectItem>
                    <SelectItem value="project">Project Chats</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddRoom}
                  disabled={!newRoomName.trim() || createRoomMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Chat Rooms</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Encore Chats */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Encore Chats</h3>
                <div className="space-y-2">
                  {chatRooms.filter(r => !r.project_id).map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-sm font-medium text-slate-900">{room.name}</span>
                      <div className="flex items-center gap-2">
                        <Select
                          value="encore"
                          onValueChange={(value) => handleMoveRoom(room.id, value)}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="encore">Encore</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRoomMutation.mutate(room.id)}
                          className="h-8 px-2 text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {chatRooms.filter(r => !r.project_id).length === 0 && (
                    <p className="text-xs text-slate-500">No rooms in this group</p>
                  )}
                </div>
              </div>

              {/* Project Chats */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Project Chats</h3>
                <div className="space-y-2">
                  {chatRooms.filter(r => r.project_id).map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-sm font-medium text-slate-900">{room.name}</span>
                      <div className="flex items-center gap-2">
                        <Select
                          value="project"
                          onValueChange={(value) => handleMoveRoom(room.id, value)}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="encore">Encore</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRoomMutation.mutate(room.id)}
                          className="h-8 px-2 text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {chatRooms.filter(r => r.project_id).length === 0 && (
                    <p className="text-xs text-slate-500">No rooms in this group</p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}