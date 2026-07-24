/**
 * Schémas Zod — validation aux frontières (PRD §4.2 / §5.3 / §5.6).
 * Utilisé par POST /api/leads (formulaire /projet) et pour typer les leads.
 */
import { z } from "zod";
import { SECTEUR_VALUES, MATURITE_VALUES, ECHEANCE_VALUES } from "@/lib/leads/enums";

// Rétro-compat : ces exports pointent désormais sur les valeurs maquette.
export const sectorEnum = SECTEUR_VALUES;
export const maturityEnum = MATURITE_VALUES;
export const timelineEnum = ECHEANCE_VALUES;

/** Payload du formulaire public /projet (qualif maquette + consentement + attribution). */
export const projectLeadSchema = z.object({
  source: z.string().max(60).optional(),
  form_id: z.string().max(60).optional(),
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  sector: z.enum(SECTEUR_VALUES),
  project_summary: z.string().min(3).max(500),
  maturity: z.enum(MATURITE_VALUES),
  timeline: z.enum(ECHEANCE_VALUES),
  referral_source: z.string().max(200).optional().or(z.literal("")),
  // Consentement par soumission (mention affichée sous le bouton)
  consent: z.literal(true, { errorMap: () => ({ message: "consentement requis" }) }),
  consent_text: z.string().max(500).optional(),
  consent_at: z.string().max(40).optional(),
  // Honeypot anti-spam : DOIT rester vide
  company_website: z.string().max(0).optional().or(z.literal("")),
  // Attribution
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
