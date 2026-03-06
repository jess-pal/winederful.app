import Link from "next/link";

export function GetHelpButton() {
  return (
    <Link
      href="/support"
      className="fixed bottom-5 right-5 z-50 rounded-full bg-[#FF2E55] px-4 py-2 text-sm font-semibold text-[#F2EEE6] shadow-lg shadow-black/40 transition hover:bg-[#e0284d]"
    >
      Get help
    </Link>
  );
}
