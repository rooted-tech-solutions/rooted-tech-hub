"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/events";
import { buildContractSnapshot } from "./contractTerms";
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
 * left alone, so sending twice is harmless.
 */
export async function sendPackage(contractId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, quote_id, client_id, status")
    .eq("id", contractId)
    .eq("user_id", user.id)
    .single();
  if (!contract) return { error: "Contract not found" };

  const now = new Date().toISOString();

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

  await logEvent(supabase, { userId: user.id, clientId: contract.client_id, kind: "package_sent", summary: "Package sent — quote, scope of work and agreement, one signing link", refType: "contract", refId: contract.id });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${contract.id}`);
  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/scope");
  revalidatePath("/dashboard/clients");
  if (contract.client_id) revalidatePath(`/dashboard/clients/${contract.client_id}`);
  return { ok: true };
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
  if (existing?.status === "signed") redirect(from ?? `/dashboard/contracts/${id}`);

  await supabase.from("contracts").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/clients");
  redirect(from ?? "/dashboard/contracts");
}
