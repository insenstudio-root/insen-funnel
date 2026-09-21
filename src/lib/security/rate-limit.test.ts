import { expect, test } from "vitest";
import { createRateLimiter } from "./rate-limit";

const RULE = { limit: 3, windowMs: 10 * 60 * 1000 };

/** Horloge pilotée : aucun test ne dépend du temps réel. */
function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

test("laisse passer les soumissions tant que la limite n'est pas atteinte", () => {
  const c = clock();
  const limiter = createRateLimiter(c.now);
  expect(limiter.hit("ip:1.2.3.4", RULE).allowed).toBe(true);
  expect(limiter.hit("ip:1.2.3.4", RULE).allowed).toBe(true);
  expect(limiter.hit("ip:1.2.3.4", RULE).allowed).toBe(true);
});

test("bloque la soumission qui dépasse la limite", () => {
  const c = clock();
  const limiter = createRateLimiter(c.now);
  for (let i = 0; i < RULE.limit; i++) limiter.hit("ip:1.2.3.4", RULE);
  expect(limiter.hit("ip:1.2.3.4", RULE).allowed).toBe(false);
});

test("annonce le délai restant avant réouverture", () => {
  const c = clock();
  const limiter = createRateLimiter(c.now);
  for (let i = 0; i < RULE.limit; i++) limiter.hit("ip:1.2.3.4", RULE);
  c.advance(4 * 60 * 1000);
  expect(limiter.hit("ip:1.2.3.4", RULE).retryAfterMs).toBe(6 * 60 * 1000);
});

test("rouvre la fenêtre une fois le délai écoulé", () => {
  const c = clock();
  const limiter = createRateLimiter(c.now);
  for (let i = 0; i < RULE.limit; i++) limiter.hit("ip:1.2.3.4", RULE);
  expect(limiter.hit("ip:1.2.3.4", RULE).allowed).toBe(false);
  c.advance(RULE.windowMs + 1);
  expect(limiter.hit("ip:1.2.3.4", RULE).allowed).toBe(true);
});

test("compte chaque clé indépendamment", () => {
  const c = clock();
  const limiter = createRateLimiter(c.now);
  for (let i = 0; i < RULE.limit; i++) limiter.hit("ip:1.2.3.4", RULE);
  expect(limiter.hit("ip:1.2.3.4", RULE).allowed).toBe(false);
  expect(limiter.hit("ip:5.6.7.8", RULE).allowed).toBe(true);
});

test("ne garde pas indéfiniment les clés expirées en mémoire", () => {
  const c = clock();
  const limiter = createRateLimiter(c.now);
  for (let i = 0; i < 500; i++) limiter.hit(`ip:10.0.0.${i}`, RULE);
  c.advance(RULE.windowMs + 1);
  limiter.hit("ip:11.0.0.1", RULE);
  expect(limiter.size()).toBe(1);
});
