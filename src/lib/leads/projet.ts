/**
 * Mappers purs pour le lead /projet : classification, champs d'email lisibles,
 * ligne d'insert `leads`. Aucune dépendance runtime (testable en isolation).
 */
import type { ProjectLead } from "@/lib/validation/lead";
import { SECTEUR_LABELS, MATURITE_LABELS, ECHEANCE_LABELS } from "@/lib/leads/enums";

export function classifyPayload(data: Record<string, unknown>): "projet" | "contact" | "unknown" {
  if (typeof data.sector === "string" && typeof data.project_summary === "string") return "projet";
  if (typeof data.message === "string") return "contact";
  return "unknown";
}

export function projetEmailFields(lead: ProjectLead): Record<string, string | undefined> {
  const campagne = [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ");
  return {
    Secteur: SECTEUR_LABELS[lead.sector],
    Maturité: MATURITE_LABELS[lead.maturity],
    Échéance: ECHEANCE_LABELS[lead.timeline],
    Provenance: lead.referral_source || undefined,
    Page: lead.page_path || lead.landing_path || undefined,
    Campagne: campagne || undefined,
    Consentement: lead.consent
      ? `oui (${lead.consent_at || "date non fournie"})`
      : "non",
    "Texte du consentement": lead.consent_text || undefined,
  };
}

export function projetDbRow(lead: ProjectLead): Record<string, unknown> {
  return {
    full_name: lead.full_name,
    email: lead.email,
    phone: lead.phone || null,
    sector: lead.sector,
    project_summary: lead.project_summary,
    maturity: lead.maturity,
    timeline: lead.timeline,
    referral_source: lead.referral_source || null,
    utm_source: lead.utm_source || null,
    utm_medium: lead.utm_medium || null,
    utm_campaign: lead.utm_campaign || null,
    utm_content: lead.utm_content || null,
    landing_path: lead.landing_path || null,
    referrer: lead.referrer || null,
    channel: "site",
    notes: JSON.stringify({
      form: "projet",
      source: lead.source,
      consent: lead.consent,
      consent_text: lead.consent_text,
      consent_at: lead.consent_at,
      utm_term: lead.utm_term,
      page_path: lead.page_path,
      locale: lead.locale,
    }),
  };
}
