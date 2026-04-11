"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type SharePlatform = "x" | "facebook" | "linkedin" | "whatsapp" | "copy" | "native";

function buildShareLinks(url: string, text: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return {
    x: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`
  };
}

export function SharePanel({
  sharePath,
  sessionId,
  title,
  siteUrl
}: {
  sharePath: string;
  sessionId?: string;
  title: string;
  siteUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullShareUrl = useMemo(() => {
    const base = siteUrl?.startsWith("http") ? siteUrl : typeof window !== "undefined" ? window.location.origin : "";
    const token = sharePath.split("/").pop();
    const friendQuizPath = token ? `/quiz?from=share&token=${encodeURIComponent(token)}` : "/quiz?from=share";
    return `${base}${friendQuizPath}`;
  }, [sharePath, siteUrl]);

  const shareText = `I got ${title} on Wine Persona. What wine are you?`;
  const links = buildShareLinks(fullShareUrl, shareText);
  const canNativeShare =
    typeof navigator !== "undefined" && typeof (navigator as Navigator & { share?: unknown }).share === "function";

  const trackShare = async (platform: SharePlatform) => {
    try {
      await fetch("/api/quiz/shared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharePath, platform, sessionId })
      });
    } catch {
      // Intentionally ignore analytics tracking failures.
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullShareUrl);
      await trackShare("copy");
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copy failed. You can still use social buttons.");
    }
  };

  const onNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: "Wine Persona", text: shareText, url: fullShareUrl });
      await trackShare("native");
      setError(null);
    } catch {
      setError("Share canceled.");
    }
  };

  const socialButtons: Array<{ key: Exclude<SharePlatform, "copy" | "native">; label: string; href: string }> = [
    { key: "x", label: "Share on X", href: links.x },
    { key: "facebook", label: "Share on Facebook", href: links.facebook },
    { key: "linkedin", label: "Share on LinkedIn", href: links.linkedin },
    { key: "whatsapp", label: "Share on WhatsApp", href: links.whatsapp }
  ];

  return (
    <Card className="fade-in-up space-y-4 lg:sticky lg:top-6">
      <div className="flex flex-wrap gap-2">
        <span className="disco-sticker">Share drop</span>
      </div>
      <h2 className="text-3xl leading-tight text-[#F2EEE6]">Share Your Persona</h2>
      <p className="text-sm text-[#F2EEE6]">This link opens the quiz for your friend so they can get their own wine persona.</p>

      <div className="space-y-2">
        {socialButtons.map((button) => (
          <a
            key={button.key}
            className="block"
            href={button.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() => {
              void trackShare(button.key);
            }}
          >
            <Button className="w-full justify-start" variant="secondary">
              {button.label}
            </Button>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Button onClick={onCopy} variant="primary">
          {copied ? "Copied" : "Copy link"}
        </Button>
        {canNativeShare && (
          <Button onClick={onNativeShare} variant="secondary">
            More share options
          </Button>
        )}
      </div>

      {error && <p className="rounded-xl border border-[#FF2E55]/60 bg-[#2a0d15] px-3 py-2 text-xs text-[#ffd8e0]">{error}</p>}
    </Card>
  );
}
