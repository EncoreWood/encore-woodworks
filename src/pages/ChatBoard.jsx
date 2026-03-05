import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Trash2, Send, Paperclip, X, ExternalLink, FileText, Image, Settings, Hash, Reply, CornerUpLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Color helper: returns a css color string from a hex or default
function getRoomColor(room, projects) {
  if (!room?.project_id) return null;
  const proj = projects?.find(p => p.id === room.project_id);
  return proj?.card_color || null;
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ name, color, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  const bg = color || '#6b7280';
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: bg }}
    >
      {getInitials(name)}
    </div>
  );
}

function FileEmbed({ att }) {
  const [expanded, setExpanded] = useState(false);
  const url = att.url;
  const name = att.name || 'file';
  const ext = name.split('.').pop().toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = att.type === 'photo' || ['jpg','jpeg','png','gif','webp','svg'].includes(ext);

  if (isImage) {
    return (
      <div className="mt-1">
        <img
          src={url}
          alt={name}
          className="max-h-60 max-w-xs rounded-xl object-cover cursor-pointer border border-slate-200 hover:opacity-90 transition-opacity"
          onClick={() => setExpanded(true)}
        />
        {expanded && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
            <div className="relative max-w-4xl max-h-full">
              <img src={url} alt={name} className="max-h-[90vh] max-w-full rounded-xl object-contain" />
              <button className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5" onClick={() => setExpanded(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="mt-1 rounded-xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /><span className="truncate max-w-[200px]">{name}</span></div>
          <button onClick={() => setExpanded(!expanded)} className="text-blue-600 hover:underline">{expanded ? 'Hide' : 'View'}</button>
        </div>
        {expanded && (
          <iframe src={url} title={name} className="w-full h-96 border-0" />
        )}
      </div>
    );
  }

  // Generic file — show inline info, no download
  return (
    <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-600">
      <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{name}</span>
      <span className="text-slate-400 uppercase">{ext}</span>
    </div>
  );
}

function MessageBubble({ msg, currentUser, onReply, replySource, accentColor }) {
  const isMe = msg.user_name === (currentUser?.full_name || currentUser?.email);
  const time = msg.created_date ? new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className={`group flex gap-3 px-4 py-1.5 hover:bg-black/[0.03] rounded-lg transition-colors ${isMe ? 'flex-row-reverse' : ''}`}>
      <Avatar name={msg.user_name} color={isMe ? accentColor : undefined} size="sm" />
      <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-semibold text-slate-700">{msg.user_name}</span>
          <span className="text-[10px] text-slate-400">{time}</span>
        </div>

        {/* Reply quote */}
        {replySource && (
          <div className={`mb-1 px-3 py-1.5 rounded-lg border-l-4 bg-slate-100 text-xs text-slate-500 max-w-full ${isMe ? 'border-r-4 border-l-0' : ''}`}
            style={{ borderColor: accentColor || '#94a3b8' }}>
            <span className="font-semibold">{replySource.user_name}: </span>
            <span className="truncate">{replySource.message?.slice(0, 80)}</span>
          </div>
        )}

        {msg.message && (
          <div
            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
              isMe
                ? 'text-white rounded-tr-sm'
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
            }`}
            style={isMe ? { backgroundColor: accentColor || '#1d4ed8' } : {}}
          >
            {msg.message}
          </div>
        )}

        {msg.attachments?.length > 0 && (
          <div className="mt-1 w-full space-y-1">
            {msg.attachments.map((att, idx) => <FileEmbed key={idx} att={att} />)}
          </div>
        )}
      </div>

      {/* Reply button (visible on hover) */}
      <button
        onClick={() => onReply(msg)}
        className="self-center opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-200 rounded-full"
        title="Reply"
      >
        <Reply className="w-3.5 h-3.5 text-slate-500" />
      </button>
    </div>
  );
}

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
  const [replyTo, setReplyTo] = useState(null); // message being replied to
  const [unreadCounts, setUnreadCounts] = useState({}); // roomId -> count
  const [lastSeenTimestamps, setLastSeenTimestamps] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chatLastSeen') || '{}'); } catch { return {}; }
  });
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: chatRooms = [] } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: () => base44.entities.ChatRoom.list('-created_date')
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedRoom?.id],
    queryFn: () => {
      if (!selectedRoom) return [];
      return base44.entities.ChatMessage.filter({ room_id: selectedRoom.id }, 'created_date');
    },
    enabled: !!selectedRoom,
    refetchInterval: 5000
  });

  // Fetch all rooms' latest messages for unread counts
  const { data: allMessages = [] } = useQuery({
    queryKey: ['allChatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 200),
    refetchInterval: 10000
  });

  // Calculate unread counts
  useEffect(() => {
    const counts = {};
    chatRooms.forEach(room => {
      const roomMessages = allMessages.filter(m => m.room_id === room.id);
      const lastSeen = lastSeenTimestamps[room.id] || '1970-01-01';
      const unread = roomMessages.filter(m => m.created_date > lastSeen && m.user_name !== (currentUser?.full_name || currentUser?.email)).length;
      if (unread > 0) counts[room.id] = unread;
    });
    setUnreadCounts(counts);
  }, [allMessages, chatRooms, lastSeenTimestamps, currentUser]);

  const { data: folders = [] } = useQuery({
    queryKey: ['chatFolders', selectedRoom?.id],
    queryFn: () => {
      if (!selectedRoom) return [];
      return base44.entities.ChatFolder.filter({ room_id: selectedRoom.id });
    },
    enabled: !!selectedRoom
  });

  // Mark as read when selecting a room
  useEffect(() => {
    if (selectedRoom) {
      const now = new Date().toISOString();
      const updated = { ...lastSeenTimestamps, [selectedRoom.id]: now };
      setLastSeenTimestamps(updated);
      localStorage.setItem('chatLastSeen', JSON.stringify(updated));
      setUnreadCounts(prev => ({ ...prev, [selectedRoom.id]: 0 }));
    }
  }, [selectedRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatRooms'] })
  });

  const sendMessageMutation = useMutation({
    mutationFn: (payload) =>
      base44.entities.ChatMessage.create({
        room_id: selectedRoom.id,
        message: payload.message,
        user_name: currentUser?.full_name || currentUser?.email,
        attachments: payload.attachments,
        reply_to_id: payload.reply_to_id || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedRoom?.id] });
      queryClient.invalidateQueries({ queryKey: ['allChatMessages'] });
      setNewMessage('');
      setAttachments([]);
      setReplyTo(null);
    }
  });

  const handleSendMessage = async () => {
    if ((newMessage.trim() || attachments.length > 0) && selectedRoom) {
      sendMessageMutation.mutate({
        message: newMessage.trim(),
        attachments,
        reply_to_id: replyTo?.id || null
      });
      if (attachments.length > 0) {
        try {
          const foldersData = await base44.entities.ChatFolder.filter({ room_id: selectedRoom.id });
          attachments.forEach(attachment => {
            const folderType = attachment.type === 'photo' ? 'photos' : 'files';
            const folder = foldersData.find(f => f.type === folderType);
            if (folder) {
              const updatedFiles = [...(folder.files || []), {
                name: attachment.name, url: attachment.url,
                uploaded_by: currentUser?.full_name || currentUser?.email
              }];
              base44.entities.ChatFolder.update(folder.id, { files: updatedFiles });
            }
          });

          // Sync photos to linked project's files array
          const photoAttachments = attachments.filter(a => a.type === 'photo');
          if (photoAttachments.length > 0 && selectedRoom.project_id && selectedRoom.project_id !== 'manual') {
            const proj = projects.find(p => p.id === selectedRoom.project_id);
            if (proj) {
              const existingFiles = proj.files || [];
              const newFiles = photoAttachments.map(a => ({ name: a.name, url: a.url }));
              base44.entities.Project.update(proj.id, { files: [...existingFiles, ...newFiles] });
              queryClient.invalidateQueries({ queryKey: ['projects'] });
            }
          }
        } catch (e) {}
      }
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { url } = await base44.integrations.Core.UploadFile({ file });
      const isPhoto = file.type.startsWith('image/');
      setAttachments(prev => [...prev, { name: file.name, url, type: isPhoto ? 'photo' : 'file' }]);
    }
    setUploading(false);
    e.target.value = '';
  };

  const encoreRooms = chatRooms.filter(r => !r.project_id);
  const projectRooms = chatRooms.filter(r => r.project_id);
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const accentColor = selectedRoom ? (getRoomColor(selectedRoom, projects) || (selectedRoom.project_id ? '#3b82f6' : '#d97706')) : '#d97706';

  // Build reply source map from messages
  const messageMap = Object.fromEntries(messages.map(m => [m.id, m]));

  const RoomItem = ({ room }) => {
    const color = getRoomColor(room, projects);
    const isSelected = selectedRoom?.id === room.id;
    const unread = unreadCounts[room.id] || 0;
    const proj = projects.find(p => p.id === room.project_id);

    return (
      <button
        onClick={() => setSelectedRoom(room)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
          isSelected ? 'shadow-sm' : 'hover:bg-white/60'
        }`}
        style={isSelected ? { backgroundColor: color ? color + '22' : '#fef3c7', borderLeft: `3px solid ${color || '#d97706'}` } : {}}
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color || (room.project_id ? '#3b82f6' : '#94a3b8') }} />
        <span className={`flex-1 text-sm truncate ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
          {room.name}
        </span>
        {unread > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm flex-shrink-0">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Team Chat</h1>
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {currentUser?.role === 'admin' && (
                <button onClick={() => setShowSettings(true)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Manage Rooms">
                  <Settings className="w-4 h-4 text-slate-500" />
                </button>
              )}
              <button onClick={() => setShowAddDialog(true)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="New Room">
                <Plus className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Encore Chats */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">Encore Chats</p>
            <div className="space-y-0.5">
              {encoreRooms.length === 0 ? (
                <p className="text-xs text-slate-400 px-3 py-2">No rooms yet</p>
              ) : encoreRooms.map(room => <RoomItem key={room.id} room={room} />)}
            </div>
          </div>

          {/* Project Chats */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">Project Chats</p>
            <div className="space-y-0.5">
              {projectRooms.length === 0 ? (
                <p className="text-xs text-slate-400 px-3 py-2">No project rooms yet</p>
              ) : projectRooms.map(room => <RoomItem key={room.id} room={room} />)}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedRoom ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }} />
                <div>
                  <h2 className="font-bold text-slate-900 text-base">{selectedRoom.name}</h2>
                  {selectedRoom.description && <p className="text-xs text-slate-500">{selectedRoom.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowFilesDialog(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Files">
                  <FileText className="w-4 h-4 text-slate-500" />
                </button>
                <button onClick={() => setShowPhotosDialog(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Photos">
                  <Image className="w-4 h-4 text-slate-500" />
                </button>
                {selectedRoom.project_id && selectedRoom.project_id !== 'manual' && (
                  <Link to={createPageUrl("ProjectDetails") + "?id=" + selectedRoom.project_id}>
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="View Project">
                      <ExternalLink className="w-4 h-4 text-blue-500" />
                    </button>
                  </Link>
                )}
                {currentUser?.role === 'admin' && (
                  <button onClick={() => deleteRoomMutation.mutate(selectedRoom.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete Room">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-0.5">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <Hash className="w-12 h-12 opacity-30" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    currentUser={currentUser}
                    onReply={setReplyTo}
                    replySource={msg.reply_to_id ? messageMap[msg.reply_to_id] : null}
                    accentColor={accentColor}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-slate-200 px-4 py-3">
              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-slate-100 rounded-xl border-l-4 text-xs text-slate-600"
                  style={{ borderColor: accentColor }}>
                  <CornerUpLeft className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="flex-1 truncate"><span className="font-semibold">{replyTo.user_name}:</span> {replyTo.message?.slice(0, 80)}</span>
                  <button onClick={() => setReplyTo(null)}><X className="w-3 h-3 text-slate-400 hover:text-slate-600" /></button>
                </div>
              )}

              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="relative">
                      {att.type === 'photo'
                        ? <img src={att.url} alt={att.name} className="h-14 w-14 object-cover rounded-lg border border-slate-200" />
                        : <div className="h-14 w-14 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center"><Paperclip className="w-5 h-5 text-slate-500" /></div>
                      }
                      <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5">
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1 flex items-end bg-slate-100 rounded-2xl px-4 py-2 gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Message... (Enter to send, Shift+Enter for new line)"
                    className="flex-1 bg-transparent border-0 shadow-none resize-none text-sm focus-visible:ring-0 p-0 min-h-[24px] max-h-32"
                    rows={1}
                  />
                  <label className="cursor-pointer flex-shrink-0">
                    <input type="file" multiple onChange={handleFileUpload} disabled={uploading} className="hidden" />
                    <span className="p-1 hover:bg-slate-200 rounded-full block transition-colors">
                      <Paperclip className="w-4 h-4 text-slate-500" />
                    </span>
                  </label>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={(newMessage.trim() === '' && attachments.length === 0) || sendMessageMutation.isPending}
                  className="p-3 rounded-full text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
              <Hash className="w-10 h-10 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-500">Select a chat room</p>
              <p className="text-sm text-slate-400">Choose a room from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </main>

      {/* Files Dialog */}
      <Dialog open={showFilesDialog} onOpenChange={setShowFilesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Files — {selectedRoom?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(() => {
              const files = folders.find(f => f.type === 'files')?.files || [];
              return files.length === 0
                ? <p className="text-sm text-slate-400 py-8 text-center">No files uploaded yet</p>
                : files.map((file, idx) => {
                    const ext = (file.name || '').split('.').pop().toLowerCase();
                    const isPdf = ext === 'pdf';
                    return (
                      <div key={idx} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50">
                          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                            <p className="text-xs text-slate-400">{file.uploaded_by}</p>
                          </div>
                        </div>
                        {isPdf && <iframe src={file.url} title={file.name} className="w-full h-80 border-0" />}
                      </div>
                    );
                  });
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Photos Dialog */}
      <Dialog open={showPhotosDialog} onOpenChange={setShowPhotosDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Photos — {selectedRoom?.name}</DialogTitle></DialogHeader>
          <PhotoGallery photos={folders.find(f => f.type === 'photos')?.files || []} />
        </DialogContent>
      </Dialog>

      {/* Add Room Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Chat Room</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Room Name</Label>
              <Input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="e.g. General, Kitchen Project" className="mt-1" />
            </div>
            <div>
              <Label>Group</Label>
              <Select value={newRoomGroup} onValueChange={setNewRoomGroup}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="encore">Encore Chats</SelectItem>
                  <SelectItem value="project">Project Chats</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={() => {
                if (newRoomName.trim()) {
                  createRoomMutation.mutate({ name: newRoomName.trim(), project_id: newRoomGroup === 'project' ? 'manual' : undefined });
                }
              }} disabled={!newRoomName.trim() || createRoomMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Chat Rooms</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {chatRooms.map(room => (
              <div key={room.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getRoomColor(room, projects) || (room.project_id ? '#3b82f6' : '#94a3b8') }} />
                  <span className="text-sm font-medium text-slate-800">{room.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={room.project_id ? 'project' : 'encore'}
                    onValueChange={val => updateRoomMutation.mutate({ id: room.id, data: { project_id: val === 'project' ? 'manual' : null } })}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="encore">Encore</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                  <button onClick={() => deleteRoomMutation.mutate(room.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}