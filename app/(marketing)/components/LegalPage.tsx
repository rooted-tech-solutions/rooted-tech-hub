import Link from "next/link";

/** Shared shell for the policy pages — same marketing type scale, prose width. */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="bg-white pb-24 pt-36 lg:pb-32 lg:pt-44">
      <div className="mx-auto max-w-2xl px-6 lg:px-8">
        <Link href="/" className="text-[15px] font-medium text-site-accent hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-site-ink sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-[15px] text-site-mute">Last updated {updated}</p>
        <div className="mt-12 space-y-8">{children}</div>
      </div>
    </article>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-site-ink">{heading}</h2>
      <div className="mt-3 space-y-3 text-[17px] leading-relaxed text-site-body">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[17px] leading-relaxed text-site-body">
          <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-site-accent/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
