export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div aria-label="Quiz progress" className="h-2 w-full rounded-full bg-brand-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="h-2 rounded-full bg-brand-700 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
