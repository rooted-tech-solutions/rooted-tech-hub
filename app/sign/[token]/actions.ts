"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSignedAlert } from "@/lib/email";
import { SITE } from "@/lib/site";

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

  // Tell the owner. Needs the service role to read the contract by token
  // (the anonymous visitor has no row access) and never blocks the signer.
  const admin = createAdminClient();
  if (admin) {
    const { data: contract } = await admin
      .from("contracts")
      .select("id, clients(name, company)")
      .eq("sign_token", token)
      .maybeSingle();
    const client = (contract as { clients?: { name: string | null; company: string | null } | null } | null)?.clients;
    if (contract) {
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? SITE.domain;
      await sendSignedAlert({
        clientLabel: client?.company || client?.name || "a client",
        signedName: name,
        contractUrl: `${origin}/dashboard/contracts/${(contract as { id: string }).id}`,
      });
    }
  }

  revalidatePath(`/sign/${token}`);
  return { success: true } as const;
}
