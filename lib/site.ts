/**
 * Public-facing brand constants.
 *
 * Everything the marketing site says about the business lives here so there
 * is one place to edit when details change — most importantly the domain,
 * which is a placeholder until one is bought. It feeds metadata, the
 * sitemap, and OpenGraph tags.
 *
 * This file is for the PUBLIC site. The Hub does not read it.
 */
export const SITE = {
  name: "Rooted Tech Solutions",
  tagline: "Enabling your growth",
  description:
    "Custom software for small businesses that have outgrown spreadsheets. " +
    "Built to fit how you already work, then looked after month to month.",

  // The live site. Feeds metadata, the sitemap, and OpenGraph tags, so it must
  // always point somewhere that actually resolves — a placeholder here means
  // social link previews reference a dead address.
  // ← Change to https://rootedtechsolutions.com once that domain is bought.
  domain: "https://rootedtechsolutions.vercel.app",

  email: "rootedtechsolutions@gmail.com",
  // Widened to string: these are empty placeholders, and `as const` would type
  // them as the literal "" — making every `if (SITE.phone)` branch unreachable.
  phone: "" as string,

  /** Where new website inquiries are announced. */
  inquiryNotifyTo: "rootedtechsolutions@gmail.com",

  /**
   * Resend only delivers to the account owner's own address until a domain
   * is DNS-verified, so this shared sender works from day one. Swap for
   * noreply@<domain> once the domain is verified.
   */
  mailFrom: "Rooted Tech Solutions <onboarding@resend.dev>",

  social: {
    linkedin: "" as string,
    instagram: "" as string,
    facebook: "" as string,
  },
} as const;

/** Dropdown options on the inquiry form. */
export const PROJECT_TYPES = [
  "Not sure yet — let's talk",
  "Custom web application",
  "Internal tool or dashboard",
  "Booking or scheduling system",
  "Quoting, invoicing or paperwork",
  "Replacing a spreadsheet process",
  "Ongoing support for an existing site",
] as const;

export const BUDGET_RANGES = [
  "Not sure yet",
  "Under $5,000",
  "$5,000 – $15,000",
  "$15,000 – $30,000",
  "$30,000+",
] as const;
