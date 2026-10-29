/**
 * Isometric room-corner glyph used as the "Room Info" action on production cards.
 * Stroke is currentColor so it inherits the surrounding button colour.
 */
export default function RoomInfoIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M24 8 L37.86 16 L37.86 32 L24 40 L10.14 32 L10.14 16 Z" />
      <path d="M24 8 L24 24" strokeDasharray="2 2.6" />
      <path d="M24 24 L10.14 32" strokeDasharray="2 2.6" />
      <path d="M24 24 L37.86 32" strokeDasharray="2 2.6" />
      <path d="M19.84 14.4 L14.99 17.2 L14.99 22 L19.84 19.2 Z" />
      <path d="M28.85 18 L33.7 20.8 L33.7 28.8 L28.85 26 Z" />
    </svg>
  );
}