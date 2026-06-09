import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteForm from "../../QuoteForm";
import { updateQuoteRecord } from "../../actions";

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: quote }, { data: clients }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", params.id).eq("user_id", user.id).single(),
    supabase.from("clients").select("id, name, company").eq("user_id", user.id).order("name", { ascending: true }),
  ]);

  if (!quote) notFound();

  async function action(_prevState: { error?: string } | null, formData: FormData) {
    "use server";
    const result = await updateQuoteRecord(quote!.id, formData);
    return result ?? null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/quotes/${quote.id}`}
          className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors"
        >
          ← Back to {quote.title}
        </Link>
        <h1 className="text-2xl font-semibold text-brand-dark mt-2">Edit Quote</h1>
      </div>

      <QuoteForm
        action={action}
        initialValues={quote}
        clients={clients ?? []}
        submitLabel="Save Changes"
        cancelHref={`/dashboard/quotes/${quote.id}`}
      />
    </div>
  );
}
