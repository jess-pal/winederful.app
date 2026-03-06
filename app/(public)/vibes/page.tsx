import Link from "next/link";
import { Container } from "@/components/ui/Container";

const options = [
  {
    id: "disco",
    name: "Disco Wine Bar",
    vibe: "Loud, playful, party energy.",
    palette: ["#ff2d55", "#d7ff4b", "#120014"],
    headline: "Your pour has main-character energy.",
    body: "Big kinetic type, sticker badges, and bouncy interactions that feel like a wine party flyer.",
    classes:
      "bg-[radial-gradient(circle_at_20%_20%,#ff2d55_0%,#ff2d5500_45%),radial-gradient(circle_at_80%_10%,#d7ff4b66_0%,#d7ff4b00_40%),linear-gradient(140deg,#1b0022,#260016)] text-[#fff4f7] border-[#ff8dac]/30"
  },
  {
    id: "zine",
    name: "Retro Pop Zine",
    vibe: "Editorial, quirky, and artsy.",
    palette: ["#ff7a00", "#00c2ff", "#fff7e8"],
    headline: "Taste profile, but make it a poster.",
    body: "Chunky borders, collage sections, and expressive labels that feel handmade and unmistakable.",
    classes: "bg-[linear-gradient(135deg,#fff7e8,#ffe1b8)] text-[#2c1200] border-[#ff7a00]/50"
  },
  {
    id: "neon",
    name: "Neon Night Tasting",
    vibe: "Sleek, glowy, high-contrast.",
    palette: ["#17ffd2", "#ff4fb3", "#0a0a22"],
    headline: "A night-out aura for your wine persona.",
    body: "Neon gradients, glass cards, and glow accents for a slick, high-energy feel.",
    classes:
      "bg-[radial-gradient(circle_at_15%_10%,#17ffd255_0%,#17ffd200_45%),radial-gradient(circle_at_85%_15%,#ff4fb355_0%,#ff4fb300_42%),linear-gradient(140deg,#080818,#101033)] text-[#eef8ff] border-[#6de7ff]/35"
  }
] as const;

export default function VibesPreviewPage() {
  const customPalette = ["#FF2E55", "#18D43F", "#f7f7f7", "#2F3130"] as const;
  const darkPalette = ["#000000", "#F2EEE6", "#FF2E55", "#18D43F"] as const;

  return (
    <main className="py-12 sm:py-16">
      <Container className="max-w-6xl">
        <div className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f4dacb]">Style Playground</p>
          <h1 className="text-5xl leading-[0.95] text-[#fff4e8] sm:text-6xl">See all vibe directions.</h1>
          <p className="max-w-3xl text-sm text-[#ecd2c4] sm:text-base">
            Compare all three concepts below. Pick one direction and I will apply it across landing, quiz, and results.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {options.map((option) => (
            <article key={option.id} className={`rounded-3xl border p-5 shadow-[0_22px_58px_-34px_rgba(0,0,0,0.9)] ${option.classes}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-90">{option.name}</p>
              <h2 className="mt-2 text-3xl leading-tight">{option.headline}</h2>
              <p className="mt-3 text-sm opacity-90">{option.body}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.11em] opacity-80">{option.vibe}</p>

              <div className="mt-4 flex gap-2">
                {option.palette.map((color) => (
                  <span key={color} className="h-7 w-7 rounded-full ring-1 ring-white/30" style={{ backgroundColor: color }} />
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 p-3">
                <p className="text-xs uppercase tracking-[0.12em] opacity-85">Sample UI</p>
                <div className="mt-2 space-y-2">
                  <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm">Question card preview</div>
                  <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm">Result reveal preview</div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-[2rem] border-2 border-[#2F3130] bg-[#f7f7f7] p-5 text-[#2F3130] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.88)] sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border-2 border-[#2F3130] bg-[#FF2E55] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#f7f7f7]">
                  New Palette View
                </span>
                <span className="inline-flex rounded-full border-2 border-[#2F3130] bg-[#18D43F] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#1A1A1A]">
                  Funk Mode
                </span>
              </div>

              <h2 className="text-4xl leading-[0.95] sm:text-5xl">Cherry Lime Block Party</h2>
              <p className="max-w-xl text-sm sm:text-base">
                A funky, high-contrast direction built from your exact palette. It uses punchy solid blocks, sticker labels, and bold UI shapes
                instead of gradients.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border-2 border-[#2F3130] bg-[#FF2E55] px-4 py-3 text-sm font-bold text-[#f7f7f7]">
                  Quiz tile
                  <p className="mt-1 text-xs font-medium text-[#ffe5eb]">Loud selection states and playful labels</p>
                </div>
                <div className="rounded-2xl border-2 border-[#2F3130] bg-[#18D43F] px-4 py-3 text-sm font-bold text-[#10210f]">
                  Results tile
                  <p className="mt-1 text-xs font-medium text-[#173216]">Share-friendly, poster-like outcome card</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-3xl border-2 border-[#2F3130] bg-[#2F3130] p-4 text-[#f7f7f7]">
              <p className="text-xs font-black uppercase tracking-[0.16em]">Palette</p>
              <div className="grid gap-2">
                {customPalette.map((color) => (
                  <div key={color} className="flex items-center justify-between rounded-xl border border-[#f7f7f7]/30 px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">{color}</span>
                    <span className="h-5 w-8 rounded-md border border-[#f7f7f7]/40" style={{ backgroundColor: color }} />
                  </div>
                ))}
              </div>
              <button className="mt-2 w-full rounded-2xl border-2 border-[#2F3130] bg-[#FF2E55] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-[#f7f7f7]">
                Apply this vibe
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border-2 border-[#18D43F]/45 bg-[#000000] p-5 text-[#F2EEE6] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.88)] sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-[#18D43F]/70 bg-[#FF2E55] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#F2EEE6]">
                  Dark Concept
                </span>
                <span className="inline-flex rounded-full border border-[#18D43F]/70 bg-[#000000] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#18D43F]">
                  Accent Locked
                </span>
              </div>

              <h2 className="text-4xl leading-[0.95] sm:text-5xl">Black Canvas / Cherry Lime</h2>
              <p className="max-w-xl text-sm text-[#F2EEE6]/92 sm:text-base">
                Preview mode with black background and off-white text while preserving cherry and lime for action states and highlights.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#18D43F]/45 bg-[#000000] px-4 py-3 text-sm font-bold text-[#F2EEE6]">
                  Question tile
                  <p className="mt-1 text-xs font-medium text-[#F2EEE6]/88">Off-white body copy, cherry CTA, lime progress.</p>
                </div>
                <div className="rounded-2xl border border-[#18D43F]/45 bg-[#000000] px-4 py-3 text-sm font-bold text-[#F2EEE6]">
                  Result tile
                  <p className="mt-1 text-xs font-medium text-[#F2EEE6]/88">Dark canvas with high-contrast highlights.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-3xl border border-[#18D43F]/45 bg-[#060606] p-4 text-[#F2EEE6]">
              <p className="text-xs font-black uppercase tracking-[0.16em]">Palette</p>
              <div className="grid gap-2">
                {darkPalette.map((color) => (
                  <div key={color} className="flex items-center justify-between rounded-xl border border-[#F2EEE6]/20 px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">{color}</span>
                    <span className="h-5 w-8 rounded-md border border-[#F2EEE6]/30" style={{ backgroundColor: color }} />
                  </div>
                ))}
              </div>
              <button className="mt-2 w-full rounded-2xl border border-[#18D43F]/70 bg-[#FF2E55] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-[#F2EEE6]">
                Apply dark mode concept
              </button>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f9e3d6]"
          >
            Back to site
          </Link>
        </div>
      </Container>
    </main>
  );
}
