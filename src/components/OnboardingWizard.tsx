"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HONEYPOT_FIELD,
  REQUIRED_FIELD_IDS,
  STEPS,
  type Field,
  type FormData,
} from "@/lib/questions";
import { submitOnboarding } from "@/app/actions";

const STORAGE_KEY = "fourpie_onboarding_v1";
const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const TOTAL_STEPS = STEPS.length;

const BOOK_URL = "https://fourpielabs.com/book";

type Status = "idle" | "submitting" | "success" | "error";

interface SavedState {
  savedAt: number;
  step: number;
  data: FormData;
}

const widthClass: Record<Field["width"], string> = {
  full: "sm:col-span-6",
  half: "sm:col-span-3",
  third: "sm:col-span-2",
};

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // ── Restore from sessionStorage (only if < 30 min old) ──────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedState;
        const fresh =
          saved &&
          typeof saved.savedAt === "number" &&
          Date.now() - saved.savedAt < EXPIRY_MS;
        if (fresh) {
          setData(saved.data ?? {});
          setStep(Math.min(Math.max(saved.step ?? 0, 0), TOTAL_STEPS - 1));
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  // ── Persist on change (after hydration, before success) ─────────────────
  useEffect(() => {
    if (!hydrated || status === "success") return;
    try {
      const payload: SavedState = { savedAt: Date.now(), step, data };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [data, step, hydrated, status]);

  const scrollToTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleChange = useCallback((id: string, value: string) => {
    setData((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => (prev[id] ? { ...prev, [id]: false } : prev));
  }, []);

  const validateStep = useCallback(
    (stepIndex: number): string[] => {
      return STEPS[stepIndex].fields
        .filter((f) => f.required && !(data[f.id]?.trim()))
        .map((f) => f.id);
    },
    [data],
  );

  const goNext = useCallback(() => {
    const missing = validateStep(step);
    if (missing.length > 0) {
      setErrors(Object.fromEntries(missing.map((id) => [id, true])));
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    scrollToTop();
  }, [step, validateStep, scrollToTop]);

  const goBack = useCallback(() => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
    scrollToTop();
  }, [scrollToTop]);

  const handleSubmit = useCallback(async () => {
    // Validate every required field across all steps.
    const missing = REQUIRED_FIELD_IDS.filter((id) => !(data[id]?.trim()));
    if (missing.length > 0) {
      const firstStep = STEPS.findIndex((s) =>
        s.fields.some((f) => missing.includes(f.id)),
      );
      setErrors(Object.fromEntries(missing.map((id) => [id, true])));
      if (firstStep >= 0) setStep(firstStep);
      scrollToTop();
      return;
    }

    setStatus("submitting");
    setSubmitMessage("");
    try {
      const result = await submitOnboarding(data);
      if (result.ok) {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setStatus("success");
        scrollToTop();
      } else {
        setStatus("error");
        setSubmitMessage(result.message ?? "Something went wrong. Please try again.");
        if (result.errors?.length) {
          setErrors(Object.fromEntries(result.errors.map((id) => [id, true])));
          const firstStep = STEPS.findIndex((s) =>
            s.fields.some((f) => result.errors!.includes(f.id)),
          );
          if (firstStep >= 0) setStep(firstStep);
        }
        scrollToTop();
      }
    } catch {
      setStatus("error");
      setSubmitMessage("Network error. Please try again.");
      scrollToTop();
    }
  }, [data, scrollToTop]);

  const current = STEPS[step];
  const isLast = step === TOTAL_STEPS - 1;
  const progress = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  if (status === "success") {
    return (
      <div ref={topRef}>
        <SuccessScreen />
      </div>
    );
  }

  return (
    <div ref={topRef} className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <BrandHeader />

      <ProgressBar step={step} progress={progress} current={current.title} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isLast) handleSubmit();
          else goNext();
        }}
        noValidate
      >
        {/* Honeypot — hidden from humans, irresistible to bots. */}
        <div className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor={HONEYPOT_FIELD}>Company website</label>
          <input
            id={HONEYPOT_FIELD}
            name={HONEYPOT_FIELD}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={data[HONEYPOT_FIELD] ?? ""}
            onChange={(e) => handleChange(HONEYPOT_FIELD, e.target.value)}
          />
        </div>

        {current.isIntro ? (
          <IntroStep data={data} errors={errors} onChange={handleChange} />
        ) : (
          <SectionStep step={step} data={data} errors={errors} onChange={handleChange} />
        )}

        {status === "error" && submitMessage && (
          <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {submitMessage}
          </p>
        )}

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between gap-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg border border-border px-5 py-3 text-sm font-medium text-foreground-muted transition-colors hover:border-foreground-muted hover:text-foreground"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-lg bg-accent px-7 py-3 text-sm font-semibold text-accent-foreground shadow-[0_0_30px_-8px_var(--color-accent)] transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLast
              ? status === "submitting"
                ? "Submitting…"
                : "Submit onboarding form"
              : step === 0
                ? "Start →"
                : "Next →"}
          </button>
        </div>
      </form>

      <Footer />
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function BrandHeader() {
  return (
    <header className="mb-10 flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">
          4Pie<span className="text-accent">.</span>
        </span>
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.35em] text-foreground-muted">
          Labs
        </span>
      </div>
      <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground-muted">
        Client Onboarding Form
      </span>
    </header>
  );
}

function ProgressBar({
  step,
  progress,
  current,
}: {
  step: number;
  progress: number;
  current: string;
}) {
  return (
    <div className="mb-10">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-foreground-muted">
        <span>
          Step {step + 1} of {TOTAL_STEPS} · {current}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function IntroStep({
  data,
  errors,
  onChange,
}: {
  data: FormData;
  errors: Record<string, boolean>;
  onChange: (id: string, value: string) => void;
}) {
  const intro = STEPS[0];
  return (
    <section>
      <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
        Let’s build your strategy
      </p>
      <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
        Tell us how to make you the{" "}
        <span className="text-accent">obvious choice.</span>
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground-muted">
        The more specific you are, the sharper the system we build. There are no
        wrong answers — just be honest and concrete. This takes about 20 minutes.
      </p>

      {/* Section preview cards */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STEPS.slice(1).map((s) => (
          <div
            key={s.key}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="text-lg font-bold text-accent">{s.index}</div>
            <div className="mt-1 text-sm font-medium text-foreground">{s.title}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-6">
        {intro.fields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={data[field.id] ?? ""}
            error={!!errors[field.id]}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}

function SectionStep({
  step,
  data,
  errors,
  onChange,
}: {
  step: number;
  data: FormData;
  errors: Record<string, boolean>;
  onChange: (id: string, value: string) => void;
}) {
  const section = STEPS[step];
  return (
    <section>
      {/* Section header bar */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent text-lg font-bold text-accent-foreground">
          {section.index}
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {section.title}
          </h2>
          <p className="text-sm text-foreground-muted">{section.subtitle}</p>
        </div>
      </div>

      {section.callout && (
        <p className="mb-8 rounded-lg border-l-2 border-accent bg-surface/60 px-4 py-3 text-sm leading-relaxed text-foreground-muted">
          {section.callout}
        </p>
      )}

      <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-6">
        {section.fields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={data[field.id] ?? ""}
            error={!!errors[field.id]}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: Field;
  value: string;
  error: boolean;
  onChange: (id: string, value: string) => void;
}) {
  const base =
    "w-full rounded-lg border bg-surface-muted px-4 py-3 text-foreground placeholder:text-foreground-muted/50 outline-none transition focus:ring-2";
  const tone = error
    ? "border-red-500/70 focus:border-red-500 focus:ring-red-500/30"
    : "border-border focus:border-accent focus:ring-accent/25";

  return (
    <div className={`flex flex-col gap-2 ${widthClass[field.width]}`}>
      <label htmlFor={field.id} className="text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="ml-1 text-accent">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          id={field.id}
          name={field.id}
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          aria-invalid={error}
          className={`${base} ${tone} resize-y`}
        />
      ) : (
        <input
          id={field.id}
          name={field.id}
          type={field.type === "date" ? "date" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          aria-invalid={error}
          className={`${base} ${tone} [color-scheme:dark]`}
        />
      )}
      {error && (
        <span className="text-xs text-red-400">This field is required.</span>
      )}
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col items-center justify-center px-5 py-16 text-center">
      <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
        All set
      </p>
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
        Thanks — we’ve got <span className="text-accent">everything we need.</span>
      </h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-foreground-muted">
        Your answers are in. We’ll review them and start building your system in
        week one.
      </p>

      <div className="mt-10 w-full rounded-2xl border border-accent/60 bg-surface p-6 text-left sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Done? Book your kickoff call.
          </h2>
          <p className="text-sm text-foreground-muted">
            Lock your slot — we start in week one.
          </p>
        </div>
        <a
          href={BOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-[0_0_30px_-8px_var(--color-accent)] transition-colors hover:bg-accent-strong sm:mt-0"
        >
          Book your kickoff call →
        </a>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-12 flex items-center justify-between border-t border-border pt-5 text-xs text-foreground-muted">
      <span>Fourpie Labs · Client Onboarding Form</span>
      <a
        href="https://fourpielabs.com"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors hover:text-foreground"
      >
        fourpielabs.com
      </a>
    </footer>
  );
}
