import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "../quotes/statusBadge";

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

type ContractRow = {
  id: string;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  signed_name: string | null;
  created_at: string;
  clients: { id: string; name: string | null; company: string | null } | null;
  quotes: { id: string; title: string } | null;
};

export default async function ContractsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: contracts } = (await supabase
    .from("contracts")
    .select("id, status, sent_at, signed_at, signed_name, created_at, clients(id, name, company), quotes(id, title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })) as unknown as { data: ContractRow[] | null };

  const total = contracts?.length ?? 0;
  const awaitingSignature = contracts?.filter((c) => c.status === "sent").length ?? 0;
  const signed = contracts?.filter((c) => c.status === "signed").length ?? 0;

  return (
    <div className="p-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand-mid to-brand-mid/80 text-white px-8 py-7 mb-7 shadow-lg shadow-brand-mid/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-brand-brown/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-light/70 mb-1.5">Agreements</p>
          <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
          <p className="text-sm text-brand-light/80 mt-1.5">Generated from quotes — sent and signed electronically by clients</p>
        </div>
        <div className="relative grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "Total Contracts", value: total },
            { label: "Awaiting Signature", value: awaitingSignature },
            { label: "Signed", value: signed },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 px-4 py-3">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-brand-light/70 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {!contracts || contracts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-light p-10 text-center shadow-sm">
          <p className="text-sm text-gray-500">No contracts yet.</p>
          <p className="text-xs text-gray-400 mt-1">Generate one from a quote to get started.</p>
          <Link href="/dashboard/quotes" className="inline-block mt-3 text-sm font-medium text-brand-mid hover:text-brand-dark transition-colors">
            View quotes →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-light overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-light text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Linked Quote</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Sent</th>
                <th className="px-5 py-3 font-medium">Signed</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id} className="border-b border-brand-light last:border-0 hover:bg-brand-cream/60 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/contracts/${contract.id}`} className="font-medium text-brand-dark hover:text-brand-mid transition-colors">
                      {contract.clients?.company || contract.clients?.name || "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {contract.quotes?.title ? (
                      <Link href={`/dashboard/quotes/${contract.quotes.id}`} className="text-brand-mid hover:text-brand-dark transition-colors">
                        {contract.quotes.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={contract.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-600">{fmtDate(contract.sent_at)}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {contract.signed_at ? `${fmtDate(contract.signed_at)} · ${contract.signed_name}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
