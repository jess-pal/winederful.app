"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-3xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-sm text-slate-700">The error was recorded for review. Please try again.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
