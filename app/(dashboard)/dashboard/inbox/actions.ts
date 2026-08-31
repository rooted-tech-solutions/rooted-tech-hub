"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Inquiries carry no user_id — a public form has no auth.uid() to attribute a
 * row to, and this is a single-operator business (see migration 007). RLS
 * restricts the table to authenticated users; these actions still check for a
 * session so an expired cookie lands on /login rather than failing silently.
 */
async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function markRead(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("inquiries").update({ status: "read" }).eq("id", id).eq("status", "new");
  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/inbox/${id}`);
}

export async function archiveInquiry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await requireUser();
  await supabase.from("inquiries").update({ status: "archived" }).eq("id", id);
  revalidatePath("/dashboard/inbox");
  redirect("/dashboard/inbox");
}

export async function unarchiveInquiry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await requireUser();
  await supabase.from("inquiries").update({ status: "read" }).eq("id", id);
  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/inbox/${id}`);
}

/**
 * Turn an inquiry into a client at the start of the lifecycle.
 *
 * Mirrors the insert in dashboard/clients/actions.ts — same columns, same
 * user_id attribution — plus lifecycle_stage 'prospect', which is exactly what
 * a fresh lead is (see MANUAL_STAGE_INFO in clients/lifecycle.ts).
 */
export async function convertToClient(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase, user } = await requireUser();

  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (!inquiry) redirect("/dashboard/inbox");

  // Already converted — go to the client rather than creating a duplicate.
  if (inquiry.converted_client_id) {
    redirect(`/dashboard/clients/${inquiry.converted_client_id}`);
  }

  // Carry the enquiry across so the context is not lost the moment it becomes
  // a client record.
  const noteParts = [
    `Website inquiry — ${new Date(inquiry.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    inquiry.project_type ? `Looking for: ${inquiry.project_type}` : null,
    inquiry.budget_range ? `Budget: ${inquiry.budget_range}` : null,
    inquiry.message ? `\n${inquiry.message}` : null,
  ].filter(Boolean);

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name: inquiry.name,
      company: inquiry.company,
      email: inquiry.email,
      phone: inquiry.phone,
      notes: noteParts.join("\n"),
      lifecycle_stage: "prospect",
    })
    .select("id")
    .single();

  if (error || !created) {
    redirect(`/dashboard/inbox/${id}?error=convert`);
  }

  await supabase
    .from("inquiries")
    .update({ status: "converted", converted_client_id: created.id })
    .eq("id", id);

  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${created.id}`);
}
