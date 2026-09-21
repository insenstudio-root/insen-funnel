/**
 * Gardes de requête anti-abus (module pur, testable sans serveur).
 * Toutes les fonctions sont sans effet de bord : la route décide quoi en faire.
 */

/**
 * Vérifie que la requête vient bien d'une de nos surfaces.
 *
 * CORS ne protège que le navigateur : un script qui appelle l'endpoint en
 * direct n'est arrêté par rien tant qu'on ne contrôle pas l'origine côté
 * serveur. Un en-tête reste falsifiable, mais ça élimine le spam opportuniste,
 * qui ne prend pas cette peine.
 */
/** Vrai seulement pour la machine locale — jamais pour « localhost.evil.example ». */
function isLocalhost(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return false;
  }
}

export function isAllowedOrigin(
  headers: { origin: string | null; referer: string | null },
  allowed: string[],
  options: { allowLocalhost?: boolean } = {}
): boolean {
  const accepts = (candidate: string) =>
    allowed.includes(candidate) || (options.allowLocalhost === true && isLocalhost(candidate));

  const origin = headers.origin?.trim();
  // "null" est l'origine opaque d'une iframe sandboxée : jamais une de nos pages.
  if (origin && origin !== "null") return accepts(origin);

  const referer = headers.referer?.trim();
  if (!referer) return false;
  try {
    return accepts(new URL(referer).origin);
  } catch {
    return false;
  }
}

/** Noms des leurres effectivement remplis (un humain ne les voit pas). */
export function filledHoneypots(data: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter((f) => typeof data[f] === "string" && (data[f] as string).trim() !== "");
}

/**
 * Le formulaire horodate son montage et renvoie la valeur. Sous `minMs`, aucun
 * humain n'a pu lire puis remplir les champs.
 *
 * ⚠️ Heuristique, pas preuve : l'horodatage n'est pas signé, un bot averti peut
 * annoncer n'importe quelle date. On traite donc aussi le futur comme suspect.
 * Renvoie `false` si la valeur est absente ou illisible — le mode strict décide
 * séparément si une absence est bloquante.
 */
export function parseTimestamp(value: unknown): number | null {
  let at: number;
  if (typeof value === "number") at = value;
  else if (typeof value === "string") at = Date.parse(value);
  else return null;
  return Number.isFinite(at) ? at : null;
}

export function isTooFast(renderedAt: unknown, now: number, minMs: number): boolean {
  const at = parseTimestamp(renderedAt);
  if (at === null) return false;
  return now - at < minMs;
}

/** Vercel place l'IP du visiteur en tête de la chaîne x-forwarded-for. */
export function clientIp(headers: Record<string, string | undefined>): string {
  const forwarded = headers["x-forwarded-for"];
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return headers["x-real-ip"]?.trim() || "unknown";
}
