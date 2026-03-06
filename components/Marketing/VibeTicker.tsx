const vibes = [
  "Cheeky",
  "Elegant",
  "Bold",
  "Playful",
  "Curious",
  "Smoky",
  "Crisp",
  "Velvety"
];

export function VibeTicker() {
  const allVibes = [...vibes, ...vibes];

  return (
    <div className="vibe-ticker" aria-label="Wine vibe ticker">
      <div className="vibe-ticker-track">
        {allVibes.map((vibe, index) => (
          <span key={`${vibe}-${index}`} className="vibe-chip">
            {vibe}
          </span>
        ))}
      </div>
    </div>
  );
}
