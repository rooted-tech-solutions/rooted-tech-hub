"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fieldOrNull(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function createClientRecord(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = fieldOrNull(formData, "name");
  if (!name) {
    return { error: "Name is required" };
  }

  const { error } = await supabase.from("clients").insert({
    user_id: user.id,
    name,
    company: fieldOrNull(formData, "company"),
    email: fieldOrNull(formData, "email"),
    phone: fieldOrNull(formData, "phone"),
    notes: fieldOrNull(formData, "notes"),
    contract_signed_date: fieldOrNull(formData, "contract_signed_date"),
    renewal_date: fieldOrNull(formData, "renewal_date"),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

export async function updateClientRecord(id: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = fieldOrNull(formData, "name");
  if (!name) {
    return { error: "Name is required" };
  }

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      company: fieldOrNull(formData, "company"),
      email: fieldOrNull(formData, "email"),
      phone: fieldOrNull(formData, "phone"),
      notes: fieldOrNull(formData, "notes"),
      contract_signed_date: fieldOrNull(formData, "contract_signed_date"),
      renewal_date: fieldOrNull(formData, "renewal_date"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${id}`);
  redirect(`/dashboard/clients/${id}`);
}

export async function updateClientStage(id: string, stage: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("clients")
    .update({ lifecycle_stage: stage, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${id}`);
}

/** Drop the manual stage so the lifecycle is computed from documents again. */
export async function clearClientStageFromForm(formData: FormData) {
  const id = formData.get("client_id") as string;
  if (!id) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("clients")
    .update({ lifecycle_stage: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${id}`);
}

/** Step 1 of the pipeline: the meeting notes, edited in place on the client page. */
export async function updateClientNotesFromForm(formData: FormData) {
  const id = formData.get("client_id") as string;
  if (!id) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("clients")
    .update({ notes: fieldOrNull(formData, "notes"), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${id}`);
}

export async function updateClientStageFromForm(formData: FormData) {
  const id = formData.get("client_id") as string;
  const stage = formData.get("stage") as string;
  if (!id || !stage) return;
  await updateClientStage(id, stage);
}

export async function deleteClientRecord(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Documents reference the client with ON DELETE SET NULL, so deleting a
  // client that still owns any would orphan them silently. Refuse instead;
  // the client page explains and disables the button.
  const owned = await Promise.all(
    ["scope_of_work", "quotes", "contracts", "invoices"].map((table) =>
      supabase.from(table).select("id", { count: "exact", head: true }).eq("client_id", id).eq("user_id", user.id),
    ),
  );
  if (owned.some((r) => (r.count ?? 0) > 0)) redirect(`/dashboard/clients/${id}`);

  await supabase.from("clients").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}
