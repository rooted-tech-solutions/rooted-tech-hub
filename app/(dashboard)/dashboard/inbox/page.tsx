import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_CLASSES: Record<string, string> = {
  new: "bg-brand-light text-brand-dark ring-1 ring-brand-mid/20",
  read: "bg-gray-50 text-gray-500 ring-1 ring-gray-200",
  converted: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  archived: "bg-gray-50 text-gray-400 ring-1 ring-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  read: "Read",
  converted: "Converted",
  archived: "Archived",
};

function fmtWhen(value: string) {
  const then = new Date(value);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: { show?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const showArchived = searchParams.show === "archived";

  const { data: allInquiries } = await supabase
    .from("inquiries")
    .select("id, name, email, company, project_type, budget_range, status, created_at")
    .order("created_at", { ascending: false });

  const inquiries = (allInquiries ?? []).filter((i) =>
    showArchived ? i.status === "archived" : i.status !== "archived",
  );

  const total = allInquiries?.length ?? 0;
  const unread = (allInquiries ?? []).filter((i) => i.status === "new").length;
  const converted = (allInquiries ?? []).filter((i) => i.status === "converted").length;

  return (
    <div className="p-4 md:p-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand-mid to-brand-mid/80 text-white px-8 py-7 mb-7 shadow-lg shadow-brand-mid/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-brand-brown/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-light/70 mb-1.5">Leads</p>
            <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
            <p className="text-sm text-brand-light/80 mt-1.5">
              {unread} unread · {total} inquir{total === 1 ? "y" : "ies"} from the website
            </p>
          </div>
          <Link
            href={showArchived ? "/dashboard/inbox" : "/dashboard/inbox?show=archived"}
            className="bg-white/10 backdrop-blur-sm ring-1 ring-white/15 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-white/20 transition-colors flex-shrink-0"
          >
            {showArchived ? "← Back to inbox" : "View archived"}
          </Link>
        </div>

        <div className="relative grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "Unread", value: unread },
            { label: "Total Inquiries", value: total },
            { label: "Converted to Clients", value: converted },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 px-4 py-3">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-brand-light/70 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {inquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-light p-10 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            {showArchived ? "Nothing archived." : "No inquiries yet."}
          </p>
          {!showArchived && (
            <p className="text-xs text-gray-400 mt-1.5">
              Submissions from the contact form on your website will land here.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-light overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-light text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">From</th>
                <th className="px-5 py-3 font-medium">Looking for</th>
                <th className="px-5 py-3 font-medium">Budget</th>
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => {
                const label = inq.company || inq.name;
                const isNew = inq.status === "new";
                return (
                  <tr
                    key={inq.id}
                    className="border-b border-brand-light last:border-0 hover:bg-brand-cream/60 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/inbox/${inq.id}`} className="flex items-center gap-3 group">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-mid to-brand-dark text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 shadow-sm">
                          {initials(label)}
                        </span>
                        <div>
                          <span
                            className={`block text-brand-dark group-hover:text-brand-mid transition-colors ${
                              isNew ? "font-semibold" : "font-medium"
                            }`}
                          >
                            {label}
                          </span>
                          <span className="text-xs text-gray-400">{inq.email}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{inq.project_type || "—"}</td>
                    <td className="px-5 py-3 text-gray-600">{inq.budget_range || "—"}</td>
                    <td className="px-5 py-3 text-gray-600">{fmtWhen(inq.created_at)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          STATUS_CLASSES[inq.status] ?? STATUS_CLASSES.read
                        }`}
                      >
                        {STATUS_LABELS[inq.status] ?? inq.status}
                      </span>
                    </td>
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
