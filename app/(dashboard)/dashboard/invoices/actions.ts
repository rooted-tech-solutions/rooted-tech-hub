"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeFrom } from "../backLink";
import { logEvent } from "@/lib/events";
import { applyInvoicePaid } from "./paid";
import { addDaysISO, todayISO } from "@/lib/dates";

const STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
const INVOICE_TYPES = ["deposit", "final_payment", "annual_renewal", "custom"] as const;

function fieldOrNull(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function parseInvoiceFields(formData: FormData) {
  const invoice_number = fieldOrNull(formData, "invoice_number");
  if (!invoice_number) return { error: "Invoice number is required" } as const;

  const title = fieldOrNull(formData, "title");
  if (!title) return { error: "Title is required" } as const;

  const amountRaw = fieldOrNull(formData, "amount");
  const amount = amountRaw ? Number(amountRaw) : 0;
  if (Number.isNaN(amount)) return { error: "Amount must be a number" } as const;

  const taxRateRaw = fieldOrNull(formData, "tax_rate");
  const tax_rate = taxRateRaw ? Number(taxRateRaw) : 0;
  if (Number.isNaN(tax_rate)) return { error: "Tax rate must be a number" } as const;

  const status = fieldOrNull(formData, "status") ?? "draft";
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { error: "Invalid status" } as const;
  }

  const invoice_type = fieldOrNull(formData, "invoice_type") ?? "custom";
  const validType = INVOICE_TYPES.includes(invoice_type as (typeof INVOICE_TYPES)[number])
    ? invoice_type
    : "custom";

  return {
    values: {
      invoice_number,
      title,
      invoice_type: validType,
      client_id: fieldOrNull(formData, "client_id"),
      quote_id: fieldOrNull(formData, "quote_id"),
      description: fieldOrNull(formData, "description"),
      amount,
      tax_rate,
      status,
      issued_date: fieldOrNull(formData, "issued_date"),
      due_date: fieldOrNull(formData, "due_date"),
      paid_date: fieldOrNull(formData, "paid_date"),
      notes: fieldOrNull(formData, "notes"),
    },
  } as const;
}

export async function getNextInvoiceNumber(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "INV-1001";

  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  let max = 1000;
  for (const row of data ?? []) {
    const match = row.invoice_number?.match(/(\d+)\s*$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  return `INV-${max + 1}`;
}

export async function createInvoiceRecord(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseInvoiceFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data: created, error } = await supabase
    .from("invoices")
    .insert({ user_id: user.id, ...parsed.values })
    .select("id")
    .single();

  if (error) return { error: error.message };
  await logEvent(supabase, { userId: user.id, clientId: parsed.values.client_id, kind: "invoice_created", summary: `Invoice ${parsed.values.invoice_number} drafted — ${parsed.values.title}`, refType: "invoice", refId: created?.id ?? null });

  const from = formData.get("from");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/clients");
  redirect(safeFrom(from) ?? "/dashboard/invoices");
}

export async function updateInvoiceRecord(id: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseInvoiceFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase
    .from("invoices")
    .update(parsed.values)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  const from = formData.get("from");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  revalidatePath("/dashboard/clients");
  redirect(safeFrom(from) ?? `/dashboard/invoices/${id}`);
}

export async function deleteInvoiceRecord(id: string, from?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Paid invoices are part of the books. They stay.
  const { data: existing } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (existing?.status === "paid") redirect(safeFrom(from) ?? `/dashboard/invoices/${id}`);

  await supabase.from("invoices").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/clients");
  redirect(safeFrom(from) ?? "/dashboard/invoices");
}

/** Draft → sent. Stamps the issue date if it was never set, so "due" has something to count from. */
export async function markInvoiceSent(id: string, clientId?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayISO();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("issued_date, due_date, client_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const patch: Record<string, unknown> = { status: "sent" };
  if (!invoice?.issued_date) patch.issued_date = today;
  if (!invoice?.due_date) patch.due_date = addDaysISO(today, 30);
  await supabase.from("invoices").update(patch).eq("id", id).eq("user_id", user.id).eq("status", "draft");

  const resolvedClientId = clientId ?? (invoice?.client_id as string | null | undefined);
  await logEvent(supabase, {
    userId: user.id,
    clientId: resolvedClientId ?? null,
    kind: "invoice_sent",
    summary: "Invoice marked sent",
    refType: "invoice",
    refId: id,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  if (resolvedClientId) revalidatePath(`/dashboard/clients/${resolvedClientId}`);
  revalidatePath("/dashboard/clients");
}

export async function markInvoicePaid(id: string, clientId?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { clientId: resolved } = await applyInvoicePaid(supabase, user.id, id, { paidDate: todayISO(), via: "manual" });
  const resolvedClientId = clientId ?? resolved;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  if (resolvedClientId) revalidatePath(`/dashboard/clients/${resolvedClientId}`);
  revalidatePath("/dashboard/clients");
}
