import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cronAuth";
import { db } from "@/lib/db";
import { generateProductInsights } from "@/lib/productInsights";

export async function GET(request: Request) {
  const auth = isValidCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  try {
    const result = await generateProductInsights({ actorType: "system", actorId: "system-cron" });

    await db.from("audit_logs").insert({
      actor_type: "system",
      actor_id: "system-cron",
      action: "product_insights_generate_cron",
      target_type: "product_insight",
      target_id: null,
      metadata: {
        ...result,
        via: "cron"
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product insight generation failed" },
      { status: 502 }
    );
  }
}
