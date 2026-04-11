type DeviceType = "mobile" | "tablet" | "desktop";

function parseBrowser(ua: string) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "Other";
}

function parseOs(ua: string) {
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}

function parseDeviceType(ua: string): DeviceType {
  if (/iPad|Tablet/.test(ua)) return "tablet";
  if (/Mobile|iPhone|Android/.test(ua)) return "mobile";
  return "desktop";
}

export function getRequestContextFromHeaders(headers: Headers | globalThis.Headers) {
  const userAgent = headers.get("user-agent") || "unknown";
  return {
    countryCode: headers.get("x-vercel-ip-country") || null,
    region: headers.get("x-vercel-ip-country-region") || null,
    city: headers.get("x-vercel-ip-city") || null,
    browser: parseBrowser(userAgent),
    os: parseOs(userAgent),
    deviceType: parseDeviceType(userAgent),
    referrer: headers.get("referer") || null
  };
}
