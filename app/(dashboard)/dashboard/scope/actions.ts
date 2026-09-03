"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeFrom } from "../backLink";
import { logEvent } from "@/lib/events";
import { updateWithOptional } from "@/lib/supabase/updateWithOptional";

export type SowItem = { item: string };

export type SowValues = {
  sow_number: string;
  title: string | null;
  status: string;
  client_id: string | null;
  quote_id: string | null;
  notes: string | null;
  deliverables: SowItem[];
  exclusions: SowItem[];
  assumptions: SowItem[];
  issued_date: string | null;
};

function fieldOrNull(formData: FormData, key: string): string | null {
  const val = formData.get(key);
  if (typeof val !== "string" || val.trim() === "") return null;
  return val.trim();
}

function parseJsonList(formData: FormData, key: string): SowItem[] {
  const raw = formData.get(key);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is { item: string } => x && typeof x.item === "string")
      .filter((x) => x.item.trim() !== "");
  } catch {
    return [];
  }
}

function parseSowFields(formData: FormData): SowValues | { error: string } {
  const sow_number = fieldOrNull(formData, "sow_number");
  if (!sow_number) return { error: "SOW number is required" };

  return {
    sow_number,
    title: fieldOrNull(formData, "title"),
    status: fieldOrNull(formData, "status") ?? "draft",
    client_id: fieldOrNull(formData, "client_id"),
    quote_id: fieldOrNull(formData, "quote_id"),
    notes: fieldOrNull(formData, "notes"),
    deliverables: parseJsonList(formData, "deliverables_json"),
    exclusions: parseJsonList(formData, "exclusions_json"),
    assumptions: parseJsonList(formData, "assumptions_json"),
    issued_date: fieldOrNull(formData, "issued_date"),
  };
}

export async function getNextSowNumber(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "SOW-001";

  const { data } = await supabase.rpc("get_next_sow_number", { p_user_id: user.id });
  return (data as string) ?? "SOW-001";
}

export async function createSowRecord(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseSowFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data: created, error } = await supabase
    .from("scope_of_work")
    .insert({ user_id: user.id, ...parsed })
    .select("id")
    .single();

  if (error) return { error: error.message };
  await logEvent(supabase, { userId: user.id, clientId: parsed.client_id, kind: "sow_created", summary: `Scope of work ${parsed.sow_number} created`, refType: "scope", refId: created?.id ?? null });

  const from = formData.get("from");
  revalidatePath("/dashboard/scope");
  revalidatePath("/dashboard/clients");
  redirect(safeFrom(from) ?? "/dashboard/scope");
}

export async function updateSowRecord(id: string, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseSowFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase
    .from("scope_of_work")
    .update(parsed)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  const from = formData.get("from");
  revalidatePath("/dashboard/scope");
  revalidatePath(`/dashboard/scope/${id}`);
  revalidatePath("/dashboard/clients");
  redirect(safeFrom(from) ?? `/dashboard/scope/${id}`);
}

export async function deleteSowRecord(id: string, from?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // An approved scope is what the client agreed to. It stays.
  const { data: existing } = await supabase
    .from("scope_of_work")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (existing?.status === "approved") redirect(safeFrom(from) ?? `/dashboard/scope/${id}`);

  await supabase.from("scope_of_work").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/scope");
  revalidatePath("/dashboard/clients");
  redirect(safeFrom(from) ?? "/dashboard/scope");
}

export async function updateSowStatus(id: string, status: string, clientId?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!["draft", "sent", "approved"].includes(status)) return;

  // Stamp the handoffs — see migration 009. Tolerates the column not existing yet.
  const now = new Date().toISOString();
  const stamp: Record<string, unknown> = {};
  if (status === "sent") stamp.sent_at = now;
  if (status === "approved") stamp.approved_at = now;
  await updateWithOptional(supabase, "scope_of_work", { id, user_id: user.id }, { status }, stamp);
  await logEvent(supabase, { userId: user.id, clientId: clientId ?? null, kind: "sow_status", summary: `Scope of work marked ${status}`, refType: "scope", refId: id });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/scope");
  revalidatePath(`/dashboard/scope/${id}`);
  if (clientId) revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/clients");
}
