import { expect, test } from "vitest";
import { decideIntake, type IntakeInput } from "./intake-guard";
import { createRateLimiter } from "./rate-limit";

const NOW = Date.parse("2026-09-21T12:00:00.000Z");
const ALLOWED = ["https://insenstudio.com", "https://www.insenstudio.com", "https://go.insenstudio.com"];

/** Une soumission humaine irréprochable ; chaque test n'en altère qu'un aspect. */
function legitimate(over: Partial<IntakeInput> = {}): IntakeInput {
  return {
    headers: { origin: "https://go.insenstudio.com", referer: null, xForwardedFor: "203.0.113.5", xRealIp: null },
    data: { form_rendered_at: new Date(NOW - 45_000).toISOString() },
    content: { full_name: "Mehdi Allahoum", message: "On aimerait refondre notre site.", email: "mehdi@example.com" },
    now: NOW,
    strict: false,
    allowedOrigins: ALLOWED,
    limiter: createRateLimiter(() => NOW),
    ...over,
  };
}

test("accepte une soumission humaine", () => {
  expect(decideIntake(legitimate())).toEqual({ action: "accept" });
});

test("écarte une requête venue d'une origine étrangère", () => {
  const d = decideIntake(
    legitimate({ headers: { origin: "https://evil.example", referer: null, xForwardedFor: null, xRealIp: null } })
  );
  expect(d).toMatchObject({ action: "drop", reason: "origin" });
});

test("écarte un POST direct sans Origin ni Referer", () => {
  const d = decideIntake(
    legitimate({ headers: { origin: null, referer: null, xForwardedFor: null, xRealIp: null } })
  );
  expect(d).toMatchObject({ action: "drop", reason: "origin" });
});

test("écarte une soumission dont un leurre est rempli", () => {
  const d = decideIntake(legitimate({ data: { company_website: "http://spam.example" } }));
  expect(d).toMatchObject({ action: "drop", reason: "honeypot" });
});

test("écarte une soumission dont le second leurre est rempli", () => {
  const d = decideIntake(legitimate({ data: { insen_check: "bot@spam.example" } }));
  expect(d).toMatchObject({ action: "drop", reason: "honeypot" });
});

/**
 * Le formulaire de contact de la vitrine envoie depuis toujours son propre
 * leurre `insen_fc_check` (contact-head.html), que le serveur n'a jamais lu.
 */
test("écarte une soumission dont le leurre historique de la vitrine est rempli", () => {
  const d = decideIntake(legitimate({ data: { insen_fc_check: "http://spam.example" } }));
  expect(d).toMatchObject({ action: "drop", reason: "honeypot" });
});

test("écarte une soumission remplie plus vite qu'un humain", () => {
  const d = decideIntake(legitimate({ data: { form_rendered_at: new Date(NOW - 400).toISOString() } }));
  expect(d).toMatchObject({ action: "drop", reason: "timing" });
});

test("écarte le nom en chaîne aléatoire de la capture de production", () => {
  const d = decideIntake(
    legitimate({ content: { full_name: "fEthwyOYBgChBuJgUXHo", message: "hello", email: "x@example.com" } })
  );
  expect(d).toMatchObject({ action: "drop", reason: "content" });
});

// --- Compatibilité avec le formulaire vitrine pas encore ré-injecté ---

test("laisse passer un horodatage absent tant que le mode strict est éteint", () => {
  expect(decideIntake(legitimate({ data: {} }))).toEqual({ action: "accept" });
});

test("exige l'horodatage une fois le mode strict activé", () => {
  const d = decideIntake(legitimate({ data: {}, strict: true }));
  expect(d).toMatchObject({ action: "drop", reason: "missing_timing" });
});

test("exige un horodatage LISIBLE en mode strict, pas seulement présent", () => {
  const d = decideIntake(legitimate({ data: { form_rendered_at: "n'importe quoi" }, strict: true }));
  expect(d).toMatchObject({ action: "drop", reason: "missing_timing" });
});

test("accepte un horodatage en millisecondes en mode strict", () => {
  expect(decideIntake(legitimate({ data: { form_rendered_at: NOW - 45_000 }, strict: true }))).toEqual({
    action: "accept",
  });
});

// --- Débit ---

test("freine une IP qui dépasse son quota", () => {
  const limiter = createRateLimiter(() => NOW);
  let last = decideIntake(legitimate({ limiter }));
  for (let i = 0; i < 5; i++) last = decideIntake(legitimate({ limiter }));
  expect(last).toMatchObject({ action: "throttle" });
  expect((last as { retryAfterMs: number }).retryAfterMs).toBeGreaterThan(0);
});

test("freine une adresse e-mail qui revient depuis plusieurs IP", () => {
  const limiter = createRateLimiter(() => NOW);
  const ips = ["203.0.113.1", "203.0.113.2", "203.0.113.3", "203.0.113.4"];
  let last = decideIntake(legitimate({ limiter }));
  for (const ip of ips) {
    last = decideIntake(
      legitimate({ limiter, headers: { origin: "https://go.insenstudio.com", referer: null, xForwardedFor: ip, xRealIp: null } })
    );
  }
  expect(last).toMatchObject({ action: "throttle" });
});

test("ne consomme pas le quota pour une soumission déjà écartée", () => {
  const limiter = createRateLimiter(() => NOW);
  for (let i = 0; i < 10; i++) decideIntake(legitimate({ limiter, data: { company_website: "spam" } }));
  expect(decideIntake(legitimate({ limiter }))).toEqual({ action: "accept" });
});

// --- Interrupteur d'exploitation ---

test("laisse tout passer quand la couche est désactivée", () => {
  const d = decideIntake(
    legitimate({
      disabled: true,
      headers: { origin: "https://evil.example", referer: null, xForwardedFor: null, xRealIp: null },
      content: { full_name: "fEthwyOYBgChBuJgUXHo", message: "hello", email: "x@example.com" },
    })
  );
  expect(d).toEqual({ action: "accept" });
});
