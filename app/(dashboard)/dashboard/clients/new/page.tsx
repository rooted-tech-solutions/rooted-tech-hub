import Link from "next/link";
import ClientForm from "../ClientForm";
import { createClientRecord } from "../actions";

export default function NewClientPage() {
  async function action(_prevState: { error?: string } | null, formData: FormData) {
    "use server";
    const result = await createClientRecord(formData);
    return result ?? null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors"
        >
          ← Back to Clients
        </Link>
        <h1 className="text-2xl font-semibold text-brand-dark mt-2">Add Client</h1>
      </div>

      <ClientForm action={action} submitLabel="Save Client" cancelHref="/dashboard/clients" />
    </div>
  );
}
