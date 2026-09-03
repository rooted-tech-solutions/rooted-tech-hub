import type { SupabaseClient } from "@supabase/supabase-js";

export type EventKind =
  | "inquiry_converted"
  | "stage_changed"
  | "sow_created"
  | "sow_status"
  | "quote_created"
  | "quote_status"
  | "contract_generated"
  | "package_sent"
  | "package_opened"
  | "contract_signed"
  | "invoice_created"
  | "invoice_sent"
  | "invoice_paid"
  | "invoice_failed"
  | "invoice_voided"
  | "care_hours_logged"
  | "change_order_created";

export type EventInput = {
  userId: string;
  clientId: string | null;
  kind: EventKind;
  /** One human sentence. Rendered as-is on the client's timeline. */
  summary: string;
  detail?: Record<string, unknown>;
  actor?: "you" | "client" | "system";
  refType?: "client" | "scope" | "quote" | "contract" | "invoice";
  refId?: string | null;
};

/**
 * Append one row to the client's activity timeline (migration 010).
 *
 * Best-effort by design: the action that called this already did the real
 * work, and a timeline gap is better than a failed action. Never throws —
 * including before the migration has run, when the table does not exist.
 */
export async function logEvent(supabase: SupabaseClient, e: EventInput): Promise<void> {
  try {
    const { error } = await supabase.from("events").insert({
      user_id: e.userId,
      client_id: e.clientId,
      kind: e.kind,
      summary: e.summary,
      detail: e.detail ?? {},
      actor: e.actor ?? "you",
      ref_type: e.refType ?? null,
      ref_id: e.refId ?? null,
    });
    if (error) console.warn("[events] not recorded:", error.message);
  } catch (err) {
    console.warn("[events] not recorded:", err);
  }
}
