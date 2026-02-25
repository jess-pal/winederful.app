type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

const REDACT_KEYS = ["email", "token", "authorization", "password", "cookie", "set-cookie"];

function redact(obj: LogPayload): LogPayload {
  const clone: LogPayload = { ...obj };
  for (const key of Object.keys(clone)) {
    if (REDACT_KEYS.includes(key.toLowerCase())) {
      clone[key] = "[REDACTED]";
    }
  }
  return clone;
}

export function log(level: LogLevel, message: string, payload: LogPayload = {}) {
  const line = {
    level,
    message,
    ts: new Date().toISOString(),
    ...redact(payload)
  };
  const out = JSON.stringify(line);
  if (level === "error") {
    console.error(out);
    return;
  }
  if (level === "warn") {
    console.warn(out);
    return;
  }
  console.log(out);
}
