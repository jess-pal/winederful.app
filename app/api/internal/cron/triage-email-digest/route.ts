import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cronAuth";
import { sendLatestTriageDigestEmail } from "@/lib/triageEmailDigest";

export async function GET(request: Request) {
  const auth = isValidCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  try {
    const result = await sendLatestTriageDigestEmail({ actorType: "system", actorId: "system-cron" });
    if (!result.sent) {
      return NextResponse.json(result, { status: 200 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send triage digest email";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
