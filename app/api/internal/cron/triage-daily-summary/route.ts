import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cronAuth";
import { generateDailyTriageSummary } from "@/lib/triageReports";

export async function GET(request: Request) {
  const auth = isValidCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  try {
    const report = await generateDailyTriageSummary({ actorType: "system", actorId: "system-cron" });
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "Could not generate daily triage summary" }, { status: 500 });
  }
}
