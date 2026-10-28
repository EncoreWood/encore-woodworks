import { base44 } from "@/api/base44Client";

const responseSchema = {
  type: "object",
  required: ["wood_type", "finish"],
  properties: {
    wood_type: { type: "string" },
    finish: { type: "string" },
  },
};

/**
 * Reads the wood species and finish/color printed on THIS card's own PDF cut list
 * (so a card carries one specific wood + finish instead of inheriting the room's
 * multiple species/finish selections).
 */
export default async function readCardSpecFromPdf(files) {
  const pdfs = (files || []).filter(f => /\.pdf($|\?)/i.test(f.url || ""));
  if (pdfs.length === 0) throw new Error("Attach a PDF to this card first.");

  const result = await base44.integrations.Core.InvokeLLM({
    file_urls: pdfs.slice(0, 3).map(f => f.url),
    response_json_schema: responseSchema,
    prompt: `Read this cabinet manufacturing document and report the wood species and the finish/color for the cabinets on it.
Look at the title block / header / material and finish fields (e.g. "Material: Beech", "Finish: Painted Fudge Room", "Color: Black Magic").
Return wood_type as the wood species only (e.g. "Beech", "Maple"), with no finish words.
Return finish as the finish and color exactly as printed (e.g. "Painted · Fudge Room, Black Magic"), combining the finish type and color when both appear.
Use the wording printed on the document. If the wood species is not printed, return "". If no finish or color is printed, return "".`,
  });

  return {
    wood_type: (result?.wood_type || "").trim(),
    finish: (result?.finish || "").trim(),
  };
}