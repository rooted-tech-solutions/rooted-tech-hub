import { BUILD_ITEMS, MAINTENANCE_ITEMS } from "@/app/(dashboard)/dashboard/quotes/lineItems";
import { SITE } from "@/lib/site";
import ContactForm from "./ContactForm";

/**
 * Services are grouped from BUILD_ITEMS rather than restated, so the public
 * page and the quote builder can never drift apart — what the site advertises
 * is literally what gets quoted.
 */
const PHASES = [
  {
    title: "Plan",
    blurb:
      "Before anything is built, we work out what you actually do day to day — and where the software should fit into it.",
    items: ["1.1", "1.2"],
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    ),
  },
  {
    title: "Build",
    blurb:
      "The application itself — the screens your team uses, the logic underneath, and connections to the tools you already pay for.",
    items: ["1.3", "1.4", "1.5", "1.6"],
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
    ),
  },
  {
    title: "Launch",
    blurb:
      "Tested, deployed, and handed over with documentation — so you are never locked out of something you paid for.",
    items: ["1.7", "1.8", "1.9"],
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
    body: "A written document listing exactly what is being built, what is not, and what I need from you. No surprises later.",
  },
  {
    step: "03",
    title: "A fixed quote and contract",
    body: "One price for the build, signed online. Anything outside the agreed scope gets quoted separately before it is started — never billed as a surprise.",
  },
  {
    step: "04",
    title: "I build it",
    body: "Half up front, half on delivery and acceptance. You see progress as it goes, not at the very end.",
  },
  {
    step: "05",
    title: "It keeps working",
    body: "A monthly care plan covers hosting, security updates, backups, and support, so the thing you paid for does not quietly rot.",
  },
] as const;

export default function MarketingHome() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-site-mint via-site-wash to-white pb-24 pt-36 lg:pb-32 lg:pt-44">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/50 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-white/40 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-site-accent">
            Custom software · Built to enable your growth
          </p>
          <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-site-ink sm:text-5xl lg:text-6xl">
            Software that fits how you work.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-site-body sm:text-xl">
            I build reliable systems that make operations more efficient: automating manual
            processes, consolidating your information into a single source of truth, and
            providing the visibility to make confident decisions.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#contact"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-site-accent px-8 text-base font-semibold text-white shadow-lift transition-colors hover:bg-site-deep sm:w-auto"
            >
              Start a project
            </a>
            <a
              href="#services"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-site-ink shadow-soft transition-colors hover:bg-site-wash sm:w-auto"
            >
              See what I build
            </a>
          </div>

          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-site-mute">
            The first conversation is free. Send the form with no obligation and I&rsquo;ll
            follow up with you personally, at no cost.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* What I build                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section id="services" className="scroll-mt-24 bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-site-ink sm:text-4xl lg:text-5xl">
              What I build
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-site-body">
              A complete application, start to finish. One person doing the whole job means
              nothing gets lost in a handoff between agencies.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {PHASES.map((phase) => (
              <div key={phase.title} className="rounded-3xl bg-site-wash p-8 shadow-soft">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-site-mint">
                  <svg
                    className="h-7 w-7 text-site-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                  >
                    {phase.icon}
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-bold text-site-ink">{phase.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-site-body">{phase.blurb}</p>
                <ul className="mt-6 space-y-2 border-t border-site-line pt-6">
                  {BUILD_ITEMS.filter((b) => (phase.items as readonly string[]).includes(b.num)).map((b) => (
                    <li key={b.num} className="text-[15px] text-site-body">
                      {b.desc}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Care plans                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-site-wash py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-site-ink sm:text-4xl lg:text-5xl">
                And then it keeps working
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-site-body">
                Plenty of businesses have paid for software that broke six months later with
                nobody left to call. Every build comes with the option of a monthly care plan —
                a set number of hours each month, covering the unglamorous work that keeps
                software alive.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-site-body">
                It renews annually, and you can cancel with 30 days&rsquo; notice. No lock-in.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-soft sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-site-mute">
                Every care plan includes
              </p>
              <ul className="mt-6 space-y-4">
                {MAINTENANCE_ITEMS.map((m) => (
                  <li key={m.num} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-site-mint">
                      <svg
                        className="h-3.5 w-3.5 text-site-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
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
      {/* How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section id="process" className="scroll-mt-24 bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-site-ink sm:text-4xl lg:text-5xl">
              How it works
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-site-body">
              Five steps, written down before we start. You always know what happens next and
              what it costs.
            </p>
          </div>

          <ol className="mx-auto mt-16 max-w-3xl space-y-4">
            {PROCESS.map((p) => (
              <li key={p.step} className="flex gap-5 rounded-3xl bg-site-wash p-7 shadow-soft sm:gap-7 sm:p-8">
                <span className="shrink-0 text-2xl font-bold tabular-nums text-site-accent/40 sm:text-3xl">
                  {p.step}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-site-ink sm:text-xl">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-site-body sm:text-base">
                    {p.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Recent work — described, not named. No client branding is used    */}
      {/* publicly without their say-so.                                    */}
      {/* ---------------------------------------------------------------- */}
      <section id="work" className="scroll-mt-24 bg-site-deep py-24 text-white lg:py-32">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
            Recent work
          </p>
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            A crane rental booking and job-tracking platform
          </h2>

          <div className="mt-12 grid gap-10 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                The problem
              </p>
              <p className="mt-3 text-[17px] leading-relaxed text-white/75">
                Bookings came in by phone and lived on a paper calendar. Operators logged hours on
                their own, invoices were assembled by hand at the end of a job, and nobody could
                say which crane was free next Tuesday without asking three people.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                What I built
              </p>
              <p className="mt-3 text-[17px] leading-relaxed text-white/75">
                A live availability calendar per machine with travel time built in, online quotes
                and waiver signing, a phone-friendly clock operators use on site across multi-day
                jobs, and invoices generated from the hours actually logged — at the rate the
                customer was originally quoted.
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap gap-2.5">
            {["Next.js", "TypeScript", "Supabase", "PDF invoicing", "Mobile-first", "E-signatures"].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80"
                >
                  {tag}
                </span>
              ),
            )}
          </div>

          <p className="mt-12 border-t border-white/10 pt-8 text-[15px] text-white/50">
            Client name withheld. Happy to make an introduction if you would like a reference.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Contact                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section id="contact" className="scroll-mt-24 bg-gradient-to-b from-white to-site-mint py-24 lg:py-32">
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-site-ink sm:text-4xl lg:text-5xl">
              Tell me what you&rsquo;re dealing with
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-site-body">
              You do not need a spec or a budget worked out. A rough description of the problem is
              plenty to start with — I will tell you honestly whether it is something I can help
              with.
            </p>
          </div>

          <div className="mt-12 rounded-3xl bg-white p-7 shadow-lift sm:p-10">
            <ContactForm />
          </div>

          <p className="mt-8 text-center text-[15px] text-site-body">
            Prefer email?{" "}
            <a href={`mailto:${SITE.email}`} className="font-semibold text-site-accent hover:underline">
              {SITE.email}
            </a>
          </p>

        </div>
      </section>
    </>
  );
}
