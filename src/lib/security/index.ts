/**
 * Façade de la couche anti-abus : le seul endroit qui lit l'environnement et
 * porte l'état (limiteur de débit). Tout le reste du dossier est pur.
 *
 * Variables d'environnement :
 *   ALLOWED_ORIGINS   liste d'origines autorisées, séparées par des virgules
 *   ANTIBOT_STRICT=1  exige l'horodatage du formulaire (étape 2, après
 *                     ré-injection du formulaire vitrine dans Squarespace)
 *   ANTIBOT_DISABLED=1 neutralise toute la couche (interrupteur d'exploitation)
 */
import type { NextRequest } from "next/server";
import { decideIntake, type IntakeDecision } from "./intake-guard";
import { createRateLimiter } from "./rate-limit";

export { HONEYPOT_FIELDS, MIN_FILL_MS, RULES } from "./intake-guard";
export type { IntakeDecision } from "./intake-guard";

/** Un limiteur par instance serverless (voir la note dans rate-limit.ts). */
const limiter = createRateLimiter();

function allowedOrigins(): string[] {
  const configured = (process.env.ALLOWED_ORIGINS || "https://insenstudio.com,https://www.insenstudio.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // L'app se sert elle-même : /consultation et /projet postent en same-origin.
  const own = process.env.NEXT_PUBLIC_SITE_URL;
  const list = [...configured, "https://go.insenstudio.com"];
  if (own) {
    try {
      list.push(new URL(own).origin);
    } catch {
      /* URL de config illisible : on ignore, les autres origines suffisent. */
    }
  }
  return [...new Set(list)];
}

export function guardIntake(
  req: NextRequest,
  data: Record<string, unknown>,
  content: { full_name?: string; message?: string; email?: string }
): IntakeDecision {
  return decideIntake({
    headers: {
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      xForwardedFor: req.headers.get("x-forwarded-for"),
      xRealIp: req.headers.get("x-real-ip"),
    },
    data,
    content,
    now: Date.now(),
    strict: process.env.ANTIBOT_STRICT === "1",
    disabled: process.env.ANTIBOT_DISABLED === "1",
    allowedOrigins: allowedOrigins(),
    // En dev, le port varie (next dev -p 3011) : on tolère toute la machine locale.
    allowLocalhost: process.env.NODE_ENV !== "production",
    limiter,
  });
}

/**
 * Un rejet est silencieux pour le visiteur : on ne renseigne pas le bot sur ce
 * qui a échoué. La contrepartie, c'est que ce journal est le SEUL moyen de
 * récupérer un vrai lead écarté par erreur — on y consigne donc le payload.
 */
export function logIntakeDrop(route: string, decision: IntakeDecision, data: Record<string, unknown>): void {
  if (decision.action !== "drop") return;
  console.warn(
    `[antibot] ${route} — lead écarté (${decision.reason}${decision.detail ? ` : ${decision.detail}` : ""}) :`,
    JSON.stringify({
      full_name: data.full_name ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      message: data.message ?? data.project_summary ?? null,
      source: data.source ?? null,
    })
  );
}
