export function sanitizePlainText(input: string, maxLen: number) {
  const trimmed = input.trim().slice(0, maxLen);
  return trimmed.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function sanitizeTags(tags: string[]) {
  return tags
    .map((tag) => sanitizePlainText(tag, 24).toLowerCase())
    .filter((tag) => /^[a-z0-9- ]{1,24}$/.test(tag))
    .slice(0, 8);
}
