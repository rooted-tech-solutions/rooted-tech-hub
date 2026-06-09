import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InvoiceForm from "../../InvoiceForm";
import { updateInvoiceRecord } from "../../actions";

export default async function EditInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: invoice }, { data: clients }, { data: quotes }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", params.id).eq("user_id", user.id).single(),
    supabase.from("clients").select("id, name, company").eq("user_id", user.id).order("name", { ascending: true }),
    supabase
      .from("quotes")
      .select("id, title, client_id, project_name, scope, build_total, monthly_retainer")
      .eq("user_id", user.id)
      .order("title", { ascending: true }),
  ]);

  if (!invoice) notFound();

  async function action(_prevState: { error?: string } | null, formData: FormData) {
    "use server";
    const result = await updateInvoiceRecord(invoice!.id, formData);
    return result ?? null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/invoices/${invoice.id}`}
          className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors"
        >
          ← Back to {invoice.invoice_number}
        </Link>
        <h1 className="text-2xl font-semibold text-brand-dark mt-2">Edit Invoice</h1>
      </div>

      <InvoiceForm
        action={action}
        initialValues={invoice}
        clients={clients ?? []}
        quotes={quotes ?? []}
        submitLabel="Save Changes"
        cancelHref={`/dashboard/invoices/${invoice.id}`}
      />
    </div>
  );
}
