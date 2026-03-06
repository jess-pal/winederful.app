import { describe, expect, it } from "vitest";
import { sanitizePlainText, sanitizeTags } from "../lib/textSanitize";

describe("sanitizePlainText", () => {
  it("strips control chars and trims", () => {
    expect(sanitizePlainText("  hello\u0007world  ", 100)).toBe("helloworld");
  });

  it("enforces max length", () => {
    expect(sanitizePlainText("abcdef", 3)).toBe("abc");
  });
});

describe("sanitizeTags", () => {
  it("normalizes valid tags and drops invalid entries", () => {
    const out = sanitizeTags(["  Fresh ", "Berry-Forward", "<script>", "$$$", "Cape Blend"]);
    expect(out).toEqual(["fresh", "berry-forward", "cape blend"]);
  });
});
