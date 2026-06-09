import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientForm from "../../ClientForm";
import { updateClientRecord } from "../../actions";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!client) notFound();

  async function action(_prevState: { error?: string } | null, formData: FormData) {
    "use server";
    const result = await updateClientRecord(client!.id, formData);
    return result ?? null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/clients/${client.id}`}
          className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors"
        >
          ← Back to {client.name}
        </Link>
        <h1 className="text-2xl font-semibold text-brand-dark mt-2">Edit Client</h1>
      </div>

      <ClientForm
        action={action}
        initialValues={client}
        submitLabel="Save Changes"
        cancelHref={`/dashboard/clients/${client.id}`}
      />
    </div>
  );
}
