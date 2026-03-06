import { describe, expect, it } from "vitest";
import { validateImageMime, validateImageSignature } from "../lib/fileValidation";
import { buildDraftFromFilenameFallback } from "../lib/labelScan";

describe("validateImageMime", () => {
  it("accepts supported image mime types", () => {
    expect(validateImageMime("image/jpeg")).toBe(true);
    expect(validateImageMime("image/png")).toBe(true);
    expect(validateImageMime("image/webp")).toBe(true);
  });

  it("rejects unsupported mime types", () => {
    expect(validateImageMime("application/pdf")).toBe(false);
  });
});

describe("validateImageSignature", () => {
  it("validates jpeg header", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xaa]);
    expect(validateImageSignature(bytes, "image/jpeg")).toBe(true);
  });

  it("rejects mismatched header", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    expect(validateImageSignature(bytes, "image/jpeg")).toBe(false);
  });
});

describe("buildDraftFromFilenameFallback", () => {
  it("builds a safe fallback draft from filename", () => {
    const parsed = buildDraftFromFilenameFallback("Stellenbosch-pinotage-2022.jpg");
    expect(parsed.draft.wineName).toContain("Stellenbosch");
    expect(parsed.draft.tags).toContain("label-scan");
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });
});
