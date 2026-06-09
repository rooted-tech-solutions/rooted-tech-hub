import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "../quotes/statusBadge";

export default async function ScopeListPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sows } = await supabase
    .from("scope_of_work")
    .select("id, sow_number, title, status, issued_date, clients(name, company), quotes(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const total = sows?.length ?? 0;
  const approved = sows?.filter((s) => s.status === "approved").length ?? 0;
  const pending = sows?.filter((s) => s.status === "sent").length ?? 0;

  function fmtDate(val: string | null) {
    if (!val) return "—";
    return new Date(val + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="p-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand-mid to-brand-mid/80 text-white px-8 py-7 mb-7 shadow-lg shadow-brand-mid/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-light/70 mb-1.5">Documents</p>
            <h1 className="text-3xl font-bold tracking-tight">Scope of Work</h1>
            <p className="text-sm text-brand-light/80 mt-1.5">{total} document{total === 1 ? "" : "s"} · {pending} awaiting approval</p>
          </div>
          <Link
            href="/dashboard/scope/new"
            className="bg-white text-brand-dark text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-cream transition-colors shadow-md shadow-black/10 flex-shrink-0"
          >
            + New SOW
          </Link>
        </div>
        <div className="relative grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "Total", value: total },
            { label: "Awaiting Approval", value: pending },
            { label: "Approved", value: approved },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 px-4 py-3">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-brand-light/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {!sows || sows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-light p-10 text-center shadow-sm">
          <p className="text-sm text-gray-500">No scope documents yet.</p>
          <Link href="/dashboard/scope/new" className="inline-block mt-3 text-sm font-medium text-brand-mid hover:text-brand-dark transition-colors">
            Create your first SOW →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-light overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-light text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">SOW #</th>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sows.map((sow) => {
                const client = sow.clients as unknown as { name: string; company: string | null } | null;
                return (
                  <tr key={sow.id} className="border-b border-brand-light last:border-0 hover:bg-brand-cream/60 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{sow.sow_number}</td>
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/scope/${sow.id}`} className="font-medium text-brand-dark hover:text-brand-mid transition-colors">
                        {sow.title || "Untitled SOW"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{client?.company || client?.name || "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(sow.issued_date)}</td>
                    <td className="px-5 py-3"><StatusBadge status={sow.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
