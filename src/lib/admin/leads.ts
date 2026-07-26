/**
 * Types + métadonnées du back-office leads. Miroir du schéma 0001_init.sql.
 */
export type LeadStatus =
  | "nouveau" | "call_reserve" | "call_effectue" | "proposition" | "signe" | "perdu" | "non_qualifie";
export type LeadChannel = "site" | "outbound" | "referral" | "autre";

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  sector: string | null;
  project_summary: string | null;
  maturity: string | null;
  timeline: string | null;
  referral_source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_path: string | null;
  referrer: string | null;
  status: LeadStatus;
  channel: LeadChannel;
  notes: string | null;
};

export type LeadEventType =
  | "form_submitted" | "booking_created" | "booking_rescheduled" | "booking_cancelled"
  | "call_completed" | "status_changed" | "note_added";

export type LeadEvent = {
  id: number;
  lead_id: string;
  created_at: string;
  event_type: LeadEventType;
  payload: Record<string, unknown> | null;
};

export const STATUS_META: Record<LeadStatus, { label: string; tone: string }> = {
  nouveau: { label: "Nouveau", tone: "blue" },
  call_reserve: { label: "Call réservé", tone: "purple" },
  call_effectue: { label: "Call effectué", tone: "amber" },
  proposition: { label: "Proposition", tone: "amber" },
  signe: { label: "Signé", tone: "green" },
  perdu: { label: "Perdu", tone: "red" },
  non_qualifie: { label: "Non qualifié", tone: "gray" },
};
export const STATUS_ORDER: LeadStatus[] = [
  "nouveau", "call_reserve", "call_effectue", "proposition", "signe", "perdu", "non_qualifie",
];

export const CHANNEL_LABELS: Record<LeadChannel, string> = {
  site: "Site", outbound: "Outbound", referral: "Recommandation", autre: "Autre",
};

export const SECTOR_LABELS: Record<string, string> = {
  hotellerie: "Hôtellerie", restauration: "Restauration", sante: "Santé",
  commerce: "Commerce", marques: "Marques", autre: "Autre",
};

export const EVENT_LABELS: Record<LeadEventType, string> = {
  form_submitted: "Formulaire envoyé",
  booking_created: "Créneau réservé",
  booking_rescheduled: "Créneau déplacé",
  booking_cancelled: "Créneau annulé",
  call_completed: "Call effectué",
  status_changed: "Statut modifié",
  note_added: "Note ajoutée",
};

/** Source d'attribution lisible : slug hôtel (utm_content), campagne, source, ou "direct". */
export function leadSource(l: Pick<Lead, "utm_source" | "utm_campaign" | "utm_content">): string {
  return l.utm_content || l.utm_campaign || l.utm_source || "direct";
}
