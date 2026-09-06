"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeFrom } from "../backLink";
import { logEvent } from "@/lib/events";
import { buildContractSnapshot, type ContractSnapshot } from "./contractTerms";
import { publicOrigin } from "./links";
import { sendPackageEmail } from "@/lib/email";
import { packageEmailHtml, packageEmailSubject, packageEmailText, type PackageEmailInput } from "@/lib/emails/packageEmail";
import { updateWithOptional } from "@/lib/supabase/updateWithOptional";

export async function generateContractFromQuote(quoteId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: quote } = (await supabase
    .from("quotes")
    .select("id, client_id, project_name, scope, maintenance_items, monthly_retainer, build_total, clients(name, company)")
    .eq("id", quoteId)
    .eq("user_id", user.id)
    .single()) as unknown as {
    data: {
      id: string;
      client_id: string | null;
      project_name: string | null;
      scope: string | null;
      maintenance_items: import("../quotes/actions").LineItem[] | null;
      monthly_retainer: number | null;
      build_total: number | null;
      clients: { name: string | null; company: string | null } | null;
    } | null;
  };

  if (!quote) return { error: "Quote not found" };

  // One agreement per quote. A retry (or a double submit) lands on the existing one.
  const { data: existing } = await supabase
    .from("contracts")
    .select("id")
    .eq("user_id", user.id)
    .eq("quote_id", quote.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) redirect(`/dashboard/contracts/${existing.id}?from=/dashboard/clients/${quote.client_id}`);

  // Look up the most recent SOW for this client (prefer quote-linked, fallback to any)
  let sow: { sow_number: string; issued_date: string | null } | null = null;
  if (quote.client_id) {
    const { data: sowData } = await supabase
      .from("scope_of_work")
      .select("sow_number, issued_date")
      .eq("user_id", user.id)
      .eq("client_id", quote.client_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sow = sowData ?? null;
  }

  const snapshot = buildContractSnapshot(quote, quote.clients ?? null, sow);

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      user_id: user.id,
      quote_id: quote.id,
      client_id: quote.client_id,
      status: "draft",
      snapshot,
    })
    .select("id")
    .single();

  if (error || !contract) return { error: error?.message ?? "Could not create contract" };
  await logEvent(supabase, { userId: user.id, clientId: quote.client_id, kind: "contract_generated", summary: "Service agreement generated from the quote", refType: "contract", refId: contract.id });

  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/clients");
  if (quote.client_id) revalidatePath(`/dashboard/clients/${quote.client_id}`);
  redirect(`/dashboard/contracts/${contract.id}?from=/dashboard/clients/${quote.client_id}`);
}

export async function sendContract(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("contracts")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "draft");

  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${id}`);
  revalidatePath("/dashboard/clients");
}

/**
 * The one "send" in the pipeline. Quote, scope of work and agreement go to
 * the client together as a single signing link, so they leave together:
 * the contract becomes `sent` (which is what activates the link — the
 * signing RPC refuses anything else), the quote it was built from becomes
 * `sent`, and any draft scope for this client that is linked to that quote
 * (or to no quote at all) becomes `sent`. Already-advanced documents are
 * left alone, so sending twice is harmless — it simply emails the link again.
 *
 * Then the client is emailed the branded invitation with a "Review & sign"
 * button. That part is best effort: the documents are live either way, and
 * the page the owner lands on says whether the email went out and why not.
 */
export async function sendPackage(contractId: string, from?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contract } = (await supabase
    .from("contracts")
    .select("id, quote_id, client_id, status, sign_token, snapshot, clients(name, company, email)")
    .eq("id", contractId)
    .eq("user_id", user.id)
    .single()) as unknown as {
    data: {
      id: string;
      quote_id: string | null;
      client_id: string | null;
      status: string;
      sign_token: string;
      snapshot: Partial<ContractSnapshot> | null;
      clients: { name: string | null; company: string | null; email: string | null } | null;
    } | null;
  };
  if (!contract) redirect(withParams(safeFrom(from) ?? "/dashboard/clients", { package_error: "Contract not found." }));

  // Where the result lands: the caller's page if it is one of ours, else the client's page.
  const landing = safeFrom(from) ?? (contract.client_id ? `/dashboard/clients/${contract.client_id}` : `/dashboard/contracts/${contract.id}`);
  const now = new Date().toISOString();
  const outcome: "sent" | "resent" = contract.status === "draft" ? "sent" : "resent";

  if (contract.status === "draft") {
    await supabase
      .from("contracts")
      .update({ status: "sent", sent_at: now })
      .eq("id", contract.id)
      .eq("user_id", user.id);
  }

  if (contract.quote_id) {
    await updateWithOptional(
      supabase,
      "quotes",
      { id: contract.quote_id, user_id: user.id, status: "draft" },
      { status: "sent" },
      { sent_at: now },
    );
  }

  if (contract.client_id) {
    const { data: sows } = await supabase
      .from("scope_of_work")
      .select("id, status, quote_id")
      .eq("user_id", user.id)
      .eq("client_id", contract.client_id);
    for (const sow of sows ?? []) {
      const belongs = sow.quote_id === contract.quote_id || sow.quote_id === null;
      if (sow.status === "draft" && belongs) {
        await updateWithOptional(supabase, "scope_of_work", { id: sow.id, user_id: user.id }, { status: "sent" }, { sent_at: now });
      }
    }
  }

  // The invitation. The link uses the public origin, never the request host —
  // a link to localhost in a client's inbox goes nowhere.
  const to = contract.clients?.email?.trim() || null;
  let emailed = false;
  let transport: string | null = null;
  let note: string | null = to ? null : "the client has no email address on file";
  if (to) {
    const input: PackageEmailInput = {
      origin: publicOrigin(),
      signUrl: `${publicOrigin()}/sign/${contract.sign_token}`,
      client: { name: contract.clients?.name ?? null, company: contract.clients?.company ?? null },
      snapshot: contract.snapshot ?? {},
    };
    const result = await sendPackageEmail({ to, subject: packageEmailSubject(input), html: packageEmailHtml(input), text: packageEmailText(input) });
    emailed = result.sent;
    transport = result.via ?? null;
    note = result.sent ? null : result.reason ?? "unknown error";
  }

  await logEvent(supabase, {
    userId: user.id,
    clientId: contract.client_id,
    kind: "package_sent",
    summary:
      `Package ${outcome === "resent" ? "re-sent" : "sent"} — quote, scope of work and agreement, one signing link` +
      (emailed ? ` — emailed to ${to}${transport ? ` via ${transport}` : ""}` : ` — email not sent (${note})`),
    refType: "contract",
    refId: contract.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${contract.id}`);
  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/scope");
  revalidatePath("/dashboard/clients");
  if (contract.client_id) revalidatePath(`/dashboard/clients/${contract.client_id}`);
  redirect(withParams(landing, { package: outcome, emailed: emailed ? "1" : "0", ...(transport ? { transport } : {}), ...(note ? { note } : {}) }));
}

/** `path` with `params` set on its query string, whatever it already carries. */
function withParams(path: string, params: Record<string, string>) {
  const url = new URL(path, "http://hub.local");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.pathname + url.search;
}

export async function deleteContractRecord(id: string, from?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // A signed agreement is a record of what the client agreed to. It stays.
  const { data: existing } = await supabase
    .from("contracts")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (existing?.status === "signed") redirect(safeFrom(from) ?? `/dashboard/contracts/${id}`);

  await supabase.from("contracts").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/clients");
  redirect(safeFrom(from) ?? "/dashboard/contracts");
}
