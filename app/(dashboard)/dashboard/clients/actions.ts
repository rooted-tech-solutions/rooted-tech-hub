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

  await supabase.from("clients").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}
