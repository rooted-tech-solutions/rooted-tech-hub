import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import LegalPage, { Bullets, Section } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that apply to using this website and working with ${SITE.name}.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 31, 2026">
      <Section heading="What these terms cover">
        <p>
          These terms apply to your use of this website. Project work is governed by the separate
          written agreement signed before that work begins — a scope of work document and a
          contract. Where those documents and this page differ, the signed agreement controls.
        </p>
      </Section>

      <Section heading="Using this site">
        <p>
          You are welcome to read this site and use the inquiry form to get in touch. Please do not
          use it to send unlawful, abusive, or deliberately misleading content, attempt to gain
          access to the client portal or the systems behind it, or submit the form through
          automated means.
        </p>
      </Section>

      <Section heading="Inquiries are not a contract">
        <p>
          Submitting the form starts a conversation, nothing more. It does not create a binding
          agreement, does not reserve capacity, and does not commit either side to anything. Work
          begins only once a scope of work and contract have been signed and any required deposit
          has been paid.
        </p>
      </Section>

      <Section heading="How project work is agreed">
        <p>For reference, the standard shape of an engagement is:</p>
        <Bullets
          items={[
            "A scope of work document setting out exactly what is being built, what is excluded, and what you need to provide.",
            "A fixed quote covering the build, and where applicable a monthly care plan covering ongoing maintenance.",
            "Payment split into a deposit due on signing and a final payment due on delivery and acceptance.",
            "Work outside the agreed scope quoted separately and approved before it is started.",
            "Care plans renewing annually, cancellable by either side with 30 days' written notice.",
          ]}
        />
        <p>
          The signed agreement for your project sets the actual terms. Nothing on this page changes
          it.
        </p>
      </Section>

      <Section heading="Ownership">
        <p>
          The content of this site — text, layout, and graphics — belongs to {SITE.name}. Ownership
          of anything built for a client is set out in that client&rsquo;s own agreement, not here.
        </p>
      </Section>

      <Section heading="No guarantees about this site">
        <p>
          This site is provided as is. Reasonable effort goes into keeping it accurate and
          available, but it is not warranted to be error-free or uninterrupted, and nothing on it is
          professional advice for your particular situation.
        </p>
      </Section>

      <Section heading="Getting in touch">
        <p>
          Questions about these terms can go to{" "}
          <a href={`mailto:${SITE.email}`} className="font-medium text-site-accent hover:underline">
            {SITE.email}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
