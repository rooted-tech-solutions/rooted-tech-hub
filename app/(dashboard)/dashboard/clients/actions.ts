"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/events";

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
  await logEvent(supabase, { userId: user.id, clientId: id, kind: "stage_changed", summary: `Stage set by hand to ${stage.replace(/_/g, " ")}`, refType: "client", refId: id });

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
  await logEvent(supabase, { userId: user.id, clientId: id, kind: "stage_changed", summary: "Stage back to automatic", refType: "client", refId: id });

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

/**
 * Care plan hours (migration 010). The agreement allocates N hours a month;
 * this is the log that says how many were used, so the overage clause can be
 * invoked with a straight face and renewal conversations start from facts.
 */
export async function addCareHoursFromForm(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const monthRaw = String(formData.get("month") ?? ""); // YYYY-MM from <input type="month">
  const hours = Number(formData.get("hours"));
  const note = fieldOrNull(formData, "note");
  if (!clientId || !/^\d{4}-\d{2}$/.test(monthRaw) || !Number.isFinite(hours) || hours <= 0) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("care_hours")
    .insert({ user_id: user.id, client_id: clientId, month: `${monthRaw}-01`, hours, note });
  if (!error) {
    await logEvent(supabase, {
      userId: user.id,
      clientId,
      kind: "care_hours_logged",
      summary: `Logged ${hours} care-plan hour${hours === 1 ? "" : "s"}${note ? ` — ${note}` : ""}`,
      refType: "client",
      refId: clientId,
    });
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard");
}

export async function deleteCareHoursFromForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("care_hours").delete().eq("id", id).eq("user_id", user.id);
  if (clientId) revalidatePath(`/dashboard/clients/${clientId}`);
}
