import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function VideoLightbox({ url, onClose }) {
  useEffect(() => {
    if (!url) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [url, onClose]);

  if (!url) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 gap-4"
      onPointerDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <video
        src={url}
        controls
        autoPlay
        className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
      />
      <button
        type="button"
        onClick={onClose}
        className="px-8 py-3 rounded-xl bg-white text-slate-900 font-semibold text-base shadow-xl hover:bg-slate-100 active:scale-95 transition"
      >
        Return to SOP
      </button>
    </div>,
    document.body
  );
}