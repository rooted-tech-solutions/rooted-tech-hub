import { SITE } from "@/lib/site";

/**
 * The invoice a client actually receives: the Hub's invoice, as email, with
 * one button that opens Stripe's secure payment page. Stripe never emails the
 * client itself — it is the payment rail, not the messenger.
 *
 * Table layout and inline styles on purpose: that is what renders the same in
 * Gmail, Outlook and Apple Mail. Colours are the Hub's brand palette.
 */
export type InvoiceEmailInput = {
  /** Absolute origin for the logo image, e.g. https://rootedtechsolutions.vercel.app */
  origin: string;
  payUrl: string;
  invoice: {
    invoice_number: string;
    title: string;
    description: string | null;
    amount: number | null;
    issued_date: string | null;
    due_date: string | null;
    invoice_type: string | null;
  };
  client: { name: string | null; company: string | null; email: string | null; phone: string | null };
};

const PAYMENT_LABEL: Record<string, string> = {
  deposit: "Deposit — 50% of the agreement, due on signing",
  final_payment: "Final payment — balance due on delivery and acceptance",
  annual_renewal: "Annual care plan renewal",
};

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n ?? 0));
const day = (ymd: string | null) =>
  ymd ? new Date(ymd + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export function invoiceEmailSubject({ invoice }: InvoiceEmailInput) {
  return `Invoice ${invoice.invoice_number} from ${SITE.name} — ${money(invoice.amount)} due ${day(invoice.due_date)}`;
}

export function invoiceEmailText({ invoice, client, payUrl }: InvoiceEmailInput) {
  const forLine = PAYMENT_LABEL[invoice.invoice_type ?? ""];
  return [
    `Invoice ${invoice.invoice_number} — ${invoice.title}`,
    forLine ? `For: ${forLine}` : null,
    `Billed to: ${client.company || client.name || ""}`,
    `Issued: ${day(invoice.issued_date)}   Due: ${day(invoice.due_date)}`,
    invoice.description ? `\n${invoice.description}\n` : null,
    `Total due: ${money(invoice.amount)}`,
    ``,
    `Pay online (card or bank transfer): ${payUrl}`,
    ``,
    `Payment is due by the date above. Please reference the invoice number on any correspondence. All prices are in USD.`,
    ``,
    `${SITE.name} · ${SITE.email}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function invoiceEmailHtml({ origin, payUrl, invoice, client }: InvoiceEmailInput) {
  const forLine = PAYMENT_LABEL[invoice.invoice_type ?? ""];
  const field = (label: string, value: unknown) =>
    `<tr><td style="padding:3px 10px 3px 0;font:600 11px/1.5 Helvetica,Arial,sans-serif;color:#1B4332;white-space:nowrap;vertical-align:top">${esc(label)}</td>` +
    `<td style="padding:3px 0;font:12px/1.5 Helvetica,Arial,sans-serif;color:#1B4332;border-bottom:1px dashed #D8EAE0">${esc(value) || "—"}</td></tr>`;
  const box = (title: string, rows: string) =>
    `<td width="50%" style="vertical-align:top;padding:0 6px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;border:1px solid #D8EAE0;border-radius:8px"><tr><td style="padding:12px 14px">` +
    `<div style="font:700 9.5px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#1B4332;margin-bottom:8px">${title}</div>` +
    `<table role="presentation" cellpadding="0" cellspacing="0">${rows}</table></td></tr></table></td>`;
  const notes = [
    "Payment is due by the date specified above. Late payments may be subject to a 1.5% monthly fee.",
    "Please reference the invoice number on all payments and correspondence.",
    "All prices are in USD.",
  ];

  return `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#F7F4EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 4px 32px rgba(0,0,0,.08);overflow:hidden">

  <tr><td style="padding:28px 36px 20px;border-bottom:2.5px solid #1B4332">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="${esc(origin)}/logo.png" alt="${esc(SITE.name)}" width="180" style="display:block;height:auto;max-width:180px"></td>
      <td align="right" style="vertical-align:top">
        <div style="font:700 20px/1.2 Helvetica,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8B5E3C;margin-bottom:6px">Invoice</div>
        <div style="font:11.5px/1.6 Helvetica,Arial,sans-serif;color:#6b7280">
          Invoice #: <span style="color:#1B4332;font-family:Menlo,Consolas,monospace">${esc(invoice.invoice_number)}</span><br>
          Issued: <span style="color:#1B4332">${day(invoice.issued_date)}</span><br>
          Due: <span style="color:#1B4332;font-weight:700">${day(invoice.due_date)}</span>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:24px 30px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${box("Bill To", field("Company", client.company) + field("Contact", client.name) + field("Email", client.email) + field("Phone", client.phone))}
      ${box("Invoice Details", field("Title", invoice.title) + (forLine ? field("For", forLine) : "") + field("Status", "Due"))}
    </tr></table>
  </td></tr>

  ${invoice.description ? `<tr><td style="padding:16px 36px 0">
    <div style="font:700 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#1B4332;margin-bottom:6px">Description</div>
    <div style="font:14px/1.6 Helvetica,Arial,sans-serif;color:#1B4332;white-space:pre-wrap">${esc(invoice.description)}</div>
  </td></tr>` : ""}

  <tr><td style="padding:24px 36px 0" align="right">
    <table role="presentation" cellpadding="0" cellspacing="0" style="min-width:280px;border:1px solid #D8EAE0;border-radius:8px;background:rgba(216,234,224,.4)">
      <tr><td style="padding:12px 16px;font:700 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#1B4332">Total Due</td>
          <td align="right" style="padding:12px 16px;font:700 20px/1.2 Helvetica,Arial,sans-serif;color:#1B4332">${money(invoice.amount)}</td></tr>
    </table>
  </td></tr>

  <tr><td align="center" style="padding:28px 36px 8px">
    <a href="${esc(payUrl)}" style="display:inline-block;background:#2D6A4F;color:#ffffff;text-decoration:none;font:700 16px/1 Helvetica,Arial,sans-serif;padding:16px 36px;border-radius:10px">Pay invoice</a>
    <div style="font:12px/1.6 Helvetica,Arial,sans-serif;color:#6b7280;margin-top:10px">Card or bank transfer, securely through Stripe. A receipt is emailed automatically.</div>
  </td></tr>

  <tr><td style="padding:24px 36px 28px">
    <div style="font:700 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#1B4332;margin-bottom:8px">Payment Terms &amp; Notes</div>
    ${notes.map((n) => `<div style="font:12px/1.7 Helvetica,Arial,sans-serif;color:#6b7280"><span style="color:#2D6A4F;font-weight:700">&bull;</span>&nbsp; ${esc(n)}</div>`).join("")}
  </td></tr>

  <tr><td align="center" style="padding:14px 36px;background:#F7F4EE;border-top:1px solid #D8EAE0;font:12px/1.5 Helvetica,Arial,sans-serif;color:#9ca3af">
    ${esc(SITE.name)} &middot; <a href="mailto:${esc(SITE.email)}" style="color:#9ca3af;text-decoration:none">${esc(SITE.email)}</a>${SITE.phone ? ` &middot; ${esc(SITE.phone)}` : ""}
  </td></tr>
</table>
</td></tr></table></body></html>`;
}
