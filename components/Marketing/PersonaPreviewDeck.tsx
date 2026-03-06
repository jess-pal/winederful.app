const personas = [
  { name: "The Main Character Merlot", mood: "Smooth confidence with crowd-pleasing energy." },
  { name: "The Braai Boss", mood: "Bold reds built for smoke, spice, and big tables." },
  { name: "The Acid Queen (or King)", mood: "Sharp, crisp precision with serious palate bite." }
];

export function PersonaPreviewDeck() {
  return (
    <div className="persona-deck" aria-label="Persona preview cards">
      {personas.map((persona, index) => (
        <article key={persona.name} className={`persona-preview persona-preview-${index + 1}`}>
          <p className="persona-preview-label">Persona preview</p>
          <h3>{persona.name}</h3>
          <p>{persona.mood}</p>
        </article>
      ))}
    </div>
  );
}
