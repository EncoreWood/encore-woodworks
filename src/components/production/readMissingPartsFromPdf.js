import { base44 } from "@/api/base44Client";

const responseSchema = {
  type: "object", required: ["rows"], properties: {
    rows: { type: "array", items: {
      type: "object", required: ["qty", "width", "length", "material", "finish"], properties: {
        qty: { type: "number" }, width: { type: "string" }, length: { type: "string" },
        material: { type: "string" }, finish: { type: "string" },
      },
    } },
  },
};

export default async function readMissingPartsFromPdf(files, type, onProgress) {
  const rows = [];
  for (const [index, file] of files.entries()) {
    onProgress(`reading ${file.name || `PDF ${index + 1}`}…`);
    // InvokeLLM needs a fetchable file URL, not a browser canvas data URL.
    const result = await base44.integrations.Core.InvokeLLM({
      file_urls: [file.url], response_json_schema: responseSchema,
      prompt: `Read all pages of this cabinet manufacturing PDF, including rotated pages.
Extract the ${type} rows from the table with columns Qty, W, L, Part, Material, Opening.
W means width, L means length. Read each column separately; no x separator is required.
For Drawer Front, include only Part = Drawer Front, not Drawer Box.
For Door, include only door parts, not rows whose MATERIAL happens to mention a door.
For End Panel, also recognize End (L), End (R), FEnd and Slab End.
Return qty, width and length exactly as printed, preserving mixed fractions, material, and finish from the header (empty string if absent).
The same manufacturing rows may be repeated on a face-frame sheet and a cabinet sheet: do not count a repeated table twice. Keep different materials separate.
Return {rows: []} only when this part type is absent. Do not invent dimensions.`,
    });
    if (!Array.isArray(result?.rows)) throw new Error("The PDF reader returned no part table.");
    rows.push(...result.rows.map(row => ({ ...row, label: type, quick_type: type, qty: row.qty || 1 })));
  }
  return rows;
}