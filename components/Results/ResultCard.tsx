import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Result = {
  personaId: string;
  title: string;
  description: string;
  recommendedStyles: [string, string, string];
  explanationBullets: string[];
};

export function ResultCard({ result, shareUrl }: { result: Result; shareUrl: string }) {
  const onShare = async () => {
    await fetch("/api/quiz/shared", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareUrl })
    });
  };

  return (
    <Card className="space-y-5">
      <p className="text-sm uppercase tracking-wide text-brand-700">Your Wine Persona</p>
      <h1 className="text-4xl leading-tight">{result.title}</h1>
      <p className="text-base text-slate-700">{result.description}</p>

      <div>
        <h2 className="text-lg font-semibold">Suggested wine styles</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700">
          {result.recommendedStyles.map((style) => (
            <li key={style}>{style}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Why this matches you</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700">
          {result.explanationBullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <a className="inline-flex" href={`/quiz`}>
          <Button variant="secondary">Retake quiz</Button>
        </a>
        <a className="inline-flex" href={shareUrl} target="_blank" rel="noreferrer" onClick={onShare}>
          <Button>Share result</Button>
        </a>
      </div>
    </Card>
  );
}
