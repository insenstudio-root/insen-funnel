/**
 * Attribution first-touch — cookie UTM (30 j). PRD §4.3 (middleware) + §5.3.
 * Permet d'attribuer un lead même si le visiteur navigue avant de convertir.
 */
// TODO: parseUtm(searchParams) → { utm_source, utm_medium, utm_campaign, utm_content }
// TODO: FIRST_TOUCH_COOKIE = 'insen_ft' ; getFirstTouch(cookies) → Attribution
// Le middleware pose le cookie first-touch (landing_path + referrer + utm) sur les pages
// publiques s'il est absent ; les routes API le relisent pour l'insert lead.
export const FIRST_TOUCH_COOKIE = "insen_ft";
export const FIRST_TOUCH_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export type Utm = {
  utm_source?: string; utm_medium?: string; utm_campaign?: string;
  utm_term?: string; utm_content?: string;
};

const UTM_KEYS: (keyof Utm)[] = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
];

/** Extrait les paramètres UTM présents dans une query string. */
export function parseUtm(search: URLSearchParams): Utm {
  const out: Utm = {};
  for (const k of UTM_KEYS) {
    const v = search.get(k);
    if (v) out[k] = v;
  }
  return out;
}
