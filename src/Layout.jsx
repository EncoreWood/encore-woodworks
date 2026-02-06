import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Hammer, Kanban as KanbanIcon, Calendar, Factory, Coffee, Users, MessageSquare, ChevronDown, Settings, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Layout({ children, currentPageName }) {
  const [expandedGroups, setExpandedGroups] = useState({
    projects: true,
    operations: true,
    team: true
  });

  const [navGroups, setNavGroups] = useState({
    projects: {
      name: "Projects",
      items: [
        { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
        { name: "Board", icon: KanbanIcon, page: "Kanban" },
      ]
    },
    operations: {
      name: "Operations",
      items: [
        { name: "Calendar", icon: Calendar, page: "Calendar" },
        { name: "Production", icon: Factory, page: "ShopProduction" },
        { name: "Inventory", icon: Coffee, page: "Inventory" },
      ]
    },
    team: {
      name: "Team",
      items: [
        { name: "Morning Meeting", icon: Coffee, page: "MorningMeeting" },
        { name: "Team", icon: Users, page: "Team" },
        { name: "Chat", icon: MessageSquare, page: "ChatBoard" }
      ]
    }
  });

  const [showSettings, setShowSettings] = useState(false);
  const [editingGroupKey, setEditingGroupKey] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingBoardKey, setEditingBoardKey] = useState(null);
  const [editingBoardGroupKey, setEditingBoardGroupKey] = useState(null);
  const [editingBoardName, setEditingBoardName] = useState("");

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const startEditGroup = (groupKey) => {
    setEditingGroupKey(groupKey);
    setEditingGroupName(navGroups[groupKey].name);
  };

  const saveGroupName = () => {
    if (editingGroupKey && editingGroupName.trim()) {
      setNavGroups(prev => ({
        ...prev,
        [editingGroupKey]: {
          ...prev[editingGroupKey],
          name: editingGroupName.trim()
        }
      }));
      setEditingGroupKey(null);
      setEditingGroupName("");
    }
  };

  const deleteGroup = (groupKey) => {
    setNavGroups(prev => {
      const newGroups = { ...prev };
      delete newGroups[groupKey];
      return newGroups;
    });
    setExpandedGroups(prev => {
      const newExpanded = { ...prev };
      delete newExpanded[groupKey];
      return newExpanded;
    });
  };

  const startEditBoard = (groupKey, itemIndex) => {
    setEditingBoardGroupKey(groupKey);
    setEditingBoardKey(itemIndex);
    setEditingBoardName(navGroups[groupKey].items[itemIndex].name);
  };

  const saveBoardName = () => {
    if (editingBoardGroupKey !== null && editingBoardKey !== null && editingBoardName.trim()) {
      setNavGroups(prev => ({
        ...prev,
        [editingBoardGroupKey]: {
          ...prev[editingBoardGroupKey],
          items: prev[editingBoardGroupKey].items.map((item, idx) =>
            idx === editingBoardKey ? { ...item, name: editingBoardName.trim() } : item
          )
        }
      }));
      setEditingBoardKey(null);
      setEditingBoardGroupKey(null);
      setEditingBoardName("");
    }
  };

  const moveBoard = (fromGroupKey, itemIndex, toGroupKey) => {
    if (fromGroupKey === toGroupKey) return;

    setNavGroups(prev => {
      const newGroups = { ...prev };
      const board = newGroups[fromGroupKey].items[itemIndex];
      newGroups[fromGroupKey].items.splice(itemIndex, 1);
      newGroups[toGroupKey].items.push(board);
      return newGroups;
    });
    setEditingBoardKey(null);
    setEditingBoardGroupKey(null);
  };

  const reorderBoard = (groupKey, itemIndex, direction) => {
    setNavGroups(prev => {
      const newGroups = { ...prev };
      const items = newGroups[groupKey].items;
      const newIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;

      if (newIndex >= 0 && newIndex < items.length) {
        [items[itemIndex], items[newIndex]] = [items[newIndex], items[itemIndex]];
      }
      return newGroups;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 sticky top-0 h-screen overflow-y-auto flex flex-col">
        {/* Logo & Settings */}
        <div className="border-b border-slate-200">
          <div className="flex items-center gap-3 p-6">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-sm">
                <Hammer className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900 tracking-tight">
                Encore Woodworks
              </span>
            </Link>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav Groups */}
        <nav className="p-4 space-y-4 flex-1">
          {Object.entries(navGroups).map(([groupKey, group]) => (
            <div key={groupKey}>
              <button
                onClick={() => toggleGroup(groupKey)}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all group"
              >
                <ChevronDown
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-transform",
                    !expandedGroups[groupKey] && "-rotate-90"
                  )}
                />
                <span className="flex-1 text-left">{group.name}</span>
              </button>

              {expandedGroups[groupKey] && (
                <div className="space-y-1 mt-2 ml-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        currentPageName === item.page
                          ? "bg-amber-50 text-amber-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Page Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Board Groups Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(navGroups).map(([groupKey, group]) => (
              <div key={groupKey} className="border rounded-lg p-4 space-y-3">
                {editingGroupKey === groupKey ? (
                  <div className="flex gap-2">
                    <Input
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      placeholder="Group name"
                      autoFocus
                    />
                    <Button
                      onClick={saveGroupName}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">{group.name}</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditGroup(groupKey)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteGroup(groupKey)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {group.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="text-sm flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded border border-slate-200"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0 text-slate-600" />
                      {editingBoardGroupKey === groupKey && editingBoardKey === itemIndex ? (
                        <div className="flex gap-2 flex-1">
                          <Input
                            value={editingBoardName}
                            onChange={(e) => setEditingBoardName(e.target.value)}
                            placeholder="Board name"
                            autoFocus
                            className="h-7 text-xs flex-1"
                          />
                          <Button
                            onClick={saveBoardName}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-slate-900 font-medium">{item.name}</span>
                          <Select
                            value={groupKey}
                            onValueChange={(newGroupKey) =>
                              moveBoard(groupKey, itemIndex, newGroupKey)
                            }
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(navGroups).map(([key]) => (
                                <SelectItem key={key} value={key}>
                                  {navGroups[key].name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditBoard(groupKey, itemIndex)}
                            className="h-7 px-2 text-xs"
                          >
                            Rename
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reorderBoard(groupKey, itemIndex, "up")}
                            disabled={itemIndex === 0}
                            className="h-7 w-7 p-0"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reorderBoard(groupKey, itemIndex, "down")}
                            disabled={itemIndex === group.items.length - 1}
                            className="h-7 w-7 p-0"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}