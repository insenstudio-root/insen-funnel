/**
 * GA4 — parcours funnel (go.insenstudio.com). Même propriété que la vitrine
 * (G-BZH8PDBJNX) pour un suivi cross-domaine www ↔ go (linking déclaré côté GA4).
 * Aucune donnée personnelle en paramètre (jamais nom/email/téléphone) : seul
 * hotel_source (= utm_content, un slug d'hôtel issu de l'URL) circule.
 */
export const GA_ID = "G-BZH8PDBJNX";

type GaParams = Record<string, string | number | boolean | undefined>;

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
};

/** Envoie un événement GA4 via le gtag chargé dans le layout. Échec silencieux. */
export function gaEvent(name: string, params?: GaParams): void {
  if (typeof window === "undefined") return;
  try {
    const w = window as GtagWindow;
    if (typeof w.gtag === "function") w.gtag("event", name, params || {});
    else (w.dataLayer = w.dataLayer || []).push(["event", name, params || {}]);
  } catch {
    /* la mesure ne doit jamais casser un parcours */
  }
}

/** hotel_source = utm_content de l'URL courante, sinon "direct". */
export function hotelSourceFromUrl(): string {
  if (typeof window === "undefined") return "direct";
  try {
    return new URLSearchParams(window.location.search).get("utm_content") || "direct";
  } catch {
    return "direct";
  }
}
