import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { archiveInquiry, convertToClient, markRead, unarchiveInquiry } from "../actions";

export const dynamic = "force-dynamic";

function fmtDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Field({ label, value, href }: { label: string; value: string | null; href?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">{label}</p>
      {value ? (
        href ? (
          <a href={href} className="text-sm text-brand-mid hover:text-brand-dark transition-colors font-medium">
            {value}
          </a>
        ) : (
          <p className="text-sm text-brand-dark">{value}</p>
        )
      ) : (
        <p className="text-sm text-gray-400">—</p>
      )}
    </div>
  );
}

export default async function InquiryDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!inquiry) notFound();

  // Opening it counts as reading it.
  if (inquiry.status === "new") {
    await markRead(inquiry.id);
  }

  const isArchived = inquiry.status === "archived";
  const isConverted = Boolean(inquiry.converted_client_id);

  return (
    <div className="p-8">
      <Link
        href="/dashboard/inbox"
        className="text-sm font-medium text-brand-mid hover:text-brand-dark transition-colors"
      >
        ← Back to inbox
      </Link>

      <div className="mt-4 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark tracking-tight">
            {inquiry.company || inquiry.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Received {fmtDateTime(inquiry.created_at)}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isConverted && (
            <form action={convertToClient}>
              <input type="hidden" name="id" value={inquiry.id} />
              <button
                type="submit"
                className="bg-brand-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-mid transition-colors shadow-sm"
              >
                Convert to client
              </button>
            </form>
          )}
          <form action={isArchived ? unarchiveInquiry : archiveInquiry}>
            <input type="hidden" name="id" value={inquiry.id} />
            <button
              type="submit"
              className="bg-white border border-brand-light text-brand-dark text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-brand-cream transition-colors"
            >
              {isArchived ? "Restore" : "Archive"}
            </button>
          </form>
        </div>
      </div>

      {searchParams.error === "convert" && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          Could not create the client record. Check the client list in case it was partly created.
        </p>
      )}

      {isConverted && (
        <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Converted to a client.{" "}
          <Link
            href={`/dashboard/clients/${inquiry.converted_client_id}`}
            className="font-semibold hover:underline"
          >
            Open the client record →
          </Link>
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="bg-white rounded-2xl border border-brand-light p-6 shadow-sm space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Contact</p>
          <Field label="Name" value={inquiry.name} />
          <Field label="Email" value={inquiry.email} href={`mailto:${inquiry.email}`} />
          <Field
            label="Phone"
            value={inquiry.phone}
            href={inquiry.phone ? `tel:${String(inquiry.phone).replace(/[^0-9]/g, "")}` : undefined}
          />
          <Field label="Business" value={inquiry.company} />
        </div>

        <div className="bg-white rounded-2xl border border-brand-light p-6 shadow-sm space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Enquiry</p>
          <Field label="Looking for" value={inquiry.project_type} />
          <Field label="Budget" value={inquiry.budget_range} />
          <Field label="Source" value={inquiry.source} />
        </div>

        <div className="bg-white rounded-2xl border border-brand-light p-6 shadow-sm lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Message</p>
          {inquiry.message ? (
            <p className="mt-3 text-sm text-brand-dark leading-relaxed whitespace-pre-wrap">
              {inquiry.message}
            </p>
          ) : (
            <p className="mt-3 text-sm text-gray-400">No message left.</p>
          )}
        </div>
      </div>

      <div className="mt-5 bg-white rounded-2xl border border-brand-light p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Reply</p>
        <p className="mt-2 text-sm text-gray-500">
          The alert email for this inquiry has {inquiry.name}&rsquo;s address set as its reply-to, so
          replying to it goes straight back to them.
        </p>
        <a
          href={`mailto:${inquiry.email}?subject=${encodeURIComponent(
            `Re: your enquiry to Rooted Tech Solutions`,
          )}`}
          className="inline-block mt-4 bg-brand-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-mid transition-colors"
        >
          Email {inquiry.name.split(/\s+/)[0]}
        </a>
      </div>
    </div>
  );
}
