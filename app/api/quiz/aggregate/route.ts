import { NextResponse } from "next/server";
import { getQuizAggregate } from "@/lib/quizAggregate";
import { log } from "@/lib/logger";

export async function GET() {
  try {
    const aggregate = await getQuizAggregate(4);

    return NextResponse.json(aggregate, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
      }
    });
  } catch (error) {
    log("error", "quiz_aggregate_load_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json({ error: "Could not load aggregate stats" }, { status: 500 });
  }
}
