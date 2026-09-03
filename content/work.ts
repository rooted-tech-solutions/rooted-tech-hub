/**
 * Recent work — the stories in the "Recent work" rail on the home page.
 *
 * This file is meant to be edited by hand. The rules:
 *
 *   - Every value sits inside double quotes:   title: "Like this",
 *   - Every line ends with a comma, including the last line of a story.
 *   - Each story is wrapped in { } with a comma after the closing brace.
 *   - `problem` and `tags` are optional: delete the line and that section
 *     disappears. Leave a problem out rather than guess at one.
 *   - Order here is order in the rail. Titles must be unique.
 *   - Stories are described, not named — no client or product names — and
 *     each one stands alone (no "the same company").
 *
 * Straight quotes only ("), never curly (“ ”): use a code editor, not
 * TextEdit. After saving: commit, push to main, and Vercel redeploys.
 */

export type WorkItem = {
  /** Who it was for — the industry, not the name. */
  client: string;
  title: string;
  /** Optional. Only the client's own account of the problem; never a guess. */
  problem?: string;
  built: string;
  /** Optional. Most stories read better without a tech list. */
  tags?: readonly string[];
};

export const WORK: readonly WorkItem[] = [
  {
    client: "Crane rental & rigging",
    title: "A crane rental booking and job-tracking platform",
    problem:
      "A new crane rental business, starting from scratch. The owner knew he needed a way to stay organized as work came in, but not how to set that up — or which of the many options out there was actually the right fit.",
    built:
      "A live availability calendar per machine with travel time built in, online quotes and waiver signing, a phone-friendly clock operators use on site across multi-day jobs, and invoices generated from the hours actually logged — at the rate the customer was originally quoted.",
  },
  {
    client: "Agriculture company",
    title: "A customer portal for a product insurance guarantee",
    problem:
      "Formerly documentation was done through email, or sent directly to employees. Taking the data and using it involved lots of back and forth conversations with the customer to make sure details were right, and all information was hand entered into a spreadsheet.",
    built:
      "A grower-facing portal where customers could upload their documents and convert them into a digital form as well as review them for accuracy. Once reviewed they could submit. To help the company we automated all of the calculations, dashboards, report creation and auto emailing system.",
  },
  {
    client: "Agriculture company",
    title: "An agronomic trial data capture and analysis tool",
    problem:
      "The agronomy team was using multiple different software tools to track and maintain trial data and information, none of which were suited well for the job or type of information they needed to capture.",
    built:
      "A single website/system that allows the entire team to document their unique trials, products, application timings, and application methods and capture various ancillary trial data that would impact yield. We also built a dashboard that aggregates all of the trial information and yield results as they are entered, for quick decision making and reliable answers in the moment.",
  },
  {
    client: "Agriculture company",
    title: "An internal operations console for a commercial sales team",
    problem:
      "Forecasting, territory management, business planning were all done by individuals in spreadsheets and word documents. Quota attainment was unclear and lagging, sales pipeline visibility was very limited.",
    built:
      "We built an internal system that centralizes all of their tasks and information, aggregates and creates visibility — sales analytics, forecasting, territory planning, and quoting.",
  },
];
