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
export {};
