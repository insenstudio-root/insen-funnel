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

/**
 * File d'attente locale. Le shim gtag est posé en script inline dans le layout,
 * donc `window.gtag` existe normalement dès le parsing du HTML. Ce repli couvre
 * le cas où il manquerait quand même : on garde l'événement et on le rejoue.
 *
 * ⚠️ Ne jamais « replier » en poussant un tableau dans `dataLayer` :
 * gtag.js ne relit que des objets `arguments` et ignore un tableau en silence.
 * C'est ce qui faisait disparaître `generate_lead` (constaté le 2026-07-26).
 */
const enAttente: Array<[string, GaParams]> = [];
let relance: ReturnType<typeof setInterval> | undefined;
let essais = 0;

function vider(w: GtagWindow): void {
  if (typeof w.gtag !== "function") return;
  while (enAttente.length) {
    const evenement = enAttente.shift();
    if (evenement) w.gtag("event", evenement[0], evenement[1]);
  }
  if (relance) {
    clearInterval(relance);
    relance = undefined;
  }
}

/** Envoie un événement GA4 via le gtag chargé dans le layout. Échec silencieux. */
export function gaEvent(name: string, params?: GaParams): void {
  if (typeof window === "undefined") return;
  try {
    const w = window as GtagWindow;
    if (typeof w.gtag === "function") {
      vider(w);
      w.gtag("event", name, params || {});
      return;
    }
    enAttente.push([name, params || {}]);
    if (relance) return;
    // gtag.js met rarement plus de quelques secondes. Au-delà de 10 s on
    // abandonne plutôt que de laisser tourner un timer pour rien.
    essais = 0;
    relance = setInterval(() => {
      essais += 1;
      vider(w);
      if (essais > 50 && relance) {
        clearInterval(relance);
        relance = undefined;
      }
    }, 200);
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
