// Extracts item size rows (label + qty + width + length) from the text of an
// attached PDF (door list, drawer list, cut sheet...). Uses the pdfjs build
// already bundled with react-pdf.
import { pdfjs } from "react-pdf";
import { partTypeOf, readPartTable } from "@/components/production/pdfPartTable";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const NUM = "(\\d+(?:\\s+\\d+\\/\\d+)?)";
const SIZE_RE = new RegExp(`(?:(\\d+)\\s*@\\s*)?${NUM}\\s*[xX×]\\s*${NUM}`, "g");

const toInches = (str) => {
  if (!str) return NaN;
  const m = String(str).trim().match(/^(\d+)(?:\s+(\d+)\/(\d+))?$/);
  if (!m) return NaN;
  const whole = parseFloat(m[1]);
  const frac = m[2] ? parseFloat(m[2]) / parseFloat(m[3]) : 0;
  return whole + frac;
};

// Normalize to the displayed page BEFORE grouping: cabinet PDFs can be rotated 90°.
async function extractPages(doc) {
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.filter(it => it.str?.trim()).map(it => {
      const transform = pdfjs.Util.transform(viewport.transform, it.transform);
      return { x: transform[4], y: transform[5], str: it.str.trim(), height: Math.hypot(transform[0], transform[1]) };
    }).sort((a, b) => a.y - b.y || a.x - b.x);
    const lines = [];
    for (const item of items) {
      const row = lines[lines.length - 1];
      if (row && Math.abs(row.y - item.y) < 2) row.parts.push(item);
      else lines.push({ y: item.y, parts: [item] });
    }
    lines.forEach(row => {
      row.parts.sort((a, b) => a.x - b.x);
      row.text = row.parts.map(part => part.str).join(" ");
    });
    pages.push(lines);
  }
  return pages;
}

export function inferPickupType(label) {
  const l = (label || "").toLowerCase();
  if (/drawer\s*front/.test(l)) return "Drawer Front";
  if (/drawer\s*box/.test(l)) return "Drawer Box";
  if (/door/.test(l)) return "Door";
  if (/panel/.test(l)) return "Panel";
  if (/mold|crown/.test(l)) return "Molding";
  if (/hinge|glide|hardware|handle|knob|pull|slide/.test(l)) return "Hardware";
  return null;
}

export async function extractSizesFromPdf(url) {
  const doc = await pdfjs.getDocument({ url }).promise;
  try {
    const pages = await extractPages(doc);
    const all = new Map();
    let finish = null;
    for (const lines of pages) {
      const header = lines.find(line => /\bfinish\s*:/i.test(line.text));
      finish = header?.text.match(/\bfinish\s*:\s*(.*)$/i)?.[1]?.trim() || finish;
      const tableParts = readPartTable(lines).map(part => ({ ...part, finish }));
      const parts = [...tableParts];
      // Retain support for older lists using "qty@ width x length".
      if (!tableParts.length) lines.forEach(({ text }) => {
        const label = partTypeOf(text);
        if (!label) return;
        SIZE_RE.lastIndex = 0;
        let match;
        while ((match = SIZE_RE.exec(text))) {
          const w = toInches(match[2]), l = toInches(match[3]);
          if (w < 2 || w > 120 || l < 2 || l > 120 || !Number.isFinite(w) || !Number.isFinite(l)) continue;
          parts.push({ label, quick_type: label, qty: Number(match[1] || 1), width: match[2], length: match[3] });
        }
      });
      const pageParts = new Map();
      for (const part of parts) {
        const key = [part.label, part.width, part.length, part.material || ""].join("|");
        if (pageParts.has(key)) pageParts.get(key).qty += part.qty;
        else pageParts.set(key, { ...part });
      }
      // Repeated face-frame/cabinet tables describe the same parts, not extra quantities.
      for (const [key, part] of pageParts) {
        if (!all.has(key) || part.qty > all.get(key).qty) all.set(key, part);
      }
    }
    return [...all.values()];
  } finally {
    await doc.destroy();
  }
}