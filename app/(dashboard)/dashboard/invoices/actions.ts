"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDaysISO, addYearsISO, todayISO } from "@/lib/dates";

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

  // Paid invoices are part of the books. They stay.
  const { data: existing } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (existing?.status === "paid") redirect(from ?? `/dashboard/invoices/${id}`);

  await supabase.from("invoices").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/clients");
  redirect(from ?? "/dashboard/invoices");
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

  const today = todayISO();

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

  // The final payment starts the care plan: it renews one year from today.
  // A renewal payment extends it one year from the *existing* renewal date,
  // so the anniversary holds whether the client pays early or late.
  const resolvedClientId = clientId ?? (invoice?.client_id as string | null | undefined);
  const invoiceType = (invoice as { invoice_type?: string | null } | null)?.invoice_type;
  if (resolvedClientId && (invoiceType === "final_payment" || invoiceType === "annual_renewal")) {
    let baseISO = today;
    if (invoiceType === "annual_renewal") {
      const { data: client } = await supabase
        .from("clients")
        .select("renewal_date")
        .eq("id", resolvedClientId)
        .eq("user_id", user.id)
        .single();
      if (client?.renewal_date) baseISO = client.renewal_date as string;
    }
    await supabase
      .from("clients")
      .update({ renewal_date: addYearsISO(baseISO, 1) })
      .eq("id", resolvedClientId)
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  if (resolvedClientId) revalidatePath(`/dashboard/clients/${resolvedClientId}`);
  revalidatePath("/dashboard/clients");
}
