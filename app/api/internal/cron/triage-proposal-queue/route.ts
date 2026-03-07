import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cronAuth";
import { autopilotQueueEnabled } from "@/lib/autopilotPolicy";
import { buildAutopilotQueue } from "@/lib/autopilotQueue";

export async function GET(request: Request) {
  const auth = isValidCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  if (!autopilotQueueEnabled()) {
    return NextResponse.json({ skipped: true, reason: "AUTOPILOT_ENABLE_QUEUE is false" });
  }

  try {
    const result = await buildAutopilotQueue({ actorId: "system-cron" });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build autopilot queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
