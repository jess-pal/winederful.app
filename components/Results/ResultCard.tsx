import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheersBanner } from "@/components/Results/CheersBanner";
import { CelebrationFireworks } from "@/components/Results/CelebrationFireworks";
import { PersonaBadgeCloud } from "@/components/Results/PersonaBadgeCloud";

type Result = {
  personaId: string;
  title: string;
  description: string;
  recommendedStyles: [string, string, string];
  explanationBullets: string[];
};

export function ResultCard({ result }: { result: Result }) {
  return (
    <Card className="fade-in-up relative overflow-hidden">
      <CelebrationFireworks />
      <div className="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full bg-[#18D43F]/30 blur-3xl" />
      <div className="relative z-10 space-y-6">
        <CheersBanner />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F2EEE6]">Your Wine Persona</p>
        <h1 className="text-4xl leading-tight text-[#F2EEE6] sm:text-5xl">{result.title}</h1>
        <PersonaBadgeCloud title={result.title} styles={result.recommendedStyles} />
        <p className="max-w-2xl text-base leading-relaxed text-[#F2EEE6]">{result.description}</p>

        <div>
          <h2 className="text-lg font-semibold text-[#F2EEE6]">Suggested wine styles</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {result.recommendedStyles.map((style) => (
              <li key={style} className="list-none rounded-full border border-[#F2EEE6]/25 bg-[#18D43F]/12 px-3 py-1.5 text-sm font-semibold text-[#F2EEE6]">
                {style}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#F2EEE6]">Why this matches you</h2>
          <ul className="mt-3 space-y-2 text-[#F2EEE6]">
            {result.explanationBullets.map((item) => (
              <li key={item} className="rounded-xl border border-[#F2EEE6]/15 bg-[#0E0E0E] px-3 py-2 text-sm sm:text-base">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <a className="inline-flex" href={`/quiz`}>
            <Button variant="secondary">Retake quiz</Button>
          </a>
        </div>
      </div>
    </Card>
  );
}
