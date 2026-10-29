/**
 * Gear with rotating arrows — used for the Operations tab.
 * Pure stroke SVG that inherits the surrounding text color via currentColor.
 */
export default function ProductionIcon({ className = "", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* gear */}
      <path d="M 22.2 16.21 L 22.5 13.31 A 10.8 10.8 0 0 1 25.5 13.31 L 25.8 16.21 A 8 8 0 0 1 28.24 17.22 L 30.5 15.37 A 10.8 10.8 0 0 1 32.63 17.5 L 30.78 19.76 A 8 8 0 0 1 31.79 22.2 L 34.69 22.5 A 10.8 10.8 0 0 1 34.69 25.5 L 31.79 25.8 A 8 8 0 0 1 30.78 28.24 L 32.63 30.5 A 10.8 10.8 0 0 1 30.5 32.63 L 28.24 30.78 A 8 8 0 0 1 25.8 31.79 L 25.5 34.69 A 10.8 10.8 0 0 1 22.5 34.69 L 22.2 31.79 A 8 8 0 0 1 19.76 30.78 L 17.5 32.63 A 10.8 10.8 0 0 1 15.37 30.5 L 17.22 28.24 A 8 8 0 0 1 16.21 25.8 L 13.31 25.5 A 10.8 10.8 0 0 1 13.31 22.5 L 16.21 22.2 A 8 8 0 0 1 17.22 19.76 L 15.37 17.5 A 10.8 10.8 0 0 1 17.5 15.37 L 19.76 17.22 Z" />
      <circle cx="24" cy="24" r="3.4" />
      {/* clockwise rotating arrows */}
      <path d="M 30.59 7.68 A 17.6 17.6 0 0 1 30.59 40.32" strokeDasharray="3.2 2.6" />
      <path d="M 30.59 40.32 L 33.98 40.56 L 32.87 37.79" strokeLinecap="round" />
      <path d="M 17.41 40.32 A 17.6 17.6 0 0 1 17.41 7.68" strokeDasharray="3.2 2.6" />
      <path d="M 17.41 7.68 L 14.02 7.44 L 15.13 10.21" strokeLinecap="round" />
    </svg>
  );
}