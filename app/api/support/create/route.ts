import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supabaseService } from "@/lib/supabaseClient";
import { getOptionalAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRequestFingerprint } from "@/lib/security";
import { supportCreateSchema } from "@/lib/zodSchemas";
import { sanitizePlainText } from "@/lib/textSanitize";
import { validateImageMime, validateImageSignature } from "@/lib/fileValidation";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { upsertTriageFromSupportTicket } from "@/lib/triageSupportSync";
import { trackProductEvent } from "@/lib/productEvents";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

function inferPriority(category: "bug" | "feedback" | "billing" | "other") {
  if (category === "billing") return "high";
  if (category === "bug") return "medium";
  return "low";
}

function extensionFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export async function POST(request: Request) {
  const optionalAuth = await getOptionalAuthenticatedUser(request);
  const { ipHash, uaHash } = await getRequestFingerprint();

  const limiter = checkRateLimit(`support_create:${ipHash}`, 10, 60 * 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const formData = await request.formData();

  const payload = {
    category: String(formData.get("category") || ""),
    description: String(formData.get("description") || ""),
    subject: String(formData.get("subject") || "") || undefined,
    contactEmail: String(formData.get("contactEmail") || "") || undefined,
    correlationId: String(formData.get("correlationId") || ""),
    browserOs: String(formData.get("browserOs") || ""),
    lastRoute: String(formData.get("lastRoute") || ""),
    appVersion: String(formData.get("appVersion") || "") || undefined
  };

  const parsed = supportCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid support payload", issues: parsed.error.issues }, { status: 400 });
  }

  const safeDescription = sanitizePlainText(parsed.data.description, 3000);
  const safeSubject = parsed.data.subject ? sanitizePlainText(parsed.data.subject, 160) : null;
  const safeBrowserOs = sanitizePlainText(parsed.data.browserOs, 120);
  const safeLastRoute = sanitizePlainText(parsed.data.lastRoute, 200);
  const safeAppVersion = sanitizePlainText(
    parsed.data.appVersion || process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    120
  );

  const emailHash = parsed.data.contactEmail
    ? crypto.createHmac("sha256", env.IP_HASH_SALT).update(parsed.data.contactEmail.toLowerCase().trim()).digest("hex")
    : null;

  const ticketMetadata = {
    correlation_id: parsed.data.correlationId,
    browser_os: safeBrowserOs,
    last_route: safeLastRoute,
    app_version: safeAppVersion,
    ip_hash: ipHash,
    ua_hash: uaHash
  };

  const { data: ticket, error: ticketError } = await db
    .from("support_tickets")
    .insert({
      status: "open",
      priority: inferPriority(parsed.data.category),
      user_id: optionalAuth?.user.id || null,
      contact_email_hash: emailHash,
      subject: safeSubject,
      description: safeDescription,
      category: parsed.data.category,
      metadata: ticketMetadata
    })
    .select("id, created_at, status, priority")
    .single();

  if (ticketError || !ticket) {
    log("error", "support_ticket_insert_failed", { reason: ticketError?.message || "unknown" });
    return NextResponse.json({ error: "Could not create support ticket" }, { status: 500 });
  }

  const { error: messageError } = await db.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_type: "user",
    message: safeDescription,
    metadata: {
      subject: safeSubject,
      from_logged_in_user: Boolean(optionalAuth?.user.id)
    }
  });

  if (messageError) {
    log("warn", "support_message_insert_failed", { ticketId: ticket.id, reason: messageError.message });
  }

  const screenshot = formData.get("screenshot");
  let attachmentInfo: { path: string; mime: string; size: number } | null = null;

  if (screenshot instanceof File && screenshot.size > 0) {
    if (!validateImageMime(screenshot.type)) {
      return NextResponse.json({ error: "Unsupported screenshot type" }, { status: 400 });
    }

    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json({ error: "Screenshot exceeds 5MB" }, { status: 400 });
    }

    const bytes = new Uint8Array(await screenshot.arrayBuffer());
    if (!validateImageSignature(bytes.slice(0, 32), screenshot.type)) {
      return NextResponse.json({ error: "Screenshot signature validation failed" }, { status: 400 });
    }

    const ext = extensionFromMime(screenshot.type);
    const path = `${ticket.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseService.storage
      .from("support-attachments")
      .upload(path, bytes, { contentType: screenshot.type, upsert: false });

    if (!uploadError) {
      attachmentInfo = {
        path,
        mime: screenshot.type,
        size: screenshot.size
      };

      const { error: attachmentError } = await db.from("attachments").insert({
        ticket_id: ticket.id,
        storage_path: path,
        mime_type: screenshot.type,
        size_bytes: screenshot.size
      });

      if (attachmentError) {
        log("warn", "support_attachment_row_insert_failed", { ticketId: ticket.id, reason: attachmentError.message });
      }
    } else {
      log("warn", "support_attachment_upload_failed", { ticketId: ticket.id, reason: uploadError.message });
    }
  }

  await db.from("audit_logs").insert({
    actor_type: optionalAuth?.user.id ? "user" : "anonymous",
    actor_id: optionalAuth?.user.id || null,
    action: "support_ticket_created",
    target_type: "support_ticket",
    target_id: ticket.id,
    metadata: {
      category: parsed.data.category,
      correlation_id: parsed.data.correlationId,
      attachment_uploaded: Boolean(attachmentInfo)
    }
  });

  try {
    await upsertTriageFromSupportTicket(
      {
        id: ticket.id,
        created_at: ticket.created_at,
        updated_at: ticket.created_at,
        subject: safeSubject,
        description: safeDescription,
        priority: ticket.priority as "low" | "medium" | "high",
        category: parsed.data.category,
        metadata: ticketMetadata
      },
      optionalAuth?.user.id || null
    );
  } catch (error) {
    log("warn", "support_ticket_triage_sync_failed", {
      ticketId: ticket.id,
      reason: error instanceof Error ? error.message : "unknown"
    });
  }

  await trackProductEvent({
    eventName: "support_submitted",
    route: "/support",
    metadata: {
      category: parsed.data.category,
      ticketId: ticket.id,
      attachmentUploaded: Boolean(attachmentInfo),
      fromLoggedInUser: Boolean(optionalAuth?.user.id)
    }
  });

  return NextResponse.json({
    ticketId: ticket.id,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.created_at,
    attachment: attachmentInfo
  });
}
