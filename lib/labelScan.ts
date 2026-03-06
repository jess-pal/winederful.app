import { sanitizePlainText, sanitizeTags } from "@/lib/textSanitize";

type ScanDraft = {
  wineName: string;
  varietal: string;
  notes: string;
  tags: string[];
};

const VARIETALS = [
  "cabernet sauvignon",
  "pinot noir",
  "syrah",
  "shiraz",
  "merlot",
  "chenin blanc",
  "sauvignon blanc",
  "chardonnay",
  "pinotage",
  "malbec",
  "riesling",
  "tempranillo"
];

const REGIONS = ["stellenbosch", "south africa", "bordeaux", "napa", "barossa", "mendoza"];

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseVarietal(text: string) {
  const lowered = text.toLowerCase();
  const found = VARIETALS.find((item) => lowered.includes(item));
  return found ? toTitleCase(found) : "";
}

function parseRegionTags(text: string) {
  const lowered = text.toLowerCase();
  const tags = REGIONS.filter((region) => lowered.includes(region)).map((region) => region.replace(/\s+/g, "-"));
  return sanitizeTags(tags);
}

function parseVintage(text: string) {
  const vintage = /\b(19\d{2}|20\d{2})\b/.exec(text);
  return vintage?.[0] || "";
}

function parseWineName(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => sanitizePlainText(line, 120))
    .map((line) => line.trim())
    .filter((line) => line.length > 2)
    .filter((line) => !/^\d+$/.test(line));

  return lines[0] || "Wine from label";
}

function buildDraftFromOcrText(text: string): { draft: ScanDraft; warnings: string[] } {
  const wineName = parseWineName(text);
  const varietal = parseVarietal(text);
  const vintage = parseVintage(text);
  const regionTags = parseRegionTags(text);

  const tags = sanitizeTags(["label-scan", ...regionTags, varietal ? varietal.toLowerCase() : "", vintage ? `vintage-${vintage}` : ""]);

  const warnings: string[] = [];
  if (!varietal) {
    warnings.push("Could not confidently identify varietal from image text.");
  }
  if (!vintage) {
    warnings.push("Could not detect vintage year.");
  }

  return {
    draft: {
      wineName,
      varietal,
      notes: "Label OCR draft generated. Please verify fields before saving.",
      tags
    },
    warnings
  };
}

export async function buildDraftFromImage(fileBytes: Uint8Array): Promise<{ draft: ScanDraft; warnings: string[]; ocrText: string }> {
  const { recognize } = await import("tesseract.js");

  const result = await recognize(Buffer.from(fileBytes), "eng", {
    logger: () => undefined
  });

  const ocrText = sanitizePlainText(result.data.text || "", 8000);
  const parsed = buildDraftFromOcrText(ocrText);

  return {
    ...parsed,
    ocrText
  };
}

export function buildDraftFromFilenameFallback(filename: string): { draft: ScanDraft; warnings: string[] } {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const safeBase = sanitizePlainText(base || "Wine from label image", 120);

  return {
    draft: {
      wineName: safeBase,
      varietal: "",
      notes: "Fallback draft generated from filename. Please verify details before saving.",
      tags: ["label-scan", "fallback"]
    },
    warnings: ["OCR was unavailable for this upload. Fallback used from filename."]
  };
}
