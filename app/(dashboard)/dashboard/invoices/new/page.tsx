import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InvoiceForm, { type ContractTerms } from "../InvoiceForm";
import type { ContractSnapshot } from "../../contracts/contractTerms";
import { addDaysISO, todayISO } from "@/lib/dates";
import { createInvoiceRecord, getNextInvoiceNumber } from "../actions";

const INVOICE_TYPES = ["deposit", "final_payment", "annual_renewal", "custom"] as const;
const TYPE_TITLE: Record<string, string> = {
  deposit: "Deposit",
  final_payment: "Final Payment",
  annual_renewal: "Annual Renewal",
  custom: "Invoice",
};

/**
 * Frozen terms per quote from every signed agreement. Passed to the form so
 * deposit/final/renewal amounts come from what the client actually signed.
 */
function termsFromContracts(rows: { quote_id: string | null; snapshot: unknown }[] | null): Record<string, ContractTerms> {
  const out: Record<string, ContractTerms> = {};
  for (const row of rows ?? []) {
    const snap = row.snapshot as Partial<ContractSnapshot> | null;
    if (!row.quote_id || !snap) continue;
    out[row.quote_id] = { build_total: snap.build_total ?? 0, annual_value: snap.annual_value ?? 0 };
  }
  return out;
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { client_id?: string; from?: string; quote_id?: string; invoice_type?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: clients }, { data: quotes }, invoiceNumber, { data: signed }] = await Promise.all([
    supabase.from("clients").select("id, name, company").eq("user_id", user.id).order("name", { ascending: true }),
    supabase.from("quotes").select("*").eq("user_id", user.id).order("title", { ascending: true }),
    getNextInvoiceNumber(),
    supabase.from("contracts").select("quote_id, snapshot").eq("user_id", user.id).eq("status", "signed"),
  ]);
  const contractTerms = termsFromContracts(signed);

  // Arriving from a client's "Create the deposit invoice" (etc.): everything
  // but the amount is known, and the amount is computed by the form.
  const type = INVOICE_TYPES.find((t) => t === searchParams.invoice_type);
  const quote = searchParams.quote_id ? (quotes ?? []).find((q) => q.id === searchParams.quote_id) ?? null : null;
  const isChangeOrder = quote?.kind === "change_order";
  const prefilled = Boolean(quote && type && (type !== "custom" || isChangeOrder));
  const issuedISO = todayISO();
  const dueISO = addDaysISO(issuedISO, 30);

  const backHref = searchParams.from ?? "/dashboard/invoices";
  const backLabel = searchParams.from ? "← Back to Client" : "← Back to Invoices";

  async function action(_prevState: { error?: string } | null, formData: FormData) {
    "use server";
    const result = await createInvoiceRecord(formData);
    return result ?? null;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link href={backHref} className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
          {backLabel}
        </Link>
        <h1 className="text-2xl font-semibold text-brand-dark mt-2">New Invoice</h1>
      </div>

      <InvoiceForm
        action={action}
        initialValues={{
          invoice_number: invoiceNumber,
          client_id: searchParams.client_id ?? quote?.client_id ?? null,
          quote_id: quote?.id ?? null,
          invoice_type: type ?? null,
          title: prefilled && quote ? (isChangeOrder ? quote.title : `${quote.project_name || quote.title} — ${TYPE_TITLE[type!]}`) : null,
          description: prefilled && quote ? quote.scope : null,
          issued_date: prefilled ? issuedISO : null,
          due_date: prefilled ? dueISO : null,
        }}
        clients={clients ?? []}
        quotes={quotes ?? []}
        contractTerms={contractTerms}
        submitLabel="Save Invoice"
        cancelHref={backHref}
        from={searchParams.from}
      />
    </div>
  );
}
