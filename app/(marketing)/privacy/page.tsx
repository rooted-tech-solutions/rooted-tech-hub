import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import LegalPage, { Bullets, Section } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} collects, uses, and protects your information.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 31, 2026">
      <Section heading="Who this covers">
        <p>
          {SITE.name} is a one-person software business. This policy explains what information is
          collected through this website and the client portal, why, and what happens to it. Any
          questions, email{" "}
          <a href={`mailto:${SITE.email}`} className="font-medium text-site-accent hover:underline">
            {SITE.email}
          </a>
          .
        </p>
      </Section>

      <Section heading="What is collected">
        <p>When you submit the inquiry form on this site:</p>
        <Bullets
          items={[
            "Your name and email address, which are required to reply to you.",
            "Your business name, phone number, project type, and budget range, if you choose to provide them.",
            "Whatever you write in the message field.",
            "The IP address the submission came from, used only to rate-limit the form against automated abuse.",
          ]}
        />
        <p>If you become a client and use the portal:</p>
        <Bullets
          items={[
            "The email address you sign in with.",
            "Your business contact details, project records, quotes, and invoices.",
            "When you sign an agreement electronically: the name you type, the date and time, and the IP address it was signed from. This is what makes the signature legally meaningful.",
          ]}
        />
      </Section>

      <Section heading="What is not collected">
        <p>
          There are no advertising trackers, no analytics profiling, and no third-party cookies on
          this site. There is no mailing list — your details are not added to one, and you will not
          receive marketing email as a result of contacting me.
        </p>
        <p>
          Payment card details are never seen or stored. Payments are handled entirely by Stripe on
          their own systems.
        </p>
      </Section>

      <Section heading="Who else handles your data">
        <p>Running this business requires a handful of service providers:</p>
        <Bullets
          items={[
            "Vercel — hosts this website and the client portal.",
            "Supabase — hosts the database where inquiries and client records are stored.",
            "Resend — delivers notification email.",
            "Stripe — processes payments and holds all payment card information.",
            "Cloudflare — provides the anti-spam check on the inquiry form.",
          ]}
        />
        <p>
          Your information is not sold, rented, or shared with anyone beyond the providers above,
          except where required by law.
        </p>
      </Section>

      <Section heading="How long it is kept">
        <p>
          Inquiries that do not lead to work are deleted once they are clearly no longer relevant.
          Client records, signed agreements, and invoices are kept for as long as needed to deliver
          the work and to meet tax and legal record-keeping obligations.
        </p>
      </Section>

      <Section heading="Your choices">
        <p>
          You can ask what information is held about you, ask for it to be corrected, or ask for it
          to be deleted. Email{" "}
          <a href={`mailto:${SITE.email}`} className="font-medium text-site-accent hover:underline">
            {SITE.email}
          </a>{" "}
          and it will be handled promptly. Records that must be retained for legal or accounting
          reasons are the one exception.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this policy changes, the revised version will be posted here with a new date at the
          top.
        </p>
      </Section>
    </LegalPage>
  );
}
