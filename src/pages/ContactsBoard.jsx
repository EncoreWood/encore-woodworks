import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Mail, Phone, Tag, Pencil, Trash2, Users, Building2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_TYPES = ["GC", "Home Owner", "Designer"];

export default function ContactsBoard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterTag, setFilterTag] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [tagProjectsDialog, setTagProjectsDialog] = useState(null); // tag string
  const [customTypes, setCustomTypes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("contact_custom_types") || "[]"); } catch { return []; }
  });
  const [newTypeName, setNewTypeName] = useState("");
  const [showAddType, setShowAddType] = useState(false);

  const allTypes = [...DEFAULT_TYPES, ...customTypes];

  const emptyForm = { name: "", contact_type: "", email: "", phone: "", company_tag: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setShowForm(false); setForm(emptyForm); toast.success("Contact added!"); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setShowForm(false); setEditingContact(null); toast.success("Contact updated!"); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); toast.success("Contact deleted."); }
  });

  const openNew = () => { setForm(emptyForm); setEditingContact(null); setShowForm(true); };
  const openEdit = (contact) => { setForm({ ...contact }); setEditingContact(contact); setShowForm(true); };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const addCustomType = () => {
    if (!newTypeName.trim() || allTypes.includes(newTypeName.trim())) return;
    const updated = [...customTypes, newTypeName.trim()];
    setCustomTypes(updated);
    localStorage.setItem("contact_custom_types", JSON.stringify(updated));
    setNewTypeName("");
    setShowAddType(false);
  };

  // All unique company tags
  const allTags = [...new Set(contacts.map(c => c.company_tag).filter(Boolean))];

  const filtered = contacts.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_tag?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || c.contact_type === filterType;
    const matchTag = !filterTag || c.company_tag === filterTag;
    return matchSearch && matchType && matchTag;
  });

  // Group by company tag for display
  const grouped = {};
  const ungrouped = [];
  filtered.forEach(c => {
    if (c.company_tag) {
      if (!grouped[c.company_tag]) grouped[c.company_tag] = [];
      grouped[c.company_tag].push(c);
    } else {
      ungrouped.push(c);
    }
  });

  const typeColors = {
    "GC": "bg-blue-100 text-blue-800",
    "Home Owner": "bg-green-100 text-green-800",
    "Designer": "bg-purple-100 text-purple-800",
  };
  const getTypeColor = (type) => typeColors[type] || "bg-slate-100 text-slate-700";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Contacts Board</h1>
            <p className="text-slate-500 mt-1">Manage GCs, Home Owners, Designers, and more</p>
          </div>
          <Button onClick={openNew} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" /> Add Contact
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {allTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {allTags.length > 0 && (
            <Select value={filterTag || "all"} onValueChange={v => setFilterTag(v === "all" ? "" : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="bg-white rounded-lg px-4 py-2 shadow-sm border text-sm">
            <span className="text-slate-500">Total: </span><span className="font-semibold">{contacts.length}</span>
          </div>
          {allTypes.map(t => {
            const count = contacts.filter(c => c.contact_type === t).length;
            if (!count) return null;
            return (
              <div key={t} className="bg-white rounded-lg px-4 py-2 shadow-sm border text-sm">
                <span className="text-slate-500">{t}: </span><span className="font-semibold">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Grouped by company */}
        {Object.entries(grouped).map(([tag, members]) => (
          <div key={tag} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-slate-700">{tag}</h2>
              <Badge variant="outline" className="text-xs">{members.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map(c => <ContactCard key={c.id} contact={c} onEdit={openEdit} onDelete={(id) => { if (confirm("Delete contact?")) deleteMutation.mutate(id); }} getTypeColor={getTypeColor} />)}
            </div>
          </div>
        ))}

        {/* Ungrouped */}
        {ungrouped.length > 0 && (
          <div>
            {Object.keys(grouped).length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-slate-500" />
                <h2 className="font-semibold text-slate-700">Other Contacts</h2>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ungrouped.map(c => <ContactCard key={c.id} contact={c} onEdit={openEdit} onDelete={(id) => { if (confirm("Delete contact?")) deleteMutation.mutate(id); }} getTypeColor={getTypeColor} />)}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No contacts found</p>
          </div>
        )}

        {/* Add/Edit Form Dialog */}
        <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditingContact(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Contact Type</Label>
                <div className="flex gap-2">
                  <Select value={form.contact_type} onValueChange={v => setForm(f => ({ ...f, contact_type: v }))}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowAddType(true)} title="Add new type">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {showAddType && (
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="New type name" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomType()} />
                    <Button size="sm" onClick={addCustomType} className="bg-amber-600 hover:bg-amber-700">Add</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddType(false)}>Cancel</Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="(555) 123-4567" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Tag className="w-3 h-3" /> Company Tag</Label>
                <div className="flex gap-2">
                  <Input placeholder="e.g. Smith Construction" value={form.company_tag} onChange={e => setForm(f => ({ ...f, company_tag: e.target.value }))} />
                </div>
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {allTags.map(tag => (
                      <button key={tag} type="button" onClick={() => setForm(f => ({ ...f, company_tag: tag }))}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${form.company_tag === tag ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400">Contacts with the same tag are grouped together as a company</p>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={2} placeholder="Additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSubmit} disabled={!form.name.trim()}>
                {editingContact ? "Save" : "Add Contact"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ContactCard({ contact, onEdit, onDelete, getTypeColor }) {
  return (
    <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{contact.name}</h3>
          {contact.contact_type && (
            <Badge className={`text-xs border-0 mt-1 ${getTypeColor(contact.contact_type)}`}>{contact.contact_type}</Badge>
          )}
        </div>
        <div className="flex gap-1 ml-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(contact)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => onDelete(contact.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="space-y-1.5 text-sm">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-amber-600 hover:text-amber-700 truncate">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />{contact.email}
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />{contact.phone}
          </a>
        )}
        {contact.company_tag && (
          <div className="flex items-center gap-2 text-slate-500">
            <Tag className="w-3.5 h-3.5 flex-shrink-0" /><span className="text-xs">{contact.company_tag}</span>
          </div>
        )}
        {contact.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{contact.notes}</p>}
      </div>
    </Card>
  );
}