import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SowForm from "../SowForm";
import { createSowRecord, getNextSowNumber } from "../actions";

export default async function NewSowPage({ searchParams }: { searchParams: { client_id?: string; from?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: clients }, { data: quotes }, sowNumber, seedClient] = await Promise.all([
    supabase.from("clients").select("id, name, company").eq("user_id", user.id).order("name"),
    supabase.from("quotes").select("id, title, client_id").eq("user_id", user.id).order("title"),
    getNextSowNumber(),
    // Step 1 → step 2: a scope started from a client page begins with that
    // client's meeting notes as its discovery notes.
    searchParams.client_id
      ? supabase.from("clients").select("notes").eq("id", searchParams.client_id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const backHref = searchParams.from ?? "/dashboard/scope";
  const backLabel = searchParams.from ? "← Back to Client" : "← Back to Scope Docs";

  async function action(_prev: { error?: string } | null, formData: FormData) {
    "use server";
    const result = await createSowRecord(formData);
    return result ?? null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={backHref} className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
          {backLabel}
        </Link>
        <h1 className="text-2xl font-semibold text-brand-dark mt-2">New Scope of Work</h1>
      </div>
      <SowForm
        action={action}
        initialValues={{
          sow_number: sowNumber,
          client_id: searchParams.client_id ?? null,
          notes: (seedClient.data as { notes?: string | null } | null)?.notes ?? null,
          deliverables: [],
          exclusions: [],
          assumptions: [],
        }}
        clients={clients ?? []}
        quotes={quotes ?? []}
        submitLabel="Save SOW"
        cancelHref={backHref}
        from={searchParams.from}
      />
    </div>
  );
}
