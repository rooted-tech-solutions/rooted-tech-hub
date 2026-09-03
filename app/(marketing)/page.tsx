import { BUILD_ITEMS, BUILD_PHASES, MAINTENANCE_ITEMS } from "@/app/(dashboard)/dashboard/quotes/lineItems";
import { SITE } from "@/lib/site";
import ContactForm from "./ContactForm";
import WorkCarousel from "./components/WorkCarousel";
import { WORK } from "@/content/work";

/**
 * Services are grouped from BUILD_ITEMS rather than restated, so the public
 * page and the quote builder can never drift apart — what the site advertises
 * is literally what gets quoted.
 *
 * `featured` marks the one card in the row that renders inverted (dark). A
 * single dark tile among three light ones gives the grid a focal point;
 * three identical tiles read as a list.
 */
const PHASES = [
  {
    title: "Plan",
    blurb:
      "Before anything is built, we work out what you actually do day to day — and where the software should fit into it.",
    items: BUILD_PHASES[0].items,
    featured: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    ),
  },
  {
    title: "Build",
    blurb:
      "The application itself — the screens your team uses, the logic underneath, and connections to the tools you already pay for.",
    items: BUILD_PHASES[1].items,
    featured: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
    ),
  },
  {
    title: "Launch",
    blurb:
      "Tested, deployed, and handed over with documentation — so you are never locked out of something you paid for.",
    items: BUILD_PHASES[2].items,
    featured: false,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    ),
  },
] as const;

/** Mirrors the payment and scope terms in dashboard/contracts/contractTerms.ts. */
const PROCESS = [
  {
    step: "01",
    title: "We talk",
    body: "A discovery call to understand how the work moves through your business today, and which part of it hurts most.",
  },
  {
    step: "02",
    title: "You get a scope of work",
    body: "A written document listing exactly what is being built, what is not, and what we need from you. No surprises later.",
  },
  {
    step: "03",
    title: "A fixed quote and contract",
    body: "One price for the build, signed online. Anything outside the agreed scope gets quoted separately before it is started — never billed as a surprise.",
  },
  {
    step: "04",
    title: "We build it",
    body: "Half up front, half on delivery and acceptance. You see progress as it goes, not at the very end.",
  },
  {
    step: "05",
    title: "It keeps working",
    body: "A monthly care plan covers hosting, security updates, backups, and support, so the thing you paid for does not quietly rot.",
  },
] as const;

/**
 * Sits beside the inquiry form. Each line restates a promise the site already
 * makes elsewhere (hero footnote, form success state) so nothing new is
 * claimed here — if one of those changes, change this too.
 */
const REASSURANCE = [
  "The first conversation is free, with no obligation.",
  "We follow up with you personally, at no cost.",
  "You hear back within one business day.",
] as const;

/* ------------------------------------------------------------------ */
/* Small presentational helpers, local to this page                    */
/* ------------------------------------------------------------------ */

/** Section label: a short rule and a tracked caption. `light` is for dark bands. */
function Eyebrow({ children, tone = "clay" }: { children: React.ReactNode; tone?: "clay" | "light" }) {
  return (
    <p
      className={`inline-flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] ${
        tone === "light" ? "text-site-mint/80" : "text-site-clay"
      }`}
    >
      <span aria-hidden className="h-px w-7 bg-current" />
      {children}
    </p>
  );
}

/** Faint dot texture. Pass a `text-*` colour; the dots use currentColor. */
function DotGrid({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:28px_28px] ${className}`}
    />
  );
}

/** Nudges right on hover of a parent marked `group`. */
function ArrowIcon() {
  return (
    <svg
      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

const h2Class = "mt-4 text-3xl font-bold tracking-tight text-site-ink sm:text-4xl lg:text-5xl";

export default function MarketingHome() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-site-mint via-site-wash to-white pb-24 pt-36 lg:pb-32 lg:pt-44">
        <DotGrid className="text-site-ink/[0.07] [mask-image:linear-gradient(to_bottom,black_30%,transparent)]" />
        <div className="pointer-events-none absolute -right-24 top-16 h-[28rem] w-[28rem] rounded-full bg-site-clay/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-site-accent/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 text-center lg:max-w-4xl lg:px-8">
          <p className="inline-flex items-center gap-2.5 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-site-accent shadow-soft ring-1 ring-site-line backdrop-blur sm:text-[13px]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-site-clay" />
            Custom software · Built to enable your growth
          </p>
          <h1 className="mt-8 text-5xl font-bold leading-[1.02] tracking-tight text-site-ink sm:text-6xl lg:text-7xl">
            Software that fits{" "}
            <span className="relative inline-block">
              how you work
              {/* Hand-drawn underline in the warm accent — the one flourish in the hero. */}
              <svg
                aria-hidden
                className="absolute -bottom-1 left-0 h-3 w-full text-site-clay sm:-bottom-2"
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                fill="none"
              >
                <path d="M3 9.5C45 3.5 125 2.5 197 6.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
            .
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-site-body sm:text-xl">
            We build reliable systems that make operations more efficient: automating manual
            processes, consolidating your information into a single source of truth, and
            providing the visibility to make confident decisions.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#contact"
              className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-site-accent px-8 text-base font-semibold text-white shadow-lift transition-colors hover:bg-site-deep sm:w-auto"
            >
              Start a project
              <ArrowIcon />
            </a>
            <a
              href="#services"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-site-ink shadow-soft ring-1 ring-site-line transition-colors hover:bg-site-wash hover:ring-site-accent/30 sm:w-auto"
            >
              See what we build
            </a>
          </div>

          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-site-mute">
            The first conversation is free. Send the form with no obligation and we&rsquo;ll
            follow up with you personally, at no cost.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* What we build                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section id="services" className="scroll-mt-24 bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-12">
            <div>
              <Eyebrow>What we build</Eyebrow>
              <h2 className={h2Class}>A complete application, start to finish.</h2>
            </div>
            <p className="text-lg leading-relaxed text-site-body lg:pb-1">
              One team from first call to handover means nothing gets lost between agencies or
              contractors.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3 lg:mt-16">
            {PHASES.map((phase, i) => {
              const dark = phase.featured;
              return (
                <div
                  key={phase.title}
                  className={`group relative flex flex-col rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                    dark ? "bg-site-ink text-white shadow-lift" : "bg-site-wash ring-1 ring-site-line hover:shadow-lift"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${dark ? "bg-white/10" : "bg-site-mint"}`}>
                      <svg
                        className={`h-7 w-7 ${dark ? "text-site-mint" : "text-site-accent"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden
                      >
                        {phase.icon}
                      </svg>
                    </div>
                    <span className={`font-mono text-sm ${dark ? "text-white/40" : "text-site-mute"}`}>0{i + 1}</span>
                  </div>
                  <h3 className={`mt-6 text-xl font-bold ${dark ? "text-white" : "text-site-ink"}`}>{phase.title}</h3>
                  <p className={`mt-3 text-[15px] leading-relaxed ${dark ? "text-white/70" : "text-site-body"}`}>
                    {phase.blurb}
                  </p>
                  <ul className={`mt-6 space-y-2.5 border-t pt-6 ${dark ? "border-white/10" : "border-site-line"}`}>
                    {BUILD_ITEMS.filter((b) => (phase.items as readonly string[]).includes(b.num)).map((b) => (
                      <li
                        key={b.num}
                        className={`flex items-center gap-2.5 text-[15px] ${dark ? "text-white/80" : "text-site-body"}`}
                      >
                        <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${dark ? "bg-site-mint" : "bg-site-accent"}`} />
                        {b.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Care plans — the one warm band on the page                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-site-sand py-24 lg:py-32">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-site-clay/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <Eyebrow>Care plans</Eyebrow>
              <h2 className={h2Class}>And then it keeps working</h2>
              <p className="mt-5 text-lg leading-relaxed text-site-body">
                Plenty of businesses have paid for software that broke six months later with
                nobody left to call. Every build comes with the option of a monthly care plan —
                a set number of hours each month, covering the unglamorous work that keeps
                software alive.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-site-body">
                It renews annually, and you can cancel with 30 days&rsquo; notice.{" "}
                <span className="font-semibold text-site-ink">No lock-in.</span>
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-lift ring-1 ring-site-clay/10 sm:p-10">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-site-mute">
                  Every care plan includes
                </p>
                <span className="rounded-full bg-site-sand px-3 py-1 text-xs font-semibold text-site-clay">
                  Monthly
                </span>
              </div>
              <ul className="mt-6 space-y-4">
                {MAINTENANCE_ITEMS.map((m) => (
                  <li key={m.num} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-site-mint text-site-accent">
                      <CheckIcon />
                    </span>
                    <span className="text-[15px] leading-relaxed text-site-body">{m.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works — sticky intro beside a vertical timeline            */}
      {/* ---------------------------------------------------------------- */}
      <section id="process" className="scroll-mt-24 bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>How it works</Eyebrow>
              <h2 className={h2Class}>Five steps, written down before we start.</h2>
              <p className="mt-5 text-lg leading-relaxed text-site-body">
                You always know what happens next and what it costs.
              </p>
              <a
                href="#contact"
                className="group mt-8 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-site-ink px-6 text-[15px] font-semibold text-white transition-colors hover:bg-site-accent"
              >
                Start a project
                <ArrowIcon />
              </a>
            </div>

            {/* The rule runs between node centres: nodes are h-11 (44px), so 22px in. */}
            <ol className="relative mt-14 before:absolute before:bottom-6 before:left-[1.375rem] before:top-6 before:w-px before:bg-site-line lg:mt-0">
              {PROCESS.map((p) => (
                <li key={p.step} className="group relative flex gap-6 pb-10 last:pb-0 sm:gap-8">
                  <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white font-mono text-sm font-medium text-site-accent shadow-soft ring-1 ring-site-line transition-colors group-hover:ring-site-accent/50">
                    {p.step}
                  </span>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-site-ink sm:text-xl">{p.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-site-body sm:text-base">{p.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Recent work — described, not named. No client branding is used    */}
      {/* publicly without their say-so. A horizontal, auto-advancing rail.  */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="work"
        className="relative scroll-mt-24 overflow-hidden bg-gradient-to-br from-site-deep to-site-forest py-24 text-white lg:py-32"
      >
        <DotGrid className="text-white/[0.06] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -left-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-site-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-site-clay/20 blur-3xl" />

        <div className="relative">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <Eyebrow tone="light">Recent work</Eyebrow>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Built for the way each business runs.
            </h2>
          </div>

          <div className="mt-12 lg:mt-14">
            <WorkCarousel items={WORK} />
          </div>

          <p className="mx-auto mt-8 max-w-6xl px-6 text-[15px] text-white/50 lg:px-8">
            Happy to make an introduction if you would like a reference.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Contact                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="contact"
        className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-white via-site-wash to-site-mint py-24 lg:py-32"
      >
        <div className="pointer-events-none absolute -left-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-site-clay/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="lg:pt-6">
              <Eyebrow>Start a project</Eyebrow>
              <h2 className={h2Class}>Tell us what you&rsquo;re dealing with</h2>
              <p className="mt-5 text-lg leading-relaxed text-site-body">
                You do not need a spec or a budget worked out. A rough description of the problem
                is plenty to start with — we will tell you honestly whether it is something we can
                help with.
              </p>

              <ul className="mt-8 space-y-3">
                {REASSURANCE.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-[15px] text-site-body">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-site-accent shadow-soft ring-1 ring-site-line">
                      <CheckIcon />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-[15px] text-site-body">
                Prefer email?{" "}
                <a href={`mailto:${SITE.email}`} className="font-semibold text-site-accent hover:underline">
                  {SITE.email}
                </a>
              </p>
            </div>

            <div className="rounded-3xl bg-white p-7 shadow-lift ring-1 ring-site-line sm:p-10">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
