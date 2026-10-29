import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Home, Users, GraduationCap, BookOpen, BarChart3,
  ChevronDown, Pin, PinOff, Settings, UserCircle, Play, Square, ArrowLeftRight, Columns2,
} from "lucide-react";
import ProductionIcon from "@/components/icons/ProductionIcon";

const GROUP_ICONS = {
  dashboard: LayoutDashboard,
  admin: BarChart3,
  projects: Home,
  operations: ProductionIcon,
  team: Users,
  lean: GraduationCap,
  education: BookOpen,
};

const ALWAYS_ALLOWED = new Set([
  "AccountSettings", "PrivacyPolicy", "MyAssignments", "Trainings", "TimeSheet", "MyProfile",
]);

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png";

/**
 * Horizontal page tabs across the top of the workspace.
 * Pinned pages are always visible; each group opens a small flyout.
 */
export default function TopPageTabs({
  navGroups,
  currentPageName,
  currentUser,
  allowedPages,
  badges = {},
  pinnedItems = [],
  pinnedPages = [],
  onTogglePin,
  pendingTaskCount = 0,
  clockInTime,
  elapsedTime,
  onClockIn,
  onClockOut,
  onSwitchJob,
  onOpenSettings,
  splitEnabled = false,
  onToggleSplit,
}) {
  const [openGroup, setOpenGroup] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenGroup(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpenGroup(null); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => { setOpenGroup(null); }, [currentPageName]);

  const isPinned = (page) => pinnedPages.includes(page);

  const buildGroups = (keys) =>
    keys
      .map((key) => {
        const group = navGroups?.[key];
        if (!group) return null;
        if (key === "admin" && currentUser?.role !== "admin") return null;
        if (!currentUser) return null;
        const visible =
          currentUser.role === "admin"
            ? group.items
            : group.items.filter(
                (it) => allowedPages?.has(it.page) || ALWAYS_ALLOWED.has(it.page)
              );
        if (visible.length === 0) return null;
        return { key, name: group.name, Icon: GROUP_ICONS[key] || LayoutDashboard, items: visible };
      })
      .filter(Boolean);

  const groups = [
    ...buildGroups(["dashboard", "projects", "operations", "team", "lean", "education"]),
    ...buildGroups(["admin"]),
  ];

  const pinnedVisible = currentUser
    ? pinnedItems.filter(
        (it) =>
          currentUser.role === "admin" ||
          allowedPages?.has(it.page) ||
          ALWAYS_ALLOWED.has(it.page)
      )
    : [];

  const activeGroup = groups.find((g) => g.items.some((it) => it.page === currentPageName))?.key;

  return (
    <header className="encore-tpt hidden sm:flex items-center shrink-0" ref={navRef}>
      <style>{`
        .encore-tpt{
          --tpt-light:rgba(255,255,255,.45);
          --tpt-dark:rgba(45,55,72,.28);
          --tpt-active-1:#9c8470;
          --tpt-active-2:#765f4d;
          position:relative; z-index:45;
          gap:6px; padding:0 12px; height:56px;
          background:linear-gradient(180deg,#a9aeb5,#9ca3af);
          border-bottom:1px solid rgba(45,55,72,.3);
          box-shadow:0 6px 16px -10px rgba(30,41,59,.55);
          font-family:inherit;
        }
        .encore-tpt .tpt-scroll{
          display:flex; align-items:center; gap:6px; flex:1; min-width:0;
          overflow:visible;
        }
        .encore-tpt .tpt-brand{
          display:flex; align-items:center; justify-content:center;
          width:38px; height:38px; border-radius:50%; flex:0 0 auto;
          background:radial-gradient(120% 120% at 35% 30%,#3b3f45,#2f333a);
          box-shadow:-2px -2px 4px rgba(255,255,255,.45), 2px 2px 5px rgba(60,70,90,.5);
          margin-right:4px;
        }
        .encore-tpt .tpt-brand img{ width:24px; height:24px; object-fit:contain; border-radius:50%; }
        .encore-tpt .tpt-divider{
          width:2px; height:26px; border-radius:2px; flex:0 0 auto; margin:0 4px;
          background:#9ca3af;
          box-shadow:inset 1px 1px 2px var(--tpt-dark), inset -1px -1px 2px var(--tpt-light);
        }
        .encore-tpt .tpt-tab{
          position:relative;
          display:flex; align-items:center; gap:7px;
          height:34px; padding:0 12px; border:0; border-radius:11px;
          background:linear-gradient(145deg,#a7acb4,#949aa3);
          color:#1e293b; font:inherit; font-size:13px; font-weight:600;
          letter-spacing:.01em; white-space:nowrap; text-decoration:none; cursor:pointer;
          box-shadow:-2px -2px 4px var(--tpt-light), 2px 2px 5px var(--tpt-dark);
          transition:box-shadow .2s ease, color .2s ease, background .2s ease;
        }
        .encore-tpt .tpt-tab:hover,.encore-tpt .tpt-tab:focus-visible{
          box-shadow:inset 2px 2px 4px var(--tpt-dark), inset -2px -2px 4px var(--tpt-light);
          outline:none;
        }
        .encore-tpt .tpt-tab[data-active="true"]{
          color:#fff;
          background:linear-gradient(145deg,var(--tpt-active-1),var(--tpt-active-2));
          box-shadow:inset 2px 2px 4px rgba(60,48,38,.5), inset -2px -2px 4px rgba(255,255,255,.25), 0 0 10px rgba(138,117,96,.4);
        }
        .encore-tpt .tpt-tab svg{ width:15px; height:15px; flex:0 0 auto; }
        /* Icon-only group tabs: fixed, even footprint so nothing overlaps at iPad widths */
        .encore-tpt .tpt-tab-icon{
          justify-content:center; gap:3px;
          min-width:48px; padding:0 9px;
        }
        .encore-tpt .tpt-caret{ width:10px !important; height:10px !important; opacity:.55; transition:transform .2s ease; }
        .encore-tpt .tpt-tab[data-open="true"] .tpt-caret{ transform:rotate(180deg); }
        /* Hover / keyboard tooltip carrying the tab name */
        .encore-tpt .tpt-tab[data-label]::before{
          content:attr(data-label);
          position:absolute; top:calc(100% + 7px); left:50%;
          transform:translate(-50%,-3px);
          padding:4px 8px; border-radius:7px; white-space:nowrap;
          background:#1e293b; color:#f8fafc;
          font-size:11px; font-weight:600; letter-spacing:.01em;
          box-shadow:0 4px 12px -4px rgba(15,23,42,.5);
          opacity:0; pointer-events:none; z-index:90;
          transition:opacity .14s ease, transform .14s ease;
        }
        .encore-tpt .tpt-tab[data-label]:hover::before,
        .encore-tpt .tpt-tab[data-label]:focus-visible::before{
          opacity:1; transform:translate(-50%,0);
        }
        .encore-tpt .tpt-tab[data-open="true"]::before{ opacity:0; }
        .encore-tpt .tpt-tab-pinned::after{
          content:""; position:absolute; bottom:4px; right:5px;
          width:5px; height:5px; border-radius:50%; background:#6b5645;
        }
        .encore-tpt .tpt-tab-pinned[data-active="true"]::after{ background:#f6efe6; }
        .encore-tpt .tpt-badge{
          position:absolute; top:-4px; right:-4px;
          min-width:17px; height:17px; padding:0 4px; box-sizing:border-box;
          border-radius:9px; background:#dc2626; color:#fff;
          font-size:10px; font-weight:700; line-height:17px; text-align:center;
          box-shadow:0 1px 3px rgba(0,0,0,.35);
        }
        .encore-tpt .tpt-group{ position:relative; flex:0 0 auto; }
        .encore-tpt .tpt-pop{
          position:absolute; top:calc(100% + 10px); left:0; z-index:80;
          width:252px; padding:8px; border-radius:14px;
          background:linear-gradient(160deg,#a9aeb5,#98a0a8);
          box-shadow:0 20px 38px -14px rgba(20,28,40,.6), -2px -2px 5px rgba(255,255,255,.4), 2px 2px 6px var(--tpt-dark);
          animation:tpt-pop-in .15s ease-out;
        }
        .encore-tpt .tpt-pop-title{
          padding:4px 8px 8px; font-size:10px; font-weight:700; letter-spacing:.09em;
          text-transform:uppercase; color:#475569;
        }
        .encore-tpt .tpt-pop-row{ display:flex; align-items:center; gap:4px; }
        .encore-tpt .tpt-pop-link{
          flex:1; display:flex; align-items:center; gap:9px;
          padding:7px 10px; border-radius:10px;
          color:#1e293b; font:inherit; font-size:13px; font-weight:500;
          text-decoration:none;
          box-shadow:-2px -2px 4px var(--tpt-light), 2px 2px 5px var(--tpt-dark);
          background:linear-gradient(145deg,#a7acb4,#949aa3);
          transition:box-shadow .18s ease, background .18s ease, color .18s ease;
        }
        .encore-tpt .tpt-pop-link svg{ width:15px; height:15px; flex:0 0 auto; opacity:.8; }
        .encore-tpt .tpt-pop-link:hover,.encore-tpt .tpt-pop-link:focus-visible{
          box-shadow:inset 2px 2px 4px var(--tpt-dark), inset -2px -2px 4px var(--tpt-light);
          outline:none;
        }
        .encore-tpt .tpt-pop-link[data-active="true"]{
          color:#fff;
          background:linear-gradient(145deg,var(--tpt-active-1),var(--tpt-active-2));
          box-shadow:inset 2px 2px 4px rgba(60,48,38,.5), inset -2px -2px 4px rgba(255,255,255,.25);
        }
        .encore-tpt .tpt-pop-link[data-active="true"] svg{ opacity:1; }
        .encore-tpt .tpt-count{
          margin-left:auto; min-width:17px; height:17px; padding:0 4px; box-sizing:border-box;
          border-radius:9px; background:#dc2626; color:#fff;
          font-size:10px; font-weight:700; line-height:17px; text-align:center;
        }
        .encore-tpt .tpt-pin{
          flex:0 0 auto; width:26px; height:26px; border:0; padding:0; border-radius:50%;
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          background:linear-gradient(145deg,#a7acb4,#949aa3); color:#334155;
          box-shadow:-2px -2px 3px var(--tpt-light), 2px 2px 4px var(--tpt-dark);
          transition:box-shadow .18s ease, color .18s ease;
        }
        .encore-tpt .tpt-pin[data-pinned="true"]{ color:#6b5645; }
        .encore-tpt .tpt-pin:hover,.encore-tpt .tpt-pin:focus-visible{
          box-shadow:inset 1px 1px 3px var(--tpt-dark), inset -1px -1px 3px var(--tpt-light); outline:none;
        }
        .encore-tpt .tpt-pin svg{ width:13px; height:13px; }
        .encore-tpt .tpt-right{
          display:flex; align-items:center; gap:6px; flex:0 0 auto; margin-left:auto;
        }
        .encore-tpt .tpt-icon-btn{
          width:34px; height:34px; border:0; padding:0; border-radius:10px;
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          background:linear-gradient(145deg,#a7acb4,#949aa3); color:#1e293b;
          box-shadow:-2px -2px 4px var(--tpt-light), 2px 2px 5px var(--tpt-dark);
          transition:box-shadow .18s ease, color .18s ease;
        }
        .encore-tpt .tpt-icon-btn:hover,.encore-tpt .tpt-icon-btn:focus-visible{
          box-shadow:inset 2px 2px 4px var(--tpt-dark), inset -2px -2px 4px var(--tpt-light); outline:none;
        }
        .encore-tpt .tpt-icon-btn svg{ width:17px; height:17px; }
        .encore-tpt .tpt-icon-btn[data-on="true"]{
          color:#fff;
          background:linear-gradient(145deg,var(--tpt-active-1),var(--tpt-active-2));
          box-shadow:inset 1px 1px 3px rgba(60,48,38,.45), inset -1px -1px 3px rgba(255,255,255,.22);
        }
        .encore-tpt .tpt-clock-in{ color:#fff; background:linear-gradient(145deg,#3f7a4a,#2f6339); }
        .encore-tpt .tpt-clock-out{ color:#fff; background:linear-gradient(145deg,#a33a3a,#8a2d2d); }
        .encore-tpt .tpt-timer{
          font-size:11px; font-weight:700; font-variant-numeric:tabular-nums;
          padding:1px 5px; border-radius:6px; background:rgba(0,0,0,.22);
        }
        .encore-tpt .tpt-who{
          max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
          font-size:12px; font-weight:600; color:#334155;
        }
        @keyframes tpt-pop-in{ from{ opacity:0; transform:translateY(-5px) } to{ opacity:1; transform:none } }
        @media (prefers-reduced-motion: reduce){
          .encore-tpt .tpt-pop{ animation:none; }
          .encore-tpt .tpt-tab,.encore-tpt .tpt-icon-btn,.encore-tpt .tpt-pin{ transition:none; }
        }
      `}</style>

      <Link to={createPageUrl("Dashboard")} className="tpt-brand" aria-label="Encore Woodworks — Dashboard">
        <img src={LOGO_URL} alt="Encore Woodworks" />
      </Link>

      <div className="tpt-scroll">
        {/* Pinned pages */}
        {pinnedVisible.map((it) => (
          <Link
            key={`pin-${it.page}`}
            to={createPageUrl(it.page)}
            className="tpt-tab tpt-tab-pinned"
            data-active={currentPageName === it.page}
            aria-current={currentPageName === it.page ? "page" : undefined}
            title={`${it.name} — pinned`}
          >
            <it.Icon />
            <span className="hidden xl:inline">{it.name}</span>
          </Link>
        ))}

        {pinnedVisible.length > 0 && <div className="tpt-divider" role="separator" />}

        {/* Groups */}
        {groups.map((g) => (
          <div className="tpt-group" key={g.key}>
            <button
              type="button"
              className="tpt-tab tpt-tab-icon"
              data-active={activeGroup === g.key}
              data-open={openGroup === g.key}
              data-label={g.name}
              aria-haspopup="true"
              aria-expanded={openGroup === g.key}
              aria-label={g.name}
              title={g.name}
              onClick={() => setOpenGroup((prev) => (prev === g.key ? null : g.key))}
            >
              <g.Icon />
              <ChevronDown className="tpt-caret" />
              {badges[g.key] > 0 && (
                <span className="tpt-badge">{badges[g.key] > 9 ? "9+" : badges[g.key]}</span>
              )}
            </button>

            {openGroup === g.key && (
              <div className="tpt-pop" role="menu">
                <p className="tpt-pop-title">{g.name}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {g.items.map((it) => {
                    const Icon = it.icon || g.Icon;
                    return (
                      <div className="tpt-pop-row" key={it.page}>
                        <Link
                          to={createPageUrl(it.page)}
                          className="tpt-pop-link"
                          data-active={currentPageName === it.page}
                          onClick={() => setOpenGroup(null)}
                        >
                          <Icon />
                          <span>{it.name}</span>
                          {it.page === "MyAssignments" && pendingTaskCount > 0 && (
                            <span className="tpt-count">{pendingTaskCount > 9 ? "9+" : pendingTaskCount}</span>
                          )}
                        </Link>
                        {onTogglePin && (
                          <button
                            type="button"
                            className="tpt-pin"
                            data-pinned={isPinned(it.page)}
                            title={isPinned(it.page) ? "Unpin from tabs" : "Pin to tabs"}
                            aria-label={isPinned(it.page) ? `Unpin ${it.name}` : `Pin ${it.name}`}
                            onClick={() => onTogglePin(it.page)}
                          >
                            {isPinned(it.page) ? <PinOff /> : <Pin />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="tpt-right">
        {currentUser?.role === "user" && (
          clockInTime ? (
            <>
              <button type="button" className="tpt-tab tpt-clock-out" onClick={onClockOut} title="Clock out">
                <Square />
                <span>Out</span>
                <span className="tpt-timer">{elapsedTime}</span>
              </button>
              <button type="button" className="tpt-icon-btn" onClick={onSwitchJob} title="Switch job" aria-label="Switch job">
                <ArrowLeftRight />
              </button>
            </>
          ) : (
            <button type="button" className="tpt-tab tpt-clock-in" onClick={onClockIn} title="Clock in">
              <Play />
              <span>Clock In</span>
            </button>
          )
        )}
        {onToggleSplit && (
          <button
            type="button"
            className="tpt-icon-btn"
            data-on={splitEnabled}
            onClick={onToggleSplit}
            title={splitEnabled ? "Exit split screen" : "Split screen — work two pages side by side"}
            aria-label="Split screen"
            aria-pressed={splitEnabled}
          >
            <Columns2 />
          </button>
        )}
        {currentUser?.full_name && <span className="tpt-who hidden xl:inline">{currentUser.full_name}</span>}
        <Link to={createPageUrl("AccountSettings")} className="tpt-icon-btn" title="Account" aria-label="Account">
          <UserCircle />
        </Link>
        {currentUser?.role === "admin" && (
          <button type="button" className="tpt-icon-btn" onClick={onOpenSettings} title="Settings" aria-label="Settings">
            <Settings />
          </button>
        )}
      </div>
    </header>
  );
}