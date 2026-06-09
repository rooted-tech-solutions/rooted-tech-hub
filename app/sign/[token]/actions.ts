"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitSignature(token: string, _prevState: { error?: string } | null, formData: FormData) {
  const name = String(formData.get("signed_name") ?? "").trim();
  const agreed = formData.get("agree") === "on";

  if (!name) return { error: "Please type your full legal name." };
  if (!agreed) return { error: "Please confirm you have read and agree to the terms." };

  const supabase = createClient();
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || headers().get("x-real-ip") || "unknown";

  const { data, error } = await supabase.rpc("sign_contract_by_token", {
    p_token: token,
    p_name: name,
    p_ip: ip,
  });

  if (error) return { error: error.message };
  if (!data) return { error: "This contract is no longer available for signature." };

  revalidatePath(`/sign/${token}`);
  return { success: true } as const;
}
