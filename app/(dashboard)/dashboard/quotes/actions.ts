"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeFrom } from "../backLink";
import { logEvent } from "@/lib/events";
import { updateWithOptional } from "@/lib/supabase/updateWithOptional";

const STATUSES = ["draft", "sent", "accepted", "declined", "expired"] as const;

export type LineItem = { num: string; desc: string; hours: number; rate: number };

function fieldOrNull(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function parseLineItemsJson(formData: FormData, key: string): LineItem[] {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item) => ({
      num: typeof item.num === "string" ? item.num : "",
      desc: typeof item.desc === "string" ? item.desc : "",
      hours: Number(item.hours) || 0,
      rate: Number(item.rate) || 0,
    }))
    .filter((item) => item.desc.trim() !== "");
}

function sumLineItems(items: LineItem[]) {
  return items.reduce((sum, item) => sum + item.hours * item.rate, 0);
}

/** Until migration 011 runs, the new Maintenance & Hosting columns do not exist. */
function saveError(error: { code?: string; message: string }) {
  if ((error.code === "PGRST204" || error.code === "42703") && /maintenance_(annual|description)/.test(error.message)) {
    return "Run supabase/migrations/011_maintenance_hosting.sql in Supabase first — the quote's Maintenance & Hosting price has nowhere to be saved until then.";
  }
  return error.message;
}

function parseQuoteFields(formData: FormData) {
  const title = fieldOrNull(formData, "title");
  if (!title) return { error: "Title is required" } as const;

  const status = fieldOrNull(formData, "status") ?? "draft";
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { error: "Invalid status" } as const;
  }

  // Change orders (migration 010): a quote that modifies an existing agreement.
  // Only sent by the change-order form; ordinary quotes leave the DB default.
  const kind = fieldOrNull(formData, "kind");
  if (kind && kind !== "proposal" && kind !== "change_order") return { error: "Invalid quote kind" } as const;
  const extra = kind ? { kind, contract_id: fieldOrNull(formData, "contract_id") } : {};

  const build_items = parseLineItemsJson(formData, "build_items_json");
  const build_total = sumLineItems(build_items);

  // Maintenance & Hosting (migration 011): one yearly price and what it covers.
  // The itemized monthly care plan is retired; monthly_retainer is kept as the
  // yearly price ÷ 12 only so anything still reading the old column stays sane.
  const annualRaw = fieldOrNull(formData, "maintenance_annual");
  const maintenance_annual = annualRaw === null ? 0 : Number(annualRaw.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(maintenance_annual) || maintenance_annual < 0) {
    return { error: "Maintenance & Hosting must be a yearly dollar amount" } as const;
  }
  const maintenance_description = fieldOrNull(formData, "maintenance_description");
  const monthly_retainer = Math.round((maintenance_annual / 12) * 100) / 100;

  return {
    values: {
      title,
      client_id: fieldOrNull(formData, "client_id"),
      status,
      project_name: fieldOrNull(formData, "project_name"),
      scope: fieldOrNull(formData, "scope"),
      timeline: fieldOrNull(formData, "timeline"),
      prepared_by: fieldOrNull(formData, "prepared_by"),
      valid_for: fieldOrNull(formData, "valid_for") ?? "30 days",
      issued_date: fieldOrNull(formData, "issued_date"),
      expiry_date: fieldOrNull(formData, "expiry_date"),
      notes: fieldOrNull(formData, "notes"),
      build_items,
      maintenance_items: [] as LineItem[],
      maintenance_annual,
      maintenance_description,
      build_total,
      monthly_retainer,
      amount: build_total,
      ...extra,
    },
  } as const;
}

export async function createQuoteRecord(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseQuoteFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data: created, error } = await supabase
    .from("quotes")
    .insert({ user_id: user.id, ...parsed.values })
    .select("id")
    .single();

  if (error) return { error: saveError(error) };
  await logEvent(supabase, { userId: user.id, clientId: parsed.values.client_id, kind: "quote_created", summary: `Quote “${parsed.values.title}” created`, refType: "quote", refId: created?.id ?? null });

  const from = formData.get("from");
  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/clients");
  redirect(safeFrom(from) ?? "/dashboard/quotes");
}

export async function updateQuoteRecord(id: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseQuoteFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase
    .from("quotes")
    .update(parsed.values)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: saveError(error) };

  const from = formData.get("from");
  revalidatePath("/dashboard/quotes");
  revalidatePath(`/dashboard/quotes/${id}`);
  revalidatePath("/dashboard/clients");
  redirect(safeFrom(from) ?? `/dashboard/quotes/${id}`);
}

export async function deleteQuoteRecord(id: string, from?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // A quote with a contract behind it is part of an agreement. Remove the
  // contract first (only drafts can be), then the quote.
  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("quote_id", id)
    .eq("user_id", user.id);
  if ((count ?? 0) > 0) redirect(safeFrom(from) ?? `/dashboard/quotes/${id}`);

  await supabase.from("quotes").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  redirect(safeFrom(from) ?? "/dashboard/quotes");
}

export async function updateQuoteStatus(id: string, status: string, clientId?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return;

  // Stamp the handoffs — see migration 009. Tolerates the column not existing yet.
  const now = new Date().toISOString();
  const stamp: Record<string, unknown> = {};
  if (status === "sent") stamp.sent_at = now;
  if (status === "accepted") stamp.accepted_at = now;
  if (status === "declined") stamp.declined_at = now;
  await updateWithOptional(supabase, "quotes", { id, user_id: user.id }, { status }, stamp);
  await logEvent(supabase, { userId: user.id, clientId: clientId ?? null, kind: "quote_status", summary: `Quote marked ${status}`, refType: "quote", refId: id });

  revalidatePath("/dashboard/quotes");
  revalidatePath(`/dashboard/quotes/${id}`);
  if (clientId) revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
}
