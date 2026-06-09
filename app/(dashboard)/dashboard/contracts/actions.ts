"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildContractSnapshot } from "./contractTerms";

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

export async function deleteContractRecord(id: string, from?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("contracts").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/clients");
  redirect(from ?? "/dashboard/contracts");
}
