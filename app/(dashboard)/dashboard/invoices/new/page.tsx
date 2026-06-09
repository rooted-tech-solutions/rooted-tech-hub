import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InvoiceForm from "../InvoiceForm";
import { createInvoiceRecord, getNextInvoiceNumber } from "../actions";

export default async function NewInvoicePage({ searchParams }: { searchParams: { client_id?: string; from?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: clients }, { data: quotes }, invoiceNumber] = await Promise.all([
    supabase.from("clients").select("id, name, company").eq("user_id", user.id).order("name", { ascending: true }),
    supabase
      .from("quotes")
      .select("id, title, client_id, project_name, scope, build_total, monthly_retainer")
      .eq("user_id", user.id)
      .order("title", { ascending: true }),
    getNextInvoiceNumber(),
  ]);

  const backHref = searchParams.from ?? "/dashboard/invoices";
  const backLabel = searchParams.from ? "← Back to Client" : "← Back to Invoices";

  async function action(_prevState: { error?: string } | null, formData: FormData) {
    "use server";
    const result = await createInvoiceRecord(formData);
    return result ?? null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={backHref} className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
          {backLabel}
        </Link>
        <h1 className="text-2xl font-semibold text-brand-dark mt-2">New Invoice</h1>
      </div>

      <InvoiceForm
        action={action}
        initialValues={{ invoice_number: invoiceNumber, client_id: searchParams.client_id ?? null }}
        clients={clients ?? []}
        quotes={quotes ?? []}
        submitLabel="Save Invoice"
        cancelHref={backHref}
        from={searchParams.from}
      />
    </div>
  );
}
