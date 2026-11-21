import { SITE } from "@/lib/site";

/**
 * The proposal a client actually receives: quote, scope of work and service
 * agreement together behind one "Review & sign" button. Sent when the owner
 * presses "Send the package"; the signing page is the source of truth, this
 * is the invitation to it.
 *
 * Same table-and-inline-styles approach as the invoice email, for the same
 * reason: it renders identically in Gmail, Outlook and Apple Mail.
 */
export type PackageEmailInput = {
  /** Absolute origin for the logo image, e.g. https://rootedtechsolutions.vercel.app */
  origin: string;
  signUrl: string;
  client: { name: string | null; company: string | null };
  /** From the agreement's frozen snapshot — whatever of it exists. */
  snapshot: {
    project_name?: string | null;
    sow_number?: string | null;
    build_total?: number | null;
    monthly_retainer?: number | null;
    monthly_hours?: number | null;
    annual_value?: number | null;
  };
};

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n ?? 0));
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

function firstName(client: PackageEmailInput["client"]) {
  return String(client.name ?? "").trim().split(/\s+/)[0] || "there";
}

function documents(snapshot: PackageEmailInput["snapshot"]) {
  return ["Quote", snapshot.sow_number ? `Scope of work (${snapshot.sow_number})` : "Scope of work", "Service agreement"];
}

/** Label/value pairs for the summary box; only the parts the agreement actually has. */
function summaryRows(snapshot: PackageEmailInput["snapshot"]): [string, string][] {
  const rows: [string, string][] = [];
  if (snapshot.project_name) rows.push(["Project", snapshot.project_name]);
  const build = Number(snapshot.build_total ?? 0);
  const annual = Number(snapshot.annual_value ?? Number(snapshot.monthly_retainer ?? 0) * 12);
  if (build > 0) rows.push(["Build", money(build)]);
  if (annual > 0) rows.push(["Maintenance & Hosting", `${money(annual)} / year`]);
  if (build > 0 && annual > 0) rows.push(["First year", money(build + annual)]);
  return rows;
}

export function packageEmailSubject({ snapshot }: PackageEmailInput) {
  return `Your proposal from ${SITE.name}${snapshot.project_name ? ` — ${snapshot.project_name}` : ""}`;
}

export function packageEmailText({ signUrl, client, snapshot }: PackageEmailInput) {
  return [
    `Hi ${firstName(client)},`,
    ``,
    `Here is the proposal we discussed. The quote, scope of work and service agreement are together in one place — review all three and sign online when you are ready:`,
    ``,
    signUrl,
    ``,
    `What's inside: ${documents(snapshot).join(", ")}.`,
    ...summaryRows(snapshot).map(([label, value]) => `${label}: ${value}`),
    ``,
    `The deposit invoice follows once it is signed. Reply to this email with any questions.`,
    ``,
    `${SITE.name} · ${SITE.email}`,
  ].join("\n");
}

export function packageEmailHtml({ origin, signUrl, client, snapshot }: PackageEmailInput) {
  const font = "Helvetica,Arial,sans-serif";
  const docs = documents(snapshot)
    .map(
      (d) =>
        `<tr><td style="padding:4px 0;font:13px/1.5 ${font};color:#1B4332"><span style="display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;border-radius:8px;background:#2D6A4F;color:#fff;font-size:10px;font-weight:700;margin-right:8px">&#10003;</span>${esc(d)}</td></tr>`,
    )
    .join("");
  const rows = summaryRows(snapshot)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:5px 12px 5px 0;font:600 11px/1.5 ${font};color:#1B4332;white-space:nowrap;vertical-align:top">${esc(label)}</td>` +
        `<td style="padding:5px 0;font:12.5px/1.5 ${font};color:#1B4332;border-bottom:1px dashed #D8EAE0">${esc(value)}</td></tr>`,
    )
    .join("");
  const box = (title: string, body: string) =>
    `<td width="50%" style="vertical-align:top;padding:0 6px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;border:1px solid #D8EAE0;border-radius:8px"><tr><td style="padding:12px 14px">` +
    `<div style="font:700 9.5px/1.4 ${font};letter-spacing:.1em;text-transform:uppercase;color:#1B4332;margin-bottom:8px">${title}</div>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${body}</table></td></tr></table></td>`;

  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:24px 12px;background:#F7F4EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 4px 32px rgba(0,0,0,.08);overflow:hidden">

  <tr><td style="padding:28px 36px 20px;border-bottom:2.5px solid #1B4332">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="${esc(origin)}/logo.png" alt="${esc(SITE.name)}" width="180" style="display:block;height:auto;max-width:180px"></td>
      <td align="right" style="vertical-align:top">
        <div style="font:700 20px/1.2 ${font};letter-spacing:.06em;text-transform:uppercase;color:#8B5E3C">Proposal</div>
        <div style="font:11.5px/1.6 ${font};color:#6b7280;margin-top:6px">Prepared for <span style="color:#1B4332">${esc(client.company || client.name || "you")}</span></div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:26px 36px 6px">
    <p style="margin:0 0 12px;font:15px/1.6 ${font};color:#1B4332">Hi ${esc(firstName(client))},</p>
    <p style="margin:0;font:14px/1.7 ${font};color:#374151">Here is the proposal we discussed. The quote, scope of work and service agreement are together in one place &mdash; review all three and sign online when you are ready.</p>
  </td></tr>

  <tr><td style="padding:20px 30px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${box("What&#8217;s inside", docs)}
      ${rows ? box("At a glance", rows) : ""}
    </tr></table>
  </td></tr>

  <tr><td align="center" style="padding:26px 36px 8px">
    <a href="${esc(signUrl)}" style="display:inline-block;background:#2D6A4F;color:#ffffff;text-decoration:none;font:700 16px/1 ${font};padding:16px 36px;border-radius:10px">Review &amp; sign</a>
    <div style="font:12px/1.6 ${font};color:#6b7280;margin-top:10px">No account needed &mdash; read through, then type your name to sign.</div>
    <div style="font:11px/1.6 ${font};color:#9ca3af;margin-top:14px;word-break:break-all">Or paste this link into your browser:<br><a href="${esc(signUrl)}" style="color:#2D6A4F;text-decoration:none">${esc(signUrl)}</a></div>
  </td></tr>

  <tr><td style="padding:22px 36px 28px">
    <p style="margin:0;font:12.5px/1.7 ${font};color:#6b7280">The deposit invoice follows once it is signed. Reply to this email with any questions.</p>
  </td></tr>

  <tr><td align="center" style="padding:14px 36px;background:#F7F4EE;border-top:1px solid #D8EAE0;font:12px/1.5 ${font};color:#9ca3af">
    ${esc(SITE.name)} &middot; <a href="mailto:${esc(SITE.email)}" style="color:#9ca3af;text-decoration:none">${esc(SITE.email)}</a>${SITE.phone ? ` &middot; ${esc(SITE.phone)}` : ""}
  </td></tr>
</table>
</td></tr></table></body></html>`;
}
