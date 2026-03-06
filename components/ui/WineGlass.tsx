export function WineGlass({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative h-24 w-20 ${className}`}
      style={{ filter: "drop-shadow(0 12px 18px rgba(24, 3, 10, 0.45))" }}
    >
      <svg viewBox="0 0 120 150" className="h-full w-full">
        <defs>
          <linearGradient id="glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.52)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.22)" />
          </linearGradient>
          <linearGradient id="wine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#be4458" />
            <stop offset="100%" stopColor="#5d1228" />
          </linearGradient>
        </defs>
        <path d="M20 12h80c0 40-10 58-28 70v27h22v11H26v-11h22V82C30 70 20 52 20 12z" fill="url(#glass)" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" />
        <path d="M29 40c8 4 17 6 31 6 14 0 23-2 31-6-1 19-6 31-18 40H47c-12-9-17-21-18-40z" fill="url(#wine)" opacity="0.95" />
      </svg>
    </div>
  );
}
