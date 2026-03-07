import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cronAuth";
import { runPostReleaseVerification } from "@/lib/postReleaseVerify";

export async function GET(request: Request) {
  const auth = isValidCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  try {
    const result = await runPostReleaseVerification({ actorId: "system-cron" });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not run post-release verification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
