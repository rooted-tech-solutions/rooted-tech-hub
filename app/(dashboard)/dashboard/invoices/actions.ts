"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("invoices").insert({
    user_id: user.id,
    ...parsed.values,
  });

  if (error) return { error: error.message };

  const from = formData.get("from");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/clients");
  redirect(typeof from === "string" && from ? from : "/dashboard/invoices");
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
  redirect(typeof from === "string" && from ? from : `/dashboard/invoices/${id}`);
}

export async function deleteInvoiceRecord(id: string, from?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("invoices").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/clients");
  redirect(from ?? "/dashboard/invoices");
}

export async function markInvoicePaid(id: string, clientId?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  // Fetch invoice type and client_id before updating
  const { data: invoice } = await supabase
    .from("invoices")
    .select("invoice_type, client_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  await supabase
    .from("invoices")
    .update({ status: "paid", paid_date: today })
    .eq("id", id)
    .eq("user_id", user.id);

  // Auto-set renewal_date on the client when the final payment is received
  const resolvedClientId = clientId ?? (invoice?.client_id as string | null | undefined);
  if ((invoice as { invoice_type?: string | null } | null)?.invoice_type === "final_payment" && resolvedClientId) {
    const renewal = new Date();
    renewal.setFullYear(renewal.getFullYear() + 1);
    await supabase
      .from("clients")
      .update({ renewal_date: renewal.toISOString().slice(0, 10) })
      .eq("id", resolvedClientId)
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  if (resolvedClientId) revalidatePath(`/dashboard/clients/${resolvedClientId}`);
  revalidatePath("/dashboard/clients");
}
