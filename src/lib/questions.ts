/**
 * Onboarding form schema — the single source of truth for fields, stable ids,
 * step grouping, and validation. Question text and helper/example placeholders
 * are verbatim from the 4Pie Labs Client Onboarding Form PDF.
 *
 * Field ids are STABLE — answers are stored in `client_onboarding.responses`
 * (jsonb) keyed by these ids, so do not rename them without a data migration.
 */

export type FieldType = "text" | "textarea" | "date";
export type FieldWidth = "full" | "half" | "third";

export interface Field {
  id: string;
  label: string;
  placeholder?: string;
  type: FieldType;
  required?: boolean;
  width: FieldWidth;
  rows?: number;
}

export interface Step {
  /** Stable key for the step. */
  key: string;
  /** Two-digit index badge, e.g. "01". Empty for the intro. */
  index: string;
  /** Section title. */
  title: string;
  /** Short descriptor shown under the title. */
  subtitle: string;
  /** Optional highlighted callout paragraph (PDF shows one on step 1). */
  callout?: string;
  /** The intro/hero step is rendered differently. */
  isIntro?: boolean;
  fields: Field[];
}

export const STEPS: Step[] = [
  {
    key: "intro",
    index: "",
    title: "Let’s build your strategy",
    subtitle: "Tell us how to make you the obvious choice.",
    isIntro: true,
    fields: [
      {
        id: "business_name",
        label: "Business name",
        type: "text",
        required: true,
        width: "third",
      },
      {
        id: "contact_name",
        label: "Your name & role",
        type: "text",
        required: true,
        width: "third",
      },
      {
        id: "submission_date",
        label: "Date",
        type: "date",
        required: true,
        width: "third",
      },
    ],
  },
  {
    key: "business_goals",
    index: "01",
    title: "Business & Goals",
    subtitle: "Where you are now, where you want to go, and what winning looks like.",
    callout:
      "This section gets us aligned before we build. The clearer your goals and numbers, the more targeted everything we create.",
    fields: [
      {
        id: "what_you_do",
        label: "1. In one sentence, what does your business do and who do you serve?",
        placeholder: "e.g. High-end residential repainting for homeowners across [city].",
        type: "textarea",
        required: true,
        width: "full",
        rows: 2,
      },
      {
        id: "most_important_goal",
        label: "2. What is your single most important goal from working with 4Pie Labs?",
        placeholder:
          "Be concrete — e.g. 15 qualified inbound leads/month, fully booked 8 weeks out.",
        type: "textarea",
        required: true,
        width: "full",
        rows: 2,
      },
      {
        id: "success_90_days",
        label: "3. What does success look like 90 days from now — specifically?",
        type: "textarea",
        width: "full",
        rows: 2,
      },
      {
        id: "current_monthly_revenue",
        label: "4. Current monthly revenue",
        type: "text",
        width: "third",
      },
      {
        id: "three_month_target",
        label: "3-month target",
        type: "text",
        width: "third",
      },
      {
        id: "avg_customer_value",
        label: "Avg. customer value",
        type: "text",
        width: "third",
      },
      {
        id: "biggest_challenge",
        label: "5. What’s your biggest challenge to growth right now?",
        placeholder:
          "e.g. Not enough inbound calls / strong leads but weak close rate / invisible in AI search.",
        type: "textarea",
        width: "full",
        rows: 2,
      },
      {
        id: "tried_failed",
        label: "6. What have you already tried that didn’t work — and why do you think it failed?",
        type: "textarea",
        width: "full",
        rows: 2,
      },
    ],
  },
  {
    key: "market_competitors",
    index: "02",
    title: "Market & Competitors",
    subtitle: "Your service area and who you’re up against in search, Maps, and AI.",
    fields: [
      {
        id: "primary_service_area",
        label: "1. Primary service area",
        placeholder: "City / region / radius you serve.",
        type: "text",
        required: true,
        width: "half",
      },
      {
        id: "other_areas",
        label: "Other areas you’d like to win",
        type: "text",
        width: "half",
      },
      {
        id: "top_competitors",
        label: "2. Who are your top 3 competitors? (names or websites)",
        placeholder: "The businesses that show up when a customer searches for what you do.",
        type: "textarea",
        width: "full",
        rows: 2,
      },
      {
        id: "real_edge",
        label: "3. Honestly — why should a customer choose you over them? What’s your real edge?",
        type: "textarea",
        width: "full",
        rows: 2,
      },
      {
        id: "main_services_wanted",
        label: "4. What are the main services or jobs you want more of?",
        placeholder: "List by priority — the work that’s most profitable or you want to fill first.",
        type: "textarea",
        width: "full",
        rows: 2,
      },
      {
        id: "current_channels",
        label: "5. Current marketing channels",
        placeholder: "e.g. Google Ads, GBP, referrals, social.",
        type: "text",
        width: "half",
      },
      {
        id: "monthly_spend",
        label: "Rough monthly marketing spend",
        placeholder: "Including ad spend.",
        type: "text",
        width: "half",
      },
      {
        id: "seasonality",
        label: "6. Is your demand seasonal? When are your busy and slow periods?",
        type: "textarea",
        width: "full",
        rows: 2,
      },
    ],
  },
  {
    key: "ideal_customer",
    index: "03",
    title: "Ideal Customer",
    subtitle: "The exact person we’ll make your search, content, and ads speak to.",
    fields: [
      {
        id: "ideal_customer",
        label: "1. Describe your ideal customer in one sentence.",
        placeholder:
          "e.g. Homeowners 40–65 in [area] renovating a $1M+ home who want premium, no-hassle work.",
        type: "textarea",
        width: "full",
        rows: 2,
      },
      {
        id: "problem_they_solve",
        label: "2. What problem are they trying to solve when they search for a business like yours?",
        type: "textarea",
        width: "full",
        rows: 2,
      },
      {
        id: "search_phrases",
        label: "3. What exact words or phrases do they type into Google — or ask ChatGPT?",
        placeholder:
          "These become the searches we win. e.g. “best [service] near me”, “[service] for [situation]”.",
        type: "textarea",
        width: "full",
        rows: 2,
      },
      {
        id: "objections",
        label: "4. What are the top 3 objections or hesitations before they buy — and how do you answer them?",
        type: "textarea",
        width: "full",
        rows: 2,
      },
      {
        id: "where_look_first",
        label: "5. Where do they look first?",
        placeholder: "Google, Maps, ChatGPT/AI, Instagram, referrals…",
        type: "text",
        width: "half",
      },
      {
        id: "google_reviews",
        label: "How many Google reviews do you have, and your rating?",
        type: "text",
        width: "half",
      },
      {
        id: "best_results",
        label: "6. Share 2–3 of your best results or customer wins (with numbers if you can).",
        placeholder:
          "Specifics build trust — “repainted a 6,000 sq ft heritage home in 9 days” beats “great work”.",
        type: "textarea",
        width: "full",
        rows: 2,
      },
    ],
  },
  {
    key: "access_assets",
    index: "04",
    title: "Access & Assets",
    subtitle:
      "What we need to start building in week one. We’ll send secure invites — just confirm what exists.",
    fields: [
      { id: "website_url", label: "Website URL", type: "text", width: "half" },
      {
        id: "hosting_builder",
        label: "Where is it hosted / who built it?",
        type: "text",
        width: "half",
      },
      {
        id: "domain_registrar",
        label: "Domain registrar & access?",
        type: "text",
        width: "half",
      },
      {
        id: "google_business_profile",
        label: "Google Business Profile (link/email)",
        type: "text",
        width: "half",
      },
      { id: "google_ads", label: "Google Ads account?", type: "text", width: "half" },
      {
        id: "meta_social",
        label: "Meta / social accounts?",
        type: "text",
        width: "half",
      },
      {
        id: "analytics",
        label: "Analytics (GA4 / Search Console)?",
        type: "text",
        width: "half",
      },
      {
        id: "crm_tool",
        label: "CRM or lead tool you use?",
        type: "text",
        width: "half",
      },
      {
        id: "brand_assets",
        label: "Brand assets you can share",
        placeholder:
          "Logo, photos/video, color/brand guide, existing content. Note what’s ready and what’s missing.",
        type: "textarea",
        width: "full",
        rows: 2,
      },
      {
        id: "who_approves",
        label: "Who approves work on your side?",
        placeholder: "Name + email of your decision-maker.",
        type: "text",
        width: "half",
      },
      {
        id: "best_way_reach",
        label: "Best way + time to reach you?",
        type: "text",
        width: "half",
      },
      {
        id: "anything_else",
        label: "Anything else we should know before we start?",
        type: "textarea",
        width: "full",
        rows: 2,
      },
    ],
  },
];

/** All fields flattened, in order. */
export const ALL_FIELDS: Field[] = STEPS.flatMap((s) => s.fields);

/** Ids of every required field, used by both client and server validation. */
export const REQUIRED_FIELD_IDS: string[] = ALL_FIELDS.filter((f) => f.required).map(
  (f) => f.id,
);

/** Intro fields promoted to top-level table columns. */
export const TOP_LEVEL_COLUMN_IDS = {
  business_name: "business_name",
  contact_name: "contact_name",
  submission_date: "submission_date",
} as const;

/** Name of the honeypot field (must stay empty for real humans). */
export const HONEYPOT_FIELD = "company_website";

export type FormData = Record<string, string>;
