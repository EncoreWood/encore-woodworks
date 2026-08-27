// Red count bubble used for unread client-activity notifications on project
// cards and detail-view tabs. Renders nothing when count <= 0.
export default function UnreadBadge({ count, className = "", size = "md" }) {
  const n = Math.max(0, Number(count) || 0);
  if (n <= 0) return null;
  const sizing = size === "sm"
    ? "min-w-[16px] h-4 px-1 text-[10px]"
    : "min-w-[20px] h-5 px-1.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center justify-center font-bold rounded-full bg-red-500 text-white leading-none ${sizing} ${className}`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}