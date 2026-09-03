import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Update a row, writing the `optional` columns only if they exist.
 *
 * Migration 009 adds sent_at / approved_at / accepted_at / declined_at to
 * scope_of_work and quotes. Development and production share one database,
 * so between deploying this code and running that migration the status
 * buttons must still work — they simply will not record a timestamp yet.
 * PostgREST reports an unknown column as PGRST204 ("... in the schema
 * cache") and Postgres as 42703 (undefined_column); on either, retry with
 * just the base columns.
 */
export async function updateWithOptional(
  supabase: SupabaseClient,
  table: string,
  match: Record<string, string>,
  base: Record<string, unknown>,
  optional: Record<string, unknown>,
) {
  const run = (values: Record<string, unknown>) => {
    let q = supabase.from(table).update(values);
    for (const [column, value] of Object.entries(match)) q = q.eq(column, value);
    return q;
  };

  if (Object.keys(optional).length === 0) return run(base);

  const first = await run({ ...base, ...optional });
  if (!first.error) return first;

  const missingColumn =
    first.error.code === "PGRST204" ||
    first.error.code === "42703" ||
    /column|schema cache/i.test(first.error.message);
  if (!missingColumn) return first;

  return run(base);
}
