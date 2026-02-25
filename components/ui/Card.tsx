import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5", className)} {...props}>
      {children}
    </div>
  );
}
