const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const JPG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP_WEBP = [0x57, 0x45, 0x42, 0x50];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  if (bytes.length < signature.length + offset) return false;
  return signature.every((byte, index) => bytes[index + offset] === byte);
}

export function validateImageMime(mimeType: string) {
  return ALLOWED_MIME.has(mimeType);
}

export function validateImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return startsWith(bytes, JPG);
  }
  if (mimeType === "image/png") {
    return startsWith(bytes, PNG);
  }
  if (mimeType === "image/webp") {
    return startsWith(bytes, WEBP_RIFF, 0) && startsWith(bytes, WEBP_WEBP, 8);
  }
  return false;
}
