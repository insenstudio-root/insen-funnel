/**
 * Schémas Zod — validation aux frontières (PRD §4.2 / §5.3 / §5.6).
 * Utilisé par POST /api/leads (formulaire /projet) et pour typer les leads.
 */
import { z } from "zod";

export const sectorEnum = [
  "tourisme_hospitalite",
  "sante_bienetre_formation",
  "nouveaux_concepts",
  "autre",
] as const;
export const maturityEnum = ["explore", "cahier_des_charges", "compare"] as const;
export const timelineEnum = ["moins_1_mois", "1_3_mois", "pas_presse"] as const;

/** Payload du formulaire public /projet (5 champs qualif + 3 identité + honeypot). */
export const projectLeadSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  company: z.string().max(160).optional().or(z.literal("")),
  sector: z.enum(sectorEnum),
  project_summary: z.string().min(3).max(500), // "le projet en une phrase"
  maturity: z.enum(maturityEnum),
  timeline: z.enum(timelineEnum),
  referral_source: z.string().max(200).optional().or(z.literal("")),
  // honeypot anti-spam : doit rester vide (rejet si rempli)
  _hp: z.string().max(0).optional(),
});
export type ProjectLead = z.infer<typeof projectLeadSchema>;

/**
 * Payload du formulaire de CONTACT de la vitrine (composant formulaire-contact,
 * page /contact injectée dans Squarespace). Plus court que /projet : il ouvre
 * une conversation, il ne qualifie pas. Il POST en cross-origin vers cette API.
 * Contrat figé côté vitrine (scratchpad/sdd/formulaire-contact-report.md).
 */
export const contactLeadSchema = z.object({
  source: z.string().max(60).optional(),        // 'contact_vitrine'
  form_id: z.string().max(60).optional(),
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().min(3).max(3000),
  // Consentement RGPD — preuve à conserver
  consent: z.literal(true, { errorMap: () => ({ message: "consentement requis" }) }),
  consent_text: z.string().max(500).optional(),
  consent_at: z.string().max(40).optional(),
  // Honeypot anti-spam : doit rester vide (rempli = bot → drop silencieux côté route)
  company_website: z.string().max(0).optional().or(z.literal("")),
  // Attribution (remplie côté client depuis le store first-touch)
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  landing_path: z.string().max(300).optional(),
  page_path: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
  locale: z.string().max(10).optional(),
});
export type ContactLead = z.infer<typeof contactLeadSchema>;

/** Attribution injectée côté serveur depuis le cookie first-touch (PRD §4.3). */
export const attributionSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  landing_path: z.string().optional(),
  referrer: z.string().optional(),
});
export type Attribution = z.infer<typeof attributionSchema>;
