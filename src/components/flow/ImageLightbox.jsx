import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function ImageLightbox({ url, onClose }) {
  // Close on Escape — return the user to the SOP step they were on
  useEffect(() => {
    if (!url) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [url, onClose]);

  if (!url) return null;

  // Portal to <body> so the lightbox escapes any transformed ancestor
  // (e.g. the page's motion wrapper) and always stacks ABOVE the SOP dialog.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
      // Stop pointerdown from bubbling to the document so the underlying SOP
      // dialog's Radix outside-click detector never sees it — the lightbox
      // stays fully isolated and its own click/Escape handlers do the closing.
      onPointerDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute top-4 right-4 z-[101] w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center shadow-lg transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={url}
        alt=""
        className="max-w-full max-h-full object-contain rounded-lg cursor-default"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}