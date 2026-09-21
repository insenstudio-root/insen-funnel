/**
 * Point de décision unique pour la réception d'un lead (module pur).
 *
 * Les routes ne décident de rien : elles rassemblent les en-têtes et le payload,
 * appellent `decideIntake`, puis appliquent la décision. Tout est injecté
 * (horloge, limiteur) pour rester testable sans serveur.
 *
 * Ordre des gardes : du moins coûteux au plus coûteux, et le débit en dernier —
 * ainsi une rafale de spam déjà écartée ne consomme pas le quota d'un visiteur
 * légitime partageant la même sortie réseau.
 */
import { checkContent } from "./antibot";
import type { RateLimiter, RateLimitRule } from "./rate-limit";
import { clientIp, filledHoneypots, isAllowedOrigin, isTooFast, parseTimestamp } from "./request-guard";

/**
 * Champs invisibles pour un humain : remplis = automate.
 *
 * Les noms sont NEUTRES à dessein. Un leurre nommé « email_confirm » ou
 * « company_website » est une cible classique d'autofill (Chrome et les
 * gestionnaires de mots de passe ignorent souvent autocomplete="off"), et un
 * faux positif ferait perdre un vrai message. Les champs portent donc aussi
 * `readonly` côté formulaire, qui bloque l'autofill sans gêner les bots qui
 * parsent le DOM.
 *
 * `insen_fc_check` est le leurre historique du formulaire de contact de la
 * vitrine : il était envoyé depuis toujours, sans que le serveur le lise.
 */
export const HONEYPOT_FIELDS = ["company_website", "insen_fc_check", "insen_check"];

/** Sous ce délai, personne n'a lu puis rempli le formulaire. */
export const MIN_FILL_MS = 2_500;

export const RULES: Record<"ip" | "email" | "global", RateLimitRule> = {
  ip: { limit: 3, windowMs: 10 * 60 * 1000 },
  email: { limit: 2, windowMs: 60 * 60 * 1000 },
  global: { limit: 30, windowMs: 60 * 60 * 1000 },
};

export type IntakeInput = {
  headers: {
    origin: string | null;
    referer: string | null;
    xForwardedFor: string | null;
    xRealIp: string | null;
  };
  data: Record<string, unknown>;
  content: { full_name?: string; message?: string; email?: string };
  now: number;
  /** Exige l'horodatage du formulaire. À n'activer qu'une fois toutes les surfaces ré-injectées. */
  strict: boolean;
  /** Interrupteur d'exploitation : neutralise la couche sans redéployer. */
  disabled?: boolean;
  allowedOrigins: string[];
  /** Hors production seulement : accepte n'importe quel port de la machine locale. */
  allowLocalhost?: boolean;
  limiter: RateLimiter;
};

export type IntakeDecision =
  | { action: "accept" }
  | { action: "drop"; reason: string; detail?: string }
  | { action: "throttle"; retryAfterMs: number };

export function decideIntake(input: IntakeInput): IntakeDecision {
  if (input.disabled) return { action: "accept" };

  const originOk = isAllowedOrigin(
    { origin: input.headers.origin, referer: input.headers.referer },
    input.allowedOrigins,
    { allowLocalhost: input.allowLocalhost }
  );
  if (!originOk) {
    return { action: "drop", reason: "origin", detail: input.headers.origin || input.headers.referer || "aucune" };
  }

  const honeypots = filledHoneypots(input.data, HONEYPOT_FIELDS);
  if (honeypots.length > 0) {
    return { action: "drop", reason: "honeypot", detail: honeypots.join(",") };
  }

  const renderedAt = input.data.form_rendered_at;
  // En mode strict, un horodatage illisible vaut un horodatage absent : sinon
  // il suffirait d'envoyer n'importe quelle chaîne pour désarmer la garde.
  if (input.strict && parseTimestamp(renderedAt) === null) {
    return { action: "drop", reason: "missing_timing" };
  }
  if (isTooFast(renderedAt, input.now, MIN_FILL_MS)) {
    return { action: "drop", reason: "timing", detail: String(renderedAt) };
  }

  const content = checkContent({ full_name: input.content.full_name ?? "", message: input.content.message });
  if (content.spam) {
    return { action: "drop", reason: "content", detail: content.signals.join(",") };
  }

  const ip = clientIp({
    "x-forwarded-for": input.headers.xForwardedFor ?? undefined,
    "x-real-ip": input.headers.xRealIp ?? undefined,
  });
  const byIp = input.limiter.hit(`ip:${ip}`, RULES.ip);
  if (!byIp.allowed) return { action: "throttle", retryAfterMs: byIp.retryAfterMs };

  const email = input.content.email?.trim().toLowerCase();
  if (email) {
    const byEmail = input.limiter.hit(`email:${email}`, RULES.email);
    if (!byEmail.allowed) return { action: "throttle", retryAfterMs: byEmail.retryAfterMs };
  }

  const global = input.limiter.hit("global", RULES.global);
  if (!global.allowed) return { action: "throttle", retryAfterMs: global.retryAfterMs };

  return { action: "accept" };
}
