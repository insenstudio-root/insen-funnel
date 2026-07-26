"use client";
/**
 * AuditForm — /consultation (« Demander un audit digital »). Version courte, haut
 * de funnel : nom / email / site ou réseaux / téléphone / situation en quelques
 * mots + consentement par soumission. Honeypot company_website.
 * POST /api/leads (source: audit_funnel) → classé « contact » côté serveur
 * (présence de `message`), e-mail à contact@insenstudio.com → /merci?src=form.
 */
import { useRef, useState } from "react";
import { parseUtm } from "@/lib/attribution";
import { gaEvent, hotelSourceFromUrl } from "@/lib/ga";
import styles from "./ProjectForm.module.css";

const CONSENT_TEXT =
  "En envoyant votre demande, vous acceptez que nous traitions ces informations pour vous recontacter.";

type FieldKey = "full_name" | "email" | "message";
type Errors = Partial<Record<FieldKey, string>>;

export function AuditForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentSite, setCurrentSite] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  function onFirstInteract() {
    if (started.current) return;
    started.current = true;
    gaEvent("form_start", { form_type: "audit", hotel_source: hotelSourceFromUrl() });
  }

  function validate(): Errors {
    const e: Errors = {};
    if (fullName.trim().length < 2) e.full_name = "Votre nom.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Email invalide.";
    if (message.trim().length < 3) e.message = "Dites-nous où vous en êtes.";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setServerError("");

    const url = new URL(window.location.href);
    const utm = parseUtm(url.searchParams);
    const payload = {
      source: "audit_funnel",
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      current_site: currentSite.trim(),
      message: message.trim(),
      consent: true,
      consent_text: CONSENT_TEXT,
      consent_at: new Date().toISOString(),
      company_website: honeypot.current?.value || "",
      ...utm,
      landing_path: url.pathname,
      page_path: url.pathname,
      referrer: document.referrer || undefined,
      locale: "fr",
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("delivery");
      const q = new URLSearchParams({ src: "form", form_type: "audit" });
      if (utm.utm_content) q.set("hotel", utm.utm_content);
      if (utm.utm_campaign) q.set("camp", utm.utm_campaign);
      window.location.assign("/merci?" + q.toString());
    } catch {
      setSending(false);
      setServerError("Envoi impossible pour le moment. Réessayez ou écrivez à contact@insenstudio.com.");
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} onFocusCapture={onFirstInteract} noValidate>
      <div className={styles.group}>
        <label htmlFor="full_name" className={styles.label}>Votre nom</label>
        <input
          id="full_name" className={styles.input} placeholder="Nom et prénom"
          value={fullName} onChange={(e) => setFullName(e.target.value)}
        />
        {errors.full_name && <p className={styles.error}>{errors.full_name}</p>}
      </div>

      <div className={styles.group}>
        <label htmlFor="email" className={styles.label}>Email</label>
        <input
          id="email" type="email" className={styles.input} placeholder="vous@entreprise.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        {errors.email && <p className={styles.error}>{errors.email}</p>}
      </div>

      <div className={styles.group}>
        <label htmlFor="current_site" className={styles.label}>
          Votre site ou vos réseaux <span className={styles.optional}>(optionnel)</span>
        </label>
        <input
          id="current_site" className={styles.input} placeholder="https://votresite.com ou @votrecompte"
          value={currentSite} onChange={(e) => setCurrentSite(e.target.value)}
        />
        <p className={styles.hint}>Ce qu&apos;on regarde en premier.</p>
      </div>

      <div className={styles.group}>
        <label htmlFor="phone" className={styles.label}>
          Téléphone <span className={styles.optional}>(optionnel)</span>
        </label>
        <input
          id="phone" type="tel" className={styles.input} placeholder="+213 …"
          value={phone} onChange={(e) => setPhone(e.target.value)}
        />
        <p className={styles.hint}>Utile pour un rappel rapide.</p>
      </div>

      <div className={styles.group}>
        <label htmlFor="message" className={styles.label}>Où en êtes-vous ?</label>
        <textarea
          id="message" className={styles.textarea} rows={3}
          placeholder="Ex. : on a un site mais il ne ramène pas de clients."
          value={message} onChange={(e) => setMessage(e.target.value)}
        />
        {errors.message && <p className={styles.error}>{errors.message}</p>}
      </div>

      {/* Honeypot anti-bot — caché aux humains */}
      <div aria-hidden="true" className={styles.honeypot}>
        <label htmlFor="company_website">Ne pas remplir</label>
        <input id="company_website" ref={honeypot} tabIndex={-1} autoComplete="off" />
      </div>

      {serverError && <p className={styles.serverError} role="alert">{serverError}</p>}

      <button type="submit" className={styles.submit} disabled={sending}>
        <span>{sending ? "Envoi en cours…" : "Demander mon audit"}</span>
        <span aria-hidden="true">→</span>
      </button>

      <p className={styles.consent}>
        {CONSENT_TEXT}{" "}
        <a href="/confidentialite">Politique de confidentialité</a>.
      </p>
    </form>
  );
}
