export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div
      aria-label="Quiz progress"
      className="h-3 w-full overflow-hidden rounded-full bg-[#161616] ring-1 ring-[#18D43F]/45"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="h-3 rounded-full bg-[#18D43F] transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
