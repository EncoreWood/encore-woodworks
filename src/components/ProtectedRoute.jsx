import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

// Pages always accessible regardless of allowed_pages
const ALWAYS_ALLOWED = new Set(["AccountSettings", "PrivacyPolicy"]);

// Default pages for users with no employee record
const DEFAULT_ALLOWED = new Set([
  "ShopProduction", "Calendar", "Notepad", "ChatBoard",
  "MorningMeeting", "PickupList", "OrdersBoard"
]);

// Module-level cache so we only fetch once per session
let _cache = null;

async function getPermissions() {
  if (_cache) return _cache;
  const user = await base44.auth.me();
  if (user?.role === "admin") {
    _cache = { isAdmin: true, allowedPages: null };
    return _cache;
  }
  const emps = await base44.entities.Employee.list();
  const emp = emps.find(e => e.user_email === user?.email || e.email === user?.email);
  const allowedPages = emp ? new Set(emp.allowed_pages || []) : DEFAULT_ALLOWED;
  _cache = { isAdmin: false, allowedPages };
  return _cache;
}

export function clearPermissionsCache() {
  _cache = null;
}

export default function ProtectedRoute({ children, pageName }) {
  const [status, setStatus] = useState(null); // null = loading, true = allowed, string = redirect path

  useEffect(() => {
    let cancelled = false;
    if (ALWAYS_ALLOWED.has(pageName)) {
      setStatus(true);
      return;
    }
    getPermissions().then(({ isAdmin, allowedPages }) => {
      if (cancelled) return;
      if (isAdmin) { setStatus(true); return; }
      if (allowedPages.has(pageName)) {
        setStatus(true);
      } else {
        const first = [...allowedPages][0] || "AccountSettings";
        setStatus(createPageUrl(first));
      }
    });
    return () => { cancelled = true; };
  }, [pageName]);

  if (status === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#d1d5db" }}>
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (status !== true) {
    return <Navigate to={status} replace />;
  }
  return children;
}