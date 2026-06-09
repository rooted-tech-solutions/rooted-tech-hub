import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteSowRecord } from "../actions";
import PrintButton from "@/components/ui/PrintButton";
import type { SowItem } from "../actions";

function fmtDate(val: string | null) {
  if (!val) return "—";
  return new Date(val + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function Section({ title, items, emptyText }: { title: string; items: SowItem[]; emptyText: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-brand-dark mb-2 pb-1 border-b border-brand-light">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-brand-mid font-bold mt-0.5 flex-shrink-0">•</span>
              {item.item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function SowDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string };
}) {
  const backHref = searchParams.from ?? "/dashboard/scope";
  const backLabel = searchParams.from ? "← Back to Client" : "← Back to Scope Docs";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sow } = await supabase
    .from("scope_of_work")
    .select("*, clients(id, name, company, email), quotes(id, title)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!sow) notFound();

  const deliverables = (sow.deliverables ?? []) as SowItem[];
  const exclusions = (sow.exclusions ?? []) as SowItem[];
  const assumptions = (sow.assumptions ?? []) as SowItem[];
  const client = sow.clients as { id: string; name: string; company: string | null; email: string | null } | null;
  const quote = sow.quotes as { id: string; title: string } | null;

  async function handleDelete() {
    "use server";
    await deleteSowRecord(sow!.id, searchParams.from);
  }

  return (
    <div className="p-8">
      {/* Action bar */}
      <div className="mb-6 flex items-start justify-between print:hidden">
        <div>
          <Link href={backHref} className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
            {backLabel}
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-brand-dark">
              {sow.title || sow.sow_number}
            </h1>
          </div>
          {quote && (
            <Link href={`/dashboard/quotes/${quote.id}?from=/dashboard/scope/${sow.id}`} className="text-sm text-brand-mid hover:text-brand-dark transition-colors mt-1 inline-block">
              Linked to: {quote.title}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <PrintButton label="Download PDF" />
          <Link
            href={`/dashboard/scope/${sow.id}/edit${searchParams.from ? `?from=${searchParams.from}` : ""}`}
            className="bg-brand-mid text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
          >
            Edit
          </Link>
          <form action={handleDelete}>
            <button type="submit" className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors px-2 py-2">
              Delete
            </button>
          </form>
        </div>
      </div>

      {/* Document */}
      <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden max-w-4xl">
        {/* Header */}
        <div className="px-9 pt-7 pb-5 flex items-start justify-between gap-5 border-b-[2.5px] border-brand-dark">
          <div>
            <p className="text-[20px] font-bold text-brand-brown uppercase tracking-wide mb-1.5">
              Scope of Work
            </p>
            <p className="text-sm text-gray-500">
              {client?.company || client?.name || "Client"}{sow.title ? ` — ${sow.title}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Image src="/logo.png" alt="Rooted Tech Solutions" width={200} height={92} className="h-16 w-auto" />
            <div className="text-right text-[11px] text-gray-500 space-y-0.5 mt-1">
              <p><span className="font-medium">Document:</span> <span className="font-mono text-brand-dark">{sow.sow_number}</span></p>
              <p><span className="font-medium">Date:</span> <span className="text-brand-dark">{fmtDate(sow.issued_date)}</span></p>
              <p><span className="font-medium">Prepared for:</span> <span className="text-brand-dark">{client?.company || client?.name || "—"}</span></p>
            </div>
          </div>
        </div>

        <div className="px-9 pt-6 pb-8 space-y-8">
          {/* Discovery notes */}
          {sow.notes && (
            <div>
              <p className="text-sm font-bold text-brand-dark mb-2 pb-1 border-b border-brand-light">
                Project Overview &amp; Discovery Notes
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{sow.notes}</p>
            </div>
          )}

          {/* Deliverables */}
          <Section
            title="Deliverables — What Is Included"
            items={deliverables}
            emptyText="No deliverables listed."
          />

          {/* Exclusions */}
          <Section
            title="Exclusions — What Is NOT Included"
            items={exclusions}
            emptyText="No exclusions listed."
          />

          {/* Assumptions */}
          <Section
            title="Assumptions &amp; Client Responsibilities"
            items={assumptions}
            emptyText="No assumptions listed."
          />

          {/* Scope creep notice */}
          <div className="bg-brand-cream border border-brand-light rounded-lg px-5 py-4">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-1.5">Scope Change Policy</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Any work requested outside the deliverables listed above — or beyond the allocated monthly hours defined in the accompanying service agreement — is considered a scope change. Scope changes will be assessed, quoted in writing, and require written approval before work begins. Rooted Tech Solutions will not perform out-of-scope work without a signed change order.
            </p>
          </div>

          {/* Signature / approval line */}
          <div className="border-t border-brand-light pt-6">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-4">
              Acknowledgement
            </p>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              By signing the accompanying Service Agreement, the client confirms they have reviewed this Scope of Work document ({sow.sow_number}, dated {fmtDate(sow.issued_date)}) and agree that it accurately represents the agreed services.
            </p>
            <div className="grid grid-cols-2 gap-10">
              <div>
                <div className="h-10 border-b border-gray-300" />
                <p className="text-xs text-gray-400 mt-1.5">Rooted Tech Solutions · Date</p>
              </div>
              <div>
                <div className="h-10 border-b border-gray-300" />
                <p className="text-xs text-gray-400 mt-1.5">{client?.company || client?.name || "Client"} · Date</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-brand-light px-8 py-4 text-center text-xs text-gray-400 bg-brand-cream">
          Rooted Tech Solutions · rootedtechsolutions.com
        </div>
      </div>
    </div>
  );
}
