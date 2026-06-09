import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteContractRecord, sendContract } from "../actions";
import { fmtMoney } from "../../quotes/lineItems";
import { contractClauses, type ContractSnapshot } from "../contractTerms";
import PrintButton from "@/components/ui/PrintButton";
import CopyButton from "@/components/ui/CopyButton";

function fmtDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ContractDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { from?: string } }) {
  const backHref = searchParams.from ?? "/dashboard/contracts";
  const backLabel = searchParams.from ? "← Back to Client" : "← Back to Contracts";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, clients(id, name, company, email, phone), quotes(id, title)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!contract) notFound();

  const snapshot = contract.snapshot as ContractSnapshot;
  const clauses = contractClauses(snapshot);
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3003";
  const proto = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const signLink = `${proto}://${host}/sign/${contract.sign_token}`;

  async function handleSend() {
    "use server";
    await sendContract(contract!.id);
  }

  async function handleDelete() {
    "use server";
    await deleteContractRecord(contract!.id);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href={backHref} className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
            {backLabel}
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-brand-dark">
              Contract — {contract.clients?.company || contract.clients?.name || "Untitled"}
            </h1>
          </div>
          {contract.quotes?.title && (
            <Link href={`/dashboard/quotes/${contract.quotes.id}`} className="text-sm text-brand-mid hover:text-brand-dark transition-colors mt-1 inline-block">
              From quote: {contract.quotes.title}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <form action={handleDelete}>
            <button type="submit" className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors px-2 py-2">
              Delete
            </button>
          </form>
        </div>
      </div>

      {/* Status / signing info */}
      <div className="grid grid-cols-2 gap-6 max-w-4xl mb-7">
        <div className="bg-white rounded-2xl border border-brand-light p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-mid mb-3">Lifecycle</p>
          <div className="space-y-2 text-sm">
            <p className="text-brand-dark"><span className="font-medium">Created:</span> {fmtDateTime(contract.created_at)}</p>
            <p className="text-brand-dark"><span className="font-medium">Sent:</span> {fmtDateTime(contract.sent_at)}</p>
            <p className="text-brand-dark"><span className="font-medium">Signed:</span> {fmtDateTime(contract.signed_at)}</p>
            {contract.signed_name && (
              <p className="text-brand-dark"><span className="font-medium">Signed by:</span> {contract.signed_name} {contract.signed_ip && <span className="text-gray-400">({contract.signed_ip})</span>}</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-brand-light p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-mid mb-3">Signing Link</p>
          {contract.status === "draft" ? (
            <p className="text-sm text-gray-400">Mark this contract as sent to generate an active signing link to share with the client.</p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-2">Share this link with the client — they can review and sign without an account.</p>
              <code className="block text-xs text-brand-dark bg-brand-cream border border-brand-light rounded-lg px-3 py-2 break-all">
                {signLink}
              </code>
              <CopyButton text={signLink} label="Copy signing link" />
            </>
          )}
        </div>
      </div>

      {/* Document */}
      <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden max-w-4xl">
        <div className="px-9 pt-7 pb-5 border-b-[2.5px] border-brand-dark">
          <p className="text-[20px] font-bold text-brand-brown uppercase tracking-wide mb-1.5">Service Agreement</p>
          <p className="text-sm text-gray-500">
            Between Rooted Tech Solutions and {snapshot.client_company || snapshot.client_name || "Client"}
            {snapshot.project_name ? ` — ${snapshot.project_name}` : ""}
          </p>
        </div>
        <div className="px-9 pt-6 pb-8">
          <div className="space-y-5">
            {clauses.map((clause) => (
              <div key={clause.title}>
                <p className="text-sm font-bold text-brand-dark mb-1">{clause.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{clause.body}</p>
              </div>
            ))}
          </div>

          {contract.signed_name && (
            <div className="mt-8 border-t border-brand-light pt-5">
              <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-2">Signed</p>
              <p className="text-2xl text-brand-dark" style={{ fontFamily: "cursive" }}>{contract.signed_name}</p>
              <p className="text-xs text-gray-400 mt-1">{fmtDateTime(contract.signed_at)} · IP {contract.signed_ip}</p>
            </div>
          )}
        </div>
        <div className="border-t border-brand-light px-8 py-4 text-center text-xs text-gray-400 bg-brand-cream">
          Rooted Tech Solutions · rootedtechsolutions.com
        </div>
      </div>
    </div>
  );
}
