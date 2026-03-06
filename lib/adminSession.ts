import { env } from "@/lib/env";

export const ADMIN_SESSION_COOKIE = "wine_admin_session";

type AdminSessionPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlToBytes(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function stringToBase64url(value: string) {
  return bytesToBase64url(encoder.encode(value));
}

function base64urlToString(value: string) {
  return decoder.decode(base64urlToBytes(value));
}

async function hmacSign(data: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(env.ADMIN_SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToBase64url(new Uint8Array(signature));
}

async function hmacVerify(data: string, signature: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(env.ADMIN_SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, base64urlToBytes(signature), encoder.encode(data));
}

export async function createAdminSessionToken(userId: string, email: string, ttlSeconds = 20 * 60) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: userId,
    email,
    iat: now,
    exp: now + ttlSeconds
  };

  const encodedPayload = stringToBase64url(JSON.stringify(payload));
  const signature = await hmacSign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<AdminSessionPayload | null> {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const isValidSignature = await hmacVerify(encodedPayload, signature);
  if (!isValidSignature) return null;

  try {
    const payload = JSON.parse(base64urlToString(encodedPayload)) as AdminSessionPayload;
    if (!payload.sub || !payload.email || !payload.exp || !payload.iat) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
