import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function VideoLightbox({ url, onClose }) {
  // Close on Escape — return the user to the SOP step they were on
  useEffect(() => {
    if (!url) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [url, onClose]);

  if (!url) return null;

  // Portal to <body> so the lightbox escapes any transformed ancestor
  // and always stacks ABOVE the SOP dialog.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute top-4 right-4 z-[101] w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center shadow-lg transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      <video
        src={url}
        controls
        autoPlay
        className="max-w-full max-h-full rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}