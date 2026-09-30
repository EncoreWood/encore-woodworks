// Extracts item size rows (label + qty + width + length) from the text of an
// attached PDF (door list, drawer list, cut sheet...). Uses the pdfjs build
// already bundled with react-pdf.
import { pdfjs } from "react-pdf";

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

// Group a page's text items into visual lines by y-coordinate
async function extractLines(doc) {
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map();
    content.items.forEach(it => {
      if (!it.str || !it.str.trim()) return;
      const y = Math.round(it.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: it.transform[4], str: it.str });
    });
    [...rows.values()].forEach(parts => {
      lines.push(parts.sort((a, b) => a.x - b.x).map(p => p.str).join(" ").trim());
    });
  }
  return lines;
}

// Best-effort part label: the text preceding the size on the same line
function labelBefore(line, matchIndex) {
  let before = line.slice(0, matchIndex).replace(/[\s,\-–:]+$/, "").trim();
  if (before.length > 48) before = before.slice(-48).replace(/^\S+\s/, "");
  return before;
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
  const lines = await extractLines(doc);
  const byKey = new Map();

  lines.forEach(line => {
    SIZE_RE.lastIndex = 0;
    let m;
    while ((m = SIZE_RE.exec(line))) {
      const width = m[2];
      const length = m[3];
      const w = toInches(width);
      const l = toInches(length);
      // Filter noise: real part dims fall in a sane inch range
      if (!Number.isFinite(w) || !Number.isFinite(l)) continue;
      if (w < 2 || w > 120 || l < 2 || l > 120) continue;
      const qty = m[1] ? parseInt(m[1], 10) : 1;
      const label = labelBefore(line, m.index) || "Part";
      const key = `${label.toLowerCase()}|${width}|${length}`;
      if (byKey.has(key)) {
        byKey.get(key).qty += qty;
      } else {
        byKey.set(key, { label, qty, width, length });
      }
    }
  });

  return [...byKey.values()];
}