import { cn } from "@/lib/utils";

const styles = {
  primary:
    "bg-[#FF2E55] text-[#F2EEE6] shadow-[0_14px_36px_-16px_rgba(0,0,0,0.5)] hover:translate-y-[-1px] hover:bg-[#e0284d]",
  secondary:
    "bg-[#121212] text-[#F2EEE6] ring-1 ring-[#18D43F]/70 hover:bg-[#18D43F] hover:text-[#0E0E0E] hover:ring-[#18D43F] hover:translate-y-[-1px] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.55)]",
  ghost: "bg-transparent text-[#F2EEE6] hover:bg-[#FF2E55]/16"
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
        "inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
