import { describe, expect, it } from "vitest";
import { supportCreateSchema } from "../lib/zodSchemas";

describe("supportCreateSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = supportCreateSchema.safeParse({
      category: "bug",
      description: "I clicked add and got an unexpected spinner state.",
      subject: "Add entry spinner issue",
      contactEmail: "person@example.com",
      correlationId: "123e4567-e89b-12d3-a456-426614174000",
      browserOs: "Chrome on macOS",
      lastRoute: "/quiz",
      appVersion: "dev"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid category", () => {
    const parsed = supportCreateSchema.safeParse({
      category: "security",
      description: "valid enough description text",
      correlationId: "123e4567-e89b-12d3-a456-426614174000",
      browserOs: "Chrome on macOS",
      lastRoute: "/support"
    });

    expect(parsed.success).toBe(false);
  });
});
