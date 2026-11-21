import { useState, useRef, useEffect } from "preact/hooks";
import en from "../i18n/en.json";
import ar from "../i18n/ar.json";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm({ locale = "en" }: { locale?: "en" | "ar" }) {
  const dictionary = (locale === "ar" ? ar : en) as Record<string, string>;
  const t = (text: string) => dictionary[text] ?? text;
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function reset() {
    setStatus("idle");
    setErrorMsg("");
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    // GitHub Pages has no server/API. Keep the initial form appearance identical
    // and explain this limitation only if a visitor attempts to submit it.
    setErrorMsg(t("This is a static preview. To send an enquiry, please email sales@axion-s.com."));
    setStatus("error");
    timerRef.current = setTimeout(reset, 6000);
  }

  const sending = status === "sending";
  const inputClasses =
    "w-full px-4 py-3 bg-paper border border-slate/30 text-ink text-sm rounded-sm focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-colors";

  return (
    <form ref={formRef} onSubmit={handleSubmit} class="space-y-5"
      onInvalidCapture={(event) => {
        if (locale !== "ar") return;
        const field = event.target as HTMLInputElement;
        field.setCustomValidity(t(field.validity.valueMissing ? "Please fill out this field." : "Please enter a valid email address."));
      }}
      onInput={(event) => (event.target as HTMLInputElement).setCustomValidity("")}
    >
      <div>
        <label for="name" class="block text-sm font-medium text-ink mb-1.5">
          {t("Name")}
        </label>
        <input
          type="text"
          id="name"
          name="name"
          dir="auto"
          required
          class={inputClasses}
        />
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-ink mb-1.5">
          {t("Email")}
        </label>
        <input
          type="email"
          id="email"
          name="email"
          dir="ltr"
          required
          class={inputClasses}
        />
      </div>

      <div>
        <label for="phone" class="block text-sm font-medium text-ink mb-1.5">
          {t("Phone")}{" "}
          <span class="text-slate">{t("(optional)")}</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          dir="ltr"
          class={inputClasses}
        />
      </div>

      <div>
        <label for="subject" class="block text-sm font-medium text-ink mb-1.5">
          {t("Subject")}
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          dir="auto"
          required
          class={inputClasses}
        />
      </div>

      <div>
        <label for="message" class="block text-sm font-medium text-ink mb-1.5">
          {t("Message")}
        </label>
        <textarea
          id="message"
          name="message"
          dir="auto"
          rows={5}
          required
          class={`${inputClasses} resize-y`}
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={sending}
        class="w-full px-6 py-3 bg-signal text-ink font-semibold text-sm tracking-tight rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-signal/90"
      >
        {t(sending ? "Sending..." : "Submit")}
      </button>

      {status === "success" && (
        <div role="status" aria-live="polite" class="flex items-start justify-between gap-3 text-sm font-medium text-signal-text bg-signal-dim border border-signal/20 rounded-sm px-4 py-3">
          <span>{t("Message sent — we'll get back to you soon.")}</span>
          <button
            type="button"
            onClick={reset}
            class="text-signal-text/60 hover:text-signal-text transition-colors shrink-0 mt-0.5"
            aria-label={t("Dismiss")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {status === "error" && (
        <div role="alert" class="flex items-start justify-between gap-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-sm px-4 py-3">
          <span>{errorMsg || t("Something went wrong — please try again or email us directly.")}</span>
          <button
            type="button"
            onClick={reset}
            class="text-red-700/60 hover:text-red-700 transition-colors shrink-0 mt-0.5"
            aria-label={t("Dismiss")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </form>
  );
}
