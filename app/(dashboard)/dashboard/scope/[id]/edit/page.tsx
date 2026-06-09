import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SowForm from "../../SowForm";
import { updateSowRecord } from "../../actions";
import type { SowItem } from "../../actions";

export default async function EditSowPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: sow }, { data: clients }, { data: quotes }] = await Promise.all([
    supabase.from("scope_of_work").select("*").eq("id", params.id).eq("user_id", user.id).single(),
    supabase.from("clients").select("id, name, company").eq("user_id", user.id).order("name"),
    supabase.from("quotes").select("id, title, client_id").eq("user_id", user.id).order("title"),
  ]);

  if (!sow) notFound();

  const backHref = searchParams.from ?? `/dashboard/scope/${params.id}`;
  const backLabel = searchParams.from ? "← Back to Client" : "← Back to SOW";

  async function action(_prev: { error?: string } | null, formData: FormData) {
    "use server";
    const result = await updateSowRecord(params.id, formData);
    return result ?? null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={backHref} className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
          {backLabel}
        </Link>
        <h1 className="text-2xl font-semibold text-brand-dark mt-2">Edit {sow.sow_number}</h1>
      </div>
      <SowForm
        action={action}
        initialValues={{
          sow_number: sow.sow_number,
          title: sow.title,
          status: sow.status,
          client_id: sow.client_id,
          quote_id: sow.quote_id,
          notes: sow.notes,
          deliverables: (sow.deliverables ?? []) as SowItem[],
          exclusions: (sow.exclusions ?? []) as SowItem[],
          assumptions: (sow.assumptions ?? []) as SowItem[],
          issued_date: sow.issued_date,
        }}
        clients={clients ?? []}
        quotes={quotes ?? []}
        submitLabel="Save Changes"
        cancelHref={backHref}
        from={searchParams.from}
      />
    </div>
  );
}
