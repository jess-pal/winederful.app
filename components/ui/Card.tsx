import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return <div className={cn("surface-card rounded-3xl p-6 text-[#F2EEE6] sm:p-7", className)} {...props}>{children}</div>;
}
