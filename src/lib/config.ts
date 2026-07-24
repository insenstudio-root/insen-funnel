/**
 * Liens configurables du funnel. Valeurs surchargées par l'env en preview/prod.
 * Le lien Cal.com reste un placeholder tant que le compte n'existe pas (D2 spec).
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://go.insenstudio.com";
export const HOME_URL = process.env.NEXT_PUBLIC_HOME_URL || "https://insenstudio.com";

/** URL de réservation Cal.com, ou null si non configurée (on masque alors le CTA). */
export function bookingHref(link: string = process.env.NEXT_PUBLIC_CALCOM_LINK || ""): string | null {
  return link ? `https://cal.com/${link}` : null;
}
