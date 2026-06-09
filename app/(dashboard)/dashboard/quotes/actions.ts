"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function parseQuoteFields(formData: FormData) {
  const title = fieldOrNull(formData, "title");
  if (!title) return { error: "Title is required" } as const;

  const status = fieldOrNull(formData, "status") ?? "draft";
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { error: "Invalid status" } as const;
  }

  const build_items = parseLineItemsJson(formData, "build_items_json");
  const maintenance_items = parseLineItemsJson(formData, "maintenance_items_json");
  const build_total = sumLineItems(build_items);
  const monthly_retainer = sumLineItems(maintenance_items);

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
      maintenance_items,
      build_total,
      monthly_retainer,
      amount: build_total,
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

  const { error } = await supabase.from("quotes").insert({
    user_id: user.id,
    ...parsed.values,
  });

  if (error) return { error: error.message };

  const from = formData.get("from");
  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/clients");
  redirect(typeof from === "string" && from ? from : "/dashboard/quotes");
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

  if (error) return { error: error.message };

  const from = formData.get("from");
  revalidatePath("/dashboard/quotes");
  revalidatePath(`/dashboard/quotes/${id}`);
  revalidatePath("/dashboard/clients");
  redirect(typeof from === "string" && from ? from : `/dashboard/quotes/${id}`);
}

export async function deleteQuoteRecord(id: string, from?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("quotes").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/clients");
  redirect(from ?? "/dashboard/quotes");
}

export async function updateQuoteStatus(id: string, status: string, clientId?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("quotes").update({ status }).eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/quotes");
  revalidatePath(`/dashboard/quotes/${id}`);
  if (clientId) revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/clients");
}
