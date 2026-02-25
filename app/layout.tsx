import type { Metadata } from "next";
import "./globals.css";
import "@/lib/env";

export const metadata: Metadata = {
  title: "Wine Persona",
  description: "A fun, explainable wine persona quiz with privacy-first defaults.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
