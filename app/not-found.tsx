import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <main className="py-12">
      <Container className="space-y-4">
        <h1 className="text-4xl">Page not found</h1>
        <p className="text-slate-700">The page you requested does not exist.</p>
        <Link className="text-brand-700 underline" href="/">
          Return home
        </Link>
      </Container>
    </main>
  );
}
