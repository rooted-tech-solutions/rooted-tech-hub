import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import QuoteForm from "../QuoteForm";
import { createQuoteRecord } from "../actions";

export default async function NewQuotePage({ searchParams }: { searchParams: { client_id?: string; from?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, company")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const backHref = searchParams.from ?? "/dashboard/quotes";
  const backLabel = searchParams.from ? "← Back to Client" : "← Back to Quotes";

  async function action(_prevState: { error?: string } | null, formData: FormData) {
    "use server";
    const result = await createQuoteRecord(formData);
    return result ?? null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={backHref} className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
          {backLabel}
        </Link>
        <h1 className="text-2xl font-semibold text-brand-dark mt-2">New Quote</h1>
      </div>

      <QuoteForm
        action={action}
        initialValues={searchParams.client_id ? { client_id: searchParams.client_id } : undefined}
        clients={clients ?? []}
        submitLabel="Save Quote"
        cancelHref={backHref}
        from={searchParams.from}
      />
    </div>
  );
}
