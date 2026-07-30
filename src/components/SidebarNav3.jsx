import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Home, Factory, Users, GraduationCap, BarChart3,
  ChevronRight, X,
} from "lucide-react";

const GROUP_ICONS = {
  dashboard: LayoutDashboard,
  admin: BarChart3,
  projects: Home,
  operations: Factory,
  team: Users,
  lean: GraduationCap,
};

const ALWAYS_ALLOWED = new Set([
  "AccountSettings", "PrivacyPolicy", "MyAssignments", "Trainings", "TimeSheet",
]);

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png";

export default function SidebarNav3({
  navGroups,
  currentPageName,
  currentUser,
  allowedPages,
  onExpand,
}) {
  const [openGroup, setOpenGroup] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpenGroup(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const buildGroups = (keys) =>
    keys
      .map((key) => {
        const group = navGroups[key];
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

  const mainKeys = ["dashboard", "projects", "operations", "team", "lean"];
  const mainGroups = buildGroups(mainKeys);
  const adminGroups = buildGroups(["admin"]);
  const allGroups = [...mainGroups, ...adminGroups];

  const activeGroup = allGroups.find((g) =>
    g.items.some((it) => it.page === currentPageName)
  )?.key;
  const openData = allGroups.find((g) => g.key === openGroup);

  const handleGroupClick = (key) =>
    setOpenGroup((prev) => (prev === key ? null : key));

  return (
    <div className="encore-sn3">
      <style>{`
        .encore-sn3{
          --sn3n-surface:#9ca3af;
          --sn3n-surface-2:#8d929b;
          --sn3n-light:rgba(255,255,255,.5);
          --sn3n-dark:rgba(45,55,72,.32);
          --sn3n-icon:#1e293b;
          --sn3n-text:#334155;
          --sn3n-active-1:#9c8470;
          --sn3n-active-2:#765f4d;
          --sn3n-active-ink:#ffffff;
          --sn3n-active-glow:rgba(138,117,96,.4);
          --sn3n-dark-btn:#3b3f45;
          --sn3n-dark-btn-2:#2f333a;
          --sn3n-dark-ink:#eef0f3;
          --sn3n-btn:42px;
          position:relative; display:block;
          font-family:inherit;
          min-height:100%;
          isolation:isolate;
        }
        .encore-sn3 .sn3n-stage{
          position:relative; z-index:1;
          min-height:100%;
          display:flex; align-items:center; justify-content:flex-start;
          padding:16px 10px;
        }
        .encore-sn3 .sn3n-rail{
          display:flex; flex-direction:row; align-items:stretch;
          background:var(--sn3n-surface);
          border-radius:26px;
          overflow:hidden;
          box-shadow:0 10px 24px rgba(60,70,90,.22), 0 2px 6px rgba(60,70,90,.12), inset 0 1px 0 rgba(255,255,255,.5);
          transition:border-radius .38s cubic-bezier(.6,.02,.1,1);
          margin:auto 0;
        }
        .encore-sn3 .sn3n-bar{
          flex:0 0 auto;
          display:flex; flex-direction:column; align-items:center; gap:8px; padding:10px 9px;
        }
        .encore-sn3 .sn3n-divider{
          width:26px; height:3px; margin:6px 0; border-radius:3px;
          background:var(--sn3n-surface);
          box-shadow:inset 1px 1px 2px var(--sn3n-dark), inset -1px -1px 2px var(--sn3n-light);
        }
        .encore-sn3 .sn3n-item{ position:relative; }
        .encore-sn3 .sn3n-btn{
          appearance:none; border:0; margin:0; padding:0;
          width:var(--sn3n-btn); height:var(--sn3n-btn); border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          background:linear-gradient(145deg,var(--sn3n-surface),var(--sn3n-surface-2));
          color:var(--sn3n-icon); cursor:pointer; outline:none;
          box-shadow:-3px -3px 6px var(--sn3n-light), 3px 3px 6px var(--sn3n-dark);
          transition:box-shadow .22s ease, color .22s ease, background .22s ease;
        }
        .encore-sn3 .sn3n-btn:hover,.encore-sn3 .sn3n-btn:focus-visible{
          box-shadow:inset 2px 2px 5px var(--sn3n-dark), inset -2px -2px 5px var(--sn3n-light);
        }
        .encore-sn3 .sn3n-btn:focus-visible{
          box-shadow:0 0 0 3px var(--sn3n-active-glow), inset 2px 2px 5px var(--sn3n-dark), inset -2px -2px 5px var(--sn3n-light);
        }
        .encore-sn3 .sn3n-icon-lucide{ width:18px; height:18px; }
        .encore-sn3 .sn3n-btn[aria-current="page"]{
          color:var(--sn3n-active-ink);
          background:linear-gradient(145deg,var(--sn3n-active-1),var(--sn3n-active-2));
          box-shadow:inset 2px 2px 5px rgba(80,64,50,.5), inset -2px -2px 5px rgba(255,255,255,.3), 0 0 12px var(--sn3n-active-glow);
        }
        .encore-sn3 .sn3n-brand-seat{
          width:var(--sn3n-btn); height:var(--sn3n-btn); border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          box-shadow:inset 2px 2px 4px var(--sn3n-dark), inset -2px -2px 4px var(--sn3n-light);
        }
        .encore-sn3 .sn3n-brand-btn{
          width:78%; height:78%; border-radius:50%; border:0; padding:0;
          display:flex; align-items:center; justify-content:center; overflow:hidden;
          background:radial-gradient(120% 120% at 35% 30%,var(--sn3n-dark-btn),var(--sn3n-dark-btn-2));
          cursor:pointer;
          box-shadow:-2px -2px 4px rgba(255,255,255,.5), 2px 2px 5px rgba(60,70,90,.5);
          transition:box-shadow .2s ease;
        }
        .encore-sn3 .sn3n-brand-btn:hover{
          box-shadow:inset 1px 1px 3px rgba(0,0,0,.4), inset -1px -1px 3px rgba(255,255,255,.15);
        }
        .encore-sn3 .sn3n-logo-img{ width:66%; height:66%; object-fit:contain; border-radius:50%; }
        .encore-sn3 .sn3n-panel{ flex:0 0 auto; width:0; overflow:hidden; transition:width .38s cubic-bezier(.6,.02,.1,1); }
        .encore-sn3 .sn3n-rail[data-open="true"] .sn3n-panel{ width:214px; }
        .encore-sn3 .sn3n-panel-inner{
          width:214px; box-sizing:border-box; padding:14px 14px 16px 12px;
          display:flex; flex-direction:column; gap:10px;
          box-shadow:inset 5px 0 8px -6px var(--sn3n-dark);
          opacity:0; transform:translateX(6px);
          transition:opacity .28s ease .06s, transform .3s ease .06s;
        }
        .encore-sn3 .sn3n-rail[data-open="true"] .sn3n-panel-inner{ opacity:1; transform:none; }
        .encore-sn3 .sn3n-panel-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .encore-sn3 .sn3n-panel-title{ font-size:14px; font-weight:600; color:#1e293b; letter-spacing:.01em; white-space:nowrap; }
        .encore-sn3 .sn3n-close{
          flex:0 0 auto; width:30px; height:30px; border-radius:50%; border:0; padding:0;
          display:flex; align-items:center; justify-content:center;
          background:radial-gradient(120% 120% at 35% 30%,var(--sn3n-dark-btn),var(--sn3n-dark-btn-2));
          color:var(--sn3n-dark-ink); cursor:pointer;
          box-shadow:-2px -2px 4px rgba(255,255,255,.5), 2px 2px 5px rgba(60,70,90,.5);
          transition:box-shadow .2s ease;
        }
        .encore-sn3 .sn3n-close:hover,.encore-sn3 .sn3n-close:focus-visible{
          box-shadow:inset 1px 1px 3px rgba(0,0,0,.4), inset -1px -1px 3px rgba(255,255,255,.15); outline:none;
        }
        .encore-sn3 .sn3n-sub{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
        .encore-sn3 .sn3n-sub-btn{
          width:100%; text-align:left; border:0; cursor:pointer; text-decoration:none;
          padding:9px 13px; border-radius:12px; display:block;
          font:inherit; font-size:13px; font-weight:500; color:var(--sn3n-text);
          background:linear-gradient(145deg,var(--sn3n-surface),var(--sn3n-surface-2));
          box-shadow:-3px -3px 6px var(--sn3n-light), 3px 3px 6px var(--sn3n-dark);
          transition:box-shadow .2s ease, color .2s ease, background .2s ease;
        }
        .encore-sn3 .sn3n-sub-btn:hover,.encore-sn3 .sn3n-sub-btn:focus-visible{
          box-shadow:inset 2px 2px 5px var(--sn3n-dark), inset -2px -2px 5px var(--sn3n-light); outline:none;
        }
        .encore-sn3 .sn3n-sub-btn[aria-current="page"]{
          color:var(--sn3n-active-ink);
          background:linear-gradient(145deg,var(--sn3n-active-1),var(--sn3n-active-2));
          box-shadow:inset 2px 2px 5px rgba(80,64,50,.5), inset -2px -2px 5px rgba(255,255,255,.3);
        }
        @media (prefers-reduced-motion: reduce){
          .encore-sn3 .sn3n-rail,.encore-sn3 .sn3n-panel,.encore-sn3 .sn3n-panel-inner,.encore-sn3 .sn3n-btn{ transition:none; }
        }
      `}</style>

      <div className="sn3n-stage">
        <nav className="sn3n-rail" data-open={!!openData} aria-label="Primary">
          <div className="sn3n-bar">
            {/* Brand */}
            <div className="sn3n-item">
              <span className="sn3n-brand-seat">
                <button
                  className="sn3n-brand-btn"
                  type="button"
                  aria-label="Encore Woodworks — expand sidebar"
                  title="Expand sidebar"
                  onClick={onExpand}
                >
                  <img src={LOGO_URL} alt="Encore Woodworks" className="sn3n-logo-img" />
                </button>
              </span>
            </div>

            <div className="sn3n-divider" role="separator" />

            {/* Workspace groups */}
            {mainGroups.map((g) => (
              <div className="sn3n-item" key={g.key}>
                <button
                  className="sn3n-btn"
                  type="button"
                  aria-current={activeGroup === g.key ? "page" : undefined}
                  aria-haspopup="true"
                  aria-expanded={openGroup === g.key}
                  aria-label={g.name}
                  title={g.name}
                  onClick={() => handleGroupClick(g.key)}
                >
                  <g.Icon className="sn3n-icon-lucide" />
                </button>
              </div>
            ))}

            {adminGroups.length > 0 && <div className="sn3n-divider" role="separator" />}

            {/* Admin groups */}
            {adminGroups.map((g) => (
              <div className="sn3n-item" key={g.key}>
                <button
                  className="sn3n-btn"
                  type="button"
                  aria-current={activeGroup === g.key ? "page" : undefined}
                  aria-haspopup="true"
                  aria-expanded={openGroup === g.key}
                  aria-label={g.name}
                  title={g.name}
                  onClick={() => handleGroupClick(g.key)}
                >
                  <g.Icon className="sn3n-icon-lucide" />
                </button>
              </div>
            ))}

            <div className="sn3n-divider" role="separator" />

            {/* Expand to full sidebar */}
            <div className="sn3n-item">
              <button
                className="sn3n-btn"
                type="button"
                aria-label="Expand sidebar"
                title="Expand sidebar"
                onClick={onExpand}
              >
                <ChevronRight className="sn3n-icon-lucide" />
              </button>
            </div>
          </div>

          {/* Morph panel */}
          <div className="sn3n-panel">
            <div className="sn3n-panel-inner">
              <div className="sn3n-panel-head">
                <span className="sn3n-panel-title">{openData?.name || ""}</span>
                <button
                  className="sn3n-close"
                  type="button"
                  aria-label="Close submenu"
                  onClick={() => setOpenGroup(null)}
                >
                  <X className="sn3n-icon-lucide" />
                </button>
              </div>
              <ul className="sn3n-sub">
                {(openData?.items || []).map((it) => (
                  <li key={it.page}>
                    <Link
                      to={createPageUrl(it.page)}
                      className="sn3n-sub-btn"
                      aria-current={currentPageName === it.page ? "page" : undefined}
                    >
                      {it.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}