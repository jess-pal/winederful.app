import type { ProductEventName } from "@/lib/productEvents";

export async function sendClientEvent(params: {
  eventName: ProductEventName;
  sessionId?: string;
  route?: string;
  questionId?: string;
  questionIndex?: number;
  personaId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/events/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
  } catch {
    // Analytics should not block the user experience.
  }
}
