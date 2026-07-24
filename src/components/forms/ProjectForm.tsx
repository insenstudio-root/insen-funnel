"use client";
/**
 * ProjectForm — /projet (maquette projet-v2). Secteur (6 tuiles) · projet en une
 * phrase · maturité (3 tuiles) · échéance (4 chips) · provenance (select) ·
 * nom/email/tél · honeypot company_website · consentement par soumission.
 * POST /api/leads (même origine) → /merci?src=form.
 */
import { useRef, useState } from "react";
import { SECTEURS, MATURITES, ECHEANCES, PROVENANCES } from "@/lib/leads/enums";
import { parseUtm } from "@/lib/attribution";
import styles from "./ProjectForm.module.css";

const CONSENT_TEXT =
  "En envoyant votre demande, vous acceptez que nous traitions ces informations pour vous recontacter.";

type FieldKey = "sector" | "project_summary" | "maturity" | "timeline" | "full_name" | "email";
type Errors = Partial<Record<FieldKey, string>>;

export function ProjectForm() {
  const [sector, setSector] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [maturity, setMaturity] = useState("");
  const [timeline, setTimeline] = useState("");
  const [referral, setReferral] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);

  function validate(): Errors {
    const e: Errors = {};
    if (!sector) e.sector = "Choisissez un secteur.";
    if (projectSummary.trim().length < 3) e.project_summary = "Décrivez votre projet en une phrase.";
    if (!maturity) e.maturity = "Où en êtes-vous ?";
    if (!timeline) e.timeline = "Choisissez une échéance.";
    if (fullName.trim().length < 2) e.full_name = "Votre nom.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Email invalide.";
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
    const payload = {
      source: "projet_funnel",
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      sector,
      project_summary: projectSummary.trim(),
      maturity,
      timeline,
      referral_source: referral,
      consent: true,
      consent_text: CONSENT_TEXT,
      consent_at: new Date().toISOString(),
      company_website: honeypot.current?.value || "",
      ...parseUtm(url.searchParams),
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
      window.location.assign("/merci?src=form");
    } catch {
      setSending(false);
      setServerError("Envoi impossible pour le moment. Réessayez ou écrivez à contact@insenstudio.com.");
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {/* Secteur */}
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Votre secteur</legend>
        <div className={styles.tiles}>
          {SECTEURS.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-label={s.label}
              aria-pressed={sector === s.value}
              className={`${styles.tile} ${sector === s.value ? styles.tileOn : ""}`}
              onClick={() => setSector(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {errors.sector && <p className={styles.error}>{errors.sector}</p>}
      </fieldset>

      {/* Projet en une phrase */}
      <div className={styles.group}>
        <label htmlFor="project_summary" className={styles.label}>Votre projet en une phrase</label>
        <textarea
          id="project_summary"
          className={styles.textarea}
          placeholder="Ex. : reprendre la main sur nos réservations directes."
          value={projectSummary}
          onChange={(e) => setProjectSummary(e.target.value)}
          rows={2}
        />
        {errors.project_summary && <p className={styles.error}>{errors.project_summary}</p>}
      </div>

      {/* Maturité */}
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Où en êtes-vous ?</legend>
        <div className={styles.tilesCol}>
          {MATURITES.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-label={m.label}
              aria-pressed={maturity === m.value}
              className={`${styles.tileWide} ${maturity === m.value ? styles.tileOn : ""}`}
              onClick={() => setMaturity(m.value)}
            >
              <span className={styles.tileTitle}>{m.label}</span>
              <span className={styles.tileDesc}>{m.desc}</span>
            </button>
          ))}
        </div>
        {errors.maturity && <p className={styles.error}>{errors.maturity}</p>}
      </fieldset>

      {/* Échéance */}
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Échéance</legend>
        <div className={styles.chips}>
          {ECHEANCES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={c.label}
              aria-pressed={timeline === c.value}
              className={`${styles.chip} ${timeline === c.value ? styles.chipOn : ""}`}
              onClick={() => setTimeline(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {errors.timeline && <p className={styles.error}>{errors.timeline}</p>}
      </fieldset>

      {/* Provenance (optionnel) */}
      <div className={styles.group}>
        <label htmlFor="referral" className={styles.label}>
          Comment nous avez-vous connu ? <span className={styles.optional}>(optionnel)</span>
        </label>
        <select
          id="referral"
          className={styles.select}
          value={referral}
          onChange={(e) => setReferral(e.target.value)}
        >
          <option value="">Choisir…</option>
          {PROVENANCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Identité */}
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
        <label htmlFor="phone" className={styles.label}>
          Téléphone <span className={styles.optional}>(optionnel)</span>
        </label>
        <input
          id="phone" type="tel" className={styles.input} placeholder="+213 …"
          value={phone} onChange={(e) => setPhone(e.target.value)}
        />
        <p className={styles.hint}>Utile pour un rappel rapide.</p>
      </div>

      {/* Honeypot anti-bot — caché aux humains */}
      <div aria-hidden="true" className={styles.honeypot}>
        <label htmlFor="company_website">Ne pas remplir</label>
        <input id="company_website" ref={honeypot} tabIndex={-1} autoComplete="off" />
      </div>

      {serverError && <p className={styles.serverError} role="alert">{serverError}</p>}

      <button type="submit" className={styles.submit} disabled={sending}>
        <span>{sending ? "Envoi en cours…" : "Envoyer la demande"}</span>
        <span aria-hidden="true">→</span>
      </button>

      <p className={styles.consent}>
        {CONSENT_TEXT}{" "}
        <a href="/confidentialite">Politique de confidentialité</a>.
      </p>
    </form>
  );
}
