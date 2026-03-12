import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Hammer, Kanban as KanbanIcon, Calendar, Factory, Coffee, Users, MessageSquare, ChevronDown, ChevronLeft, Settings, Trash2, ArrowUp, ArrowDown, Play, Square, Package, Clipboard, ShoppingCart, FileText, Wrench, Truck, Home, Building2, PieChart, BarChart3, FileText as FileTextIcon, Archive, StickyNote, UserCircle } from "lucide-react";
import MobileTabBar from "@/components/MobileTabBar";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Layout({ children, currentPageName }) {
  const [expandedGroups, setExpandedGroups] = useState({
    dashboard: true,
    projects: true,
    operations: true,
    team: true
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [clockInTime, setClockInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [employees, setEmployees] = useState([]);

  const defaultNavGroups = {
    dashboard: {
      name: "Dashboard",
      items: [
        { name: "Dashboard", icon: LayoutDashboard, iconName: "LayoutDashboard", page: "Dashboard" },
      ]
    },
    projects: {
      name: "Projects",
      items: [
        { name: "Projects board", icon: Home, iconName: "Home", page: "Kanban" },
        { name: "Invoicing", icon: FileTextIcon, iconName: "FileText", page: "Invoicing" },
        { name: "Contacts Board", icon: Users, iconName: "Users", page: "ContactsBoard" },
        { name: "Presentations", icon: FileText, iconName: "FileText", page: "Presentations" },
        { name: "Project Orders", icon: ShoppingCart, iconName: "ShoppingCart", page: "OrdersBoard" },
        { name: "Pick Up List", icon: Clipboard, iconName: "Clipboard", page: "PickupList" },
        { name: "Project Estimates", icon: FileText, iconName: "FileText", page: "PlanBidding" },
      ]
    },
    operations: {
      name: "Operations",
      items: [
          { name: "Calendar", icon: Calendar, iconName: "Calendar", page: "Calendar" },
          { name: "Production", icon: Factory, iconName: "Factory", page: "ShopProduction" },
          { name: "Tools", icon: Wrench, iconName: "Wrench", page: "Tools" },
          { name: "Inventory", icon: Coffee, iconName: "Coffee", page: "Inventory" },
          { name: "Purchase Orders", icon: Package, iconName: "Package", page: "PurchaseOrders" },
          { name: "Suppliers", icon: Truck, iconName: "Truck", page: "Suppliers" },
          { name: "Encore Docs", icon: FileText, iconName: "FileText", page: "EncoreDocs" },
          { name: "SOPs", icon: FileText, iconName: "FileText", page: "SOPBoard" },
          { name: "Notepad", icon: StickyNote, iconName: "StickyNote", page: "Notepad" },
        ]
    },
    team: {
      name: "Team",
      items: [
        { name: "Morning Meeting", icon: Coffee, iconName: "Coffee", page: "MorningMeeting" },
        { name: "Team", icon: Users, iconName: "Users", page: "Team" },
        { name: "Time Sheet", icon: Coffee, iconName: "Coffee", page: "TimeSheet" },
        { name: "Chat", icon: MessageSquare, iconName: "MessageSquare", page: "ChatBoard" },
        { name: "Forms", icon: FileText, iconName: "FileText", page: "Forms" },
        { name: "Privacy Policy", icon: FileText, iconName: "FileText", page: "PrivacyPolicy" }
      ]
    }
  };

  const USER_ALLOWED_PAGES = new Set([
    "OrdersBoard", "PickupList", "Calendar", "ShopProduction", "Tools",
    "Inventory", "PurchaseOrders", "SOPBoard", "Notepad", "MorningMeeting",
    "Team", "ChatBoard", "PrivacyPolicy"
  ]);

  const iconMap = {
    KanbanIcon, LayoutDashboard, Calendar, Factory, Coffee, Users, MessageSquare,
    Package, Clipboard, ShoppingCart, FileText: FileTextIcon, Wrench, Truck, Home, Building2, 
    PieChart, BarChart3, Hammer, Archive, StickyNote
  };

  const loadNavGroups = () => {
    try {
      const saved = localStorage.getItem('navGroups');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Restore icon components from iconName
        Object.keys(parsed).forEach(groupKey => {
          parsed[groupKey].items = parsed[groupKey].items.map(item => ({
            ...item,
            icon: iconMap[item.iconName] || KanbanIcon
          }));
        });
        // Merge any missing default items back in
        Object.entries(defaultNavGroups).forEach(([groupKey, group]) => {
          if (parsed[groupKey]) {
            const existingPages = parsed[groupKey].items.map(i => i.page);
            group.items.forEach(defaultItem => {
              if (!existingPages.includes(defaultItem.page)) {
                parsed[groupKey].items.push(defaultItem);
              }
            });
          } else {
            // Add missing groups
            parsed[groupKey] = group;
          }
        });
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load nav groups:', error);
    }
    return defaultNavGroups;
  };

  const [navGroups, setNavGroups] = useState(loadNavGroups);

  // Force reset to defaults on mount
  useEffect(() => {
    const merged = JSON.parse(JSON.stringify(defaultNavGroups)); // Deep copy defaults
    
    // Restore all icon components
    Object.keys(merged).forEach(groupKey => {
      merged[groupKey].items = merged[groupKey].items.map(item => ({
        ...item,
        icon: iconMap[item.iconName] || KanbanIcon
      }));
    });

    setNavGroups(merged);
    localStorage.setItem('navGroups', JSON.stringify(merged));
  }, []);

  const [showSettings, setShowSettings] = useState(false);
  const [editingGroupKey, setEditingGroupKey] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingBoardKey, setEditingBoardKey] = useState(null);
  const [editingBoardGroupKey, setEditingBoardGroupKey] = useState(null);
  const [editingBoardName, setEditingBoardName] = useState("");
  const [editingBoardIcon, setEditingBoardIcon] = useState("KanbanIcon");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingBoardInGroup, setCreatingBoardInGroup] = useState(null);
  const [newBoardName, setNewBoardName] = useState("");

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
      setNavGroups(prev => {
        const updated = {
          ...prev,
          [editingGroupKey]: {
            ...prev[editingGroupKey],
            name: editingGroupName.trim()
          }
        };
        localStorage.setItem('navGroups', JSON.stringify(updated));
        return updated;
      });
      setEditingGroupKey(null);
      setEditingGroupName("");
    }
  };

  const deleteGroup = (groupKey) => {
    setNavGroups(prev => {
      const newGroups = { ...prev };
      delete newGroups[groupKey];
      localStorage.setItem('navGroups', JSON.stringify(newGroups));
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
    const currentIcon = navGroups[groupKey].items[itemIndex].iconName || "KanbanIcon";
    setEditingBoardIcon(currentIcon);
  };

  const saveBoardName = async () => {
    if (editingBoardGroupKey !== null && editingBoardKey !== null && editingBoardName.trim()) {
      const oldBoard = navGroups[editingBoardGroupKey].items[editingBoardKey];
      const oldPageName = oldBoard.page;
      const newPageName = editingBoardName.trim().replace(/\s+/g, "");

      // Update references if page name changed
      if (oldPageName !== newPageName) {
        try {
          const { data } = await base44.functions.invoke('updatePageReferences', {
            old_page_name: oldPageName,
            new_page_name: newPageName
          });
          
          if (data.updated_references > 0) {
            console.log(`Updated ${data.updated_references} references`);
          }
        } catch (error) {
          console.error('Failed to update references:', error);
        }
      }

      setNavGroups(prev => {
        const updated = {
          ...prev,
          [editingBoardGroupKey]: {
            ...prev[editingBoardGroupKey],
            items: prev[editingBoardGroupKey].items.map((item, idx) =>
              idx === editingBoardKey ? { 
                ...item, 
                name: editingBoardName.trim(),
                page: newPageName,
                icon: iconMap[editingBoardIcon],
                iconName: editingBoardIcon
              } : item
            )
          }
        };
        localStorage.setItem('navGroups', JSON.stringify(updated));
        return updated;
      });
      setEditingBoardKey(null);
      setEditingBoardGroupKey(null);
      setEditingBoardName("");
      setEditingBoardIcon("KanbanIcon");
    }
  };

  const moveBoard = (fromGroupKey, itemIndex, toGroupKey) => {
    if (fromGroupKey === toGroupKey) return;

    setNavGroups(prev => {
      const newGroups = { ...prev };
      const board = newGroups[fromGroupKey].items[itemIndex];
      newGroups[fromGroupKey].items.splice(itemIndex, 1);
      newGroups[toGroupKey].items.push(board);
      localStorage.setItem('navGroups', JSON.stringify(newGroups));
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
      localStorage.setItem('navGroups', JSON.stringify(newGroups));
      return newGroups;
    });
  };

  const createNewGroup = () => {
    if (newGroupName.trim()) {
      const groupKey = newGroupName.toLowerCase().replace(/\s+/g, "_");
      setNavGroups(prev => {
        const updated = {
          ...prev,
          [groupKey]: {
            name: newGroupName.trim(),
            items: []
          }
        };
        localStorage.setItem('navGroups', JSON.stringify(updated));
        return updated;
      });
      setExpandedGroups(prev => ({
        ...prev,
        [groupKey]: true
      }));
      setNewGroupName("");
      setCreatingGroup(false);
    }
  };

  const createNewBoard = (groupKey) => {
    if (newBoardName.trim()) {
      const pageName = newBoardName.trim().replace(/\s+/g, "");
      setNavGroups(prev => {
        const updated = {
          ...prev,
          [groupKey]: {
            ...prev[groupKey],
            items: [
              ...prev[groupKey].items,
              {
                name: newBoardName.trim(),
                icon: KanbanIcon,
                iconName: "KanbanIcon",
                page: pageName
              }
            ]
          }
        };
        localStorage.setItem('navGroups', JSON.stringify(updated));
        return updated;
      });
      setNewBoardName("");
      setCreatingBoardInGroup(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const emps = await base44.entities.Employee.list();
      setEmployees(emps);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!clockInTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const diff = now - clockInTime;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [clockInTime]);

  const handleClockIn = () => {
    setClockInTime(new Date());
  };

  const handleClockOut = async () => {
    if (!clockInTime || !currentUser) return;
    const employee = employees.find(e => e.user_email === currentUser.email);
    if (!employee) return;

    const now = new Date();
    const clockInStr = format(clockInTime, "HH:mm");
    const clockOutStr = format(now, "HH:mm");
    const [inH, inM] = clockInStr.split(":").map(Number);
    const [outH, outM] = clockOutStr.split(":").map(Number);
    const inMinutes = inH * 60 + inM;
    const outMinutes = outH * 60 + outM;
    const hours = ((outMinutes - inMinutes) / 60).toFixed(2);

    await base44.entities.TimeEntry.create({
      employee_id: employee.id,
      employee_name: employee.full_name,
      date: format(new Date(), "yyyy-MM-dd"),
      clock_in: clockInStr,
      clock_out: clockOutStr,
      hours_worked: parseFloat(hours),
      entry_type: "work",
      notes: ""
    });

    setClockInTime(null);
    setElapsedTime("00:00:00");
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#d1d5db" }}>
      {/* Sidebar — hidden on mobile */}
      <aside className="hidden sm:flex w-64 border-r border-slate-400 sticky top-0 h-screen overflow-y-auto flex-col shadow-2xl" style={{ backgroundColor: "#9ca3af" }}>
        {/* Logo & Settings */}
        <div className="border-b border-slate-400">
          <div className="flex items-center gap-3 p-6">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 flex-1">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" alt="Encore Woodworks" className="h-24 w-auto" />
            </Link>
          </div>

          {/* Clock In/Out - Users Only */}
          {currentUser?.role === "user" && (
            <div className="px-4 py-3 border-t border-slate-400">
              {clockInTime ? (
                <button
                  onClick={handleClockOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-sm font-semibold transition-all shadow-lg"
                >
                  <Square className="w-4 h-4" />
                  <span>Clock Out</span>
                  <span className="text-xs font-mono bg-red-700/50 px-2 py-1 rounded">
                    {elapsedTime}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleClockIn}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-all shadow-lg"
                >
                  <Play className="w-4 h-4" />
                  Clock In
                </button>
              )}
            </div>
          )}
        </div>

        {/* Nav Groups */}
        <nav className="p-4 space-y-4 flex-1">
          {Object.entries(navGroups).map(([groupKey, group]) => {
            const visibleItems = currentUser?.role === "admin"
              ? group.items
              : group.items.filter(item => USER_ALLOWED_PAGES.has(item.page));
            if (visibleItems.length === 0) return null;
            return (
            <div key={groupKey}>
              <button
                onClick={() => toggleGroup(groupKey)}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-amber-700/20 transition-all group"
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
                  {visibleItems.map((item) => (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        currentPageName === item.page
                          ? "text-white shadow-md"
                          : "text-slate-800 hover:text-slate-900"
                      )}
                      style={currentPageName === item.page ? { backgroundColor: "#8a7560" } : undefined}
                      onMouseEnter={e => { if (currentPageName !== item.page) e.currentTarget.style.backgroundColor = "rgba(180,150,100,0.25)"; }}
                      onMouseLeave={e => { if (currentPageName !== item.page) e.currentTarget.style.backgroundColor = ""; }}
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

        {/* Bottom Buttons */}
        <div className="p-4 border-t border-slate-400 space-y-2">
          <Link to={createPageUrl("AccountSettings")} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-slate-800 text-sm font-medium transition-all"
            style={{ backgroundColor: "rgba(180,150,100,0.2)" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(180,150,100,0.4)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "rgba(180,150,100,0.2)"}
          >
            <UserCircle className="w-4 h-4" />
            Account
          </Link>
          {currentUser?.role === "admin" && (
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-slate-800 text-sm font-medium transition-all"
              style={{ backgroundColor: "rgba(180,150,100,0.3)" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(180,150,100,0.5)"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "rgba(180,150,100,0.3)"}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          )}
        </div>
          </aside>

      {/* Mobile Header */}
      {(() => {
        const rootTabs = ["Dashboard", "Kanban", "ShopProduction", "ChatBoard"];
        const isRoot = rootTabs.includes(currentPageName);
        // Find display name from navGroups
        let displayName = currentPageName;
        Object.values(navGroups).forEach(group => {
          const found = group.items.find(i => i.page === currentPageName);
          if (found) displayName = found.name;
        });
        return (
          <div className="sm:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-2 px-4 h-12 border-b border-slate-400 shadow-sm" style={{ backgroundColor: "#9ca3af", paddingTop: "env(safe-area-inset-top)" }}>
            {!isRoot && (
              <button onClick={() => window.history.back()} className="flex items-center text-slate-800 font-medium text-sm">
                <ChevronLeft className="w-5 h-5" />Back
              </button>
            )}
            <span className={`font-semibold text-slate-900 text-base ${!isRoot ? "ml-2" : ""}`}>{displayName}</span>
          </div>
        );
      })()}

      {/* Page Content */}
      <main
        className="flex-1 overflow-auto"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="sm:hidden h-12" style={{ paddingTop: "env(safe-area-inset-top)" }} />
        {children}
        {/* Bottom spacer for mobile tab bar */}
        <div className="sm:hidden h-16" />
      </main>

      {/* Mobile Tab Bar */}
      <MobileTabBar currentPageName={currentPageName} />

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Board Groups Settings</DialogTitle>
              {!creatingGroup && (
                <Button
                  onClick={() => setCreatingGroup(true)}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  + New Group
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {creatingGroup && (
              <div className="border rounded-lg p-4 bg-amber-50">
                <div className="flex gap-2">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name (e.g., Archived, Admin)"
                    autoFocus
                  />
                  <Button
                    onClick={createNewGroup}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    disabled={!newGroupName.trim()}
                  >
                    Create
                  </Button>
                  <Button
                    onClick={() => {
                      setCreatingGroup(false);
                      setNewGroupName("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
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
                        onClick={() => setCreatingBoardInGroup(groupKey)}
                        className="text-amber-600"
                      >
                        + Board
                      </Button>
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

                {creatingBoardInGroup === groupKey && (
                  <div className="mb-3 border rounded-lg p-3 bg-amber-50">
                    <div className="flex gap-2">
                      <Input
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        placeholder="Board name"
                        autoFocus
                        className="h-8 text-sm"
                      />
                      <Button
                        onClick={() => createNewBoard(groupKey)}
                        size="sm"
                        className="h-8 bg-amber-600 hover:bg-amber-700"
                        disabled={!newBoardName.trim()}
                      >
                        Create
                      </Button>
                      <Button
                        onClick={() => {
                          setCreatingBoardInGroup(null);
                          setNewBoardName("");
                        }}
                        size="sm"
                        variant="outline"
                        className="h-8"
                      >
                        Cancel
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
                        <div className="flex flex-col gap-2 flex-1">
                          <Input
                            value={editingBoardName}
                            onChange={(e) => setEditingBoardName(e.target.value)}
                            placeholder="Board name"
                            autoFocus
                            className="h-7 text-xs"
                          />
                          <div className="flex gap-2 items-center">
                            <Select
                              value={editingBoardIcon}
                              onValueChange={setEditingBoardIcon}
                            >
                              <SelectTrigger className="h-7 text-xs flex-1">
                                <SelectValue placeholder="Icon" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.keys(iconMap).map((iconName) => {
                                  const Icon = iconMap[iconName];
                                  return (
                                    <SelectItem key={iconName} value={iconName}>
                                      <div className="flex items-center gap-2">
                                        <Icon className="w-3 h-3" />
                                        <span>{iconName.replace(/Icon$/, '')}</span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={saveBoardName}
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                            >
                              Save
                            </Button>
                          </div>
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