import crypto from "crypto";
import { env } from "@/lib/env";

export type AutopilotDecision = "approve" | "reject";

type ApprovalPayload = {
  queueId: string;
  decision: AutopilotDecision;
  exp: number;
  draft: boolean;
};

function signPayload(payload: ApprovalPayload) {
  const body = `${payload.queueId}:${payload.decision}:${payload.exp}:${payload.draft ? "1" : "0"}`;
  return crypto.createHmac("sha256", env.ADMIN_SESSION_SECRET).update(body).digest("hex");
}

export function createApprovalToken(payload: ApprovalPayload) {
  return signPayload(payload);
}

export function verifyApprovalToken(payload: ApprovalPayload, signature: string) {
  const expected = signPayload(payload);
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signature, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

