type PersonaBadgeCloudProps = {
  title: string;
  styles: [string, string, string];
};

export function PersonaBadgeCloud({ title, styles }: PersonaBadgeCloudProps) {
  const badges = [title, ...styles, "Share-ready", "Weekend-ready"];

  return (
    <div className="badge-cloud" aria-label="Persona badges">
      {badges.map((badge) => (
        <span key={badge} className="badge-cloud-pill">
          {badge}
        </span>
      ))}
    </div>
  );
}
