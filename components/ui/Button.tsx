import { cn } from "@/lib/utils";

const styles = {
  primary: "bg-brand-700 text-white hover:bg-brand-900",
  secondary: "bg-white text-brand-700 ring-1 ring-brand-700 hover:bg-brand-50",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-50"
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof styles;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
