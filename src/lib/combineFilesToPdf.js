import { jsPDF } from "jspdf";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDF_RE = /\.pdf(\?|#|$)/i;
const IMG_RE = /\.(png|jpe?g|webp|gif|bmp)(\?|#|$)/i;
const RENDER_SCALE = 2;
const LETTER_W = 612;
const LETTER_H = 792;
const MARGIN = 24;

const fileKind = (file) => {
  const haystack = `${file?.name || ""} ${file?.url || ""}`;
  if (PDF_RE.test(haystack)) return "pdf";
  if (IMG_RE.test(haystack)) return "image";
  return null;
};

export const canCombineFile = (file) => Boolean(fileKind(file) && file?.url);

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });

const canvasToJpeg = (canvas) => canvas.toDataURL("image/jpeg", 0.85);

/**
 * Combines a project's PDFs and images into one PDF.
 * PDFs keep their native page size; images sit centered on a letter page.
 * Returns { blob, pages, combined, skipped } — blob is null when nothing could be added.
 */
export async function combineFilesToPdf(files, { onProgress } = {}) {
  const targets = (files || []).filter(canCombineFile);
  if (targets.length === 0) return { blob: null, pages: 0, combined: 0, skipped: 0 };

  let doc = null;
  let pages = 0;
  let skipped = 0;

  const startPage = (w, h) => {
    const orientation = w > h ? "landscape" : "portrait";
    if (!doc) doc = new jsPDF({ unit: "pt", format: [w, h], orientation, compress: true });
    else doc.addPage([w, h], orientation);
    pages += 1;
  };

  for (let i = 0; i < targets.length; i++) {
    const file = targets[i];
    onProgress?.({ index: i + 1, total: targets.length, name: file.name });

    try {
      if (fileKind(file) === "pdf") {
        const pdf = await pdfjs.getDocument({ url: file.url }).promise;
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: RENDER_SCALE });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
          startPage(base.width, base.height);
          doc.addImage(canvasToJpeg(canvas), "JPEG", 0, 0, base.width, base.height);
        }
        await pdf.destroy();
      } else {
        const img = await loadImage(file.url);
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const canvas = document.createElement("canvas");
        canvas.width = iw;
        canvas.height = ih;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, iw, ih);
        ctx.drawImage(img, 0, 0);
        const scale = Math.min((LETTER_W - MARGIN * 2) / iw, (LETTER_H - MARGIN * 2) / ih, 1);
        const w = iw * scale;
        const h = ih * scale;
        startPage(LETTER_W, LETTER_H);
        doc.addImage(canvasToJpeg(canvas), "JPEG", (LETTER_W - w) / 2, (LETTER_H - h) / 2, w, h);
      }
    } catch (err) {
      console.error("Could not add file to the combined PDF:", file.name, err);
      skipped += 1;
    }
  }

  if (!doc || pages === 0) return { blob: null, pages: 0, combined: 0, skipped: targets.length };

  return { blob: doc.output("blob"), pages, combined: targets.length - skipped, skipped };
}