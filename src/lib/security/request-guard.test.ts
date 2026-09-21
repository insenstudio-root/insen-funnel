import { expect, test } from "vitest";
import { clientIp, filledHoneypots, isAllowedOrigin, isTooFast } from "./request-guard";

const ALLOWED = ["https://insenstudio.com", "https://www.insenstudio.com", "https://go.insenstudio.com"];

// --- Origine ---

test("accepte une origine de l'allowlist", () => {
  expect(isAllowedOrigin({ origin: "https://www.insenstudio.com", referer: null }, ALLOWED)).toBe(true);
});

test("refuse une origine étrangère", () => {
  expect(isAllowedOrigin({ origin: "https://evil.example", referer: null }, ALLOWED)).toBe(false);
});

test("retombe sur le Referer quand l'en-tête Origin manque", () => {
  expect(
    isAllowedOrigin({ origin: null, referer: "https://go.insenstudio.com/consultation?utm_source=x" }, ALLOWED)
  ).toBe(true);
});

test("refuse une requête sans Origin ni Referer", () => {
  expect(isAllowedOrigin({ origin: null, referer: null }, ALLOWED)).toBe(false);
});

test("refuse l'origine opaque d'une iframe sandboxée", () => {
  expect(isAllowedOrigin({ origin: "null", referer: null }, ALLOWED)).toBe(false);
});

test("ignore un Referer illisible au lieu de lever", () => {
  expect(isAllowedOrigin({ origin: null, referer: "pas-une-url" }, ALLOWED)).toBe(false);
});

test("accepte n'importe quel port local quand la tolérance dev est active", () => {
  expect(isAllowedOrigin({ origin: "http://localhost:3011", referer: null }, ALLOWED, { allowLocalhost: true })).toBe(true);
  expect(isAllowedOrigin({ origin: "http://127.0.0.1:4000", referer: null }, ALLOWED, { allowLocalhost: true })).toBe(true);
});

test("refuse le local quand la tolérance dev est éteinte", () => {
  expect(isAllowedOrigin({ origin: "http://localhost:3011", referer: null }, ALLOWED)).toBe(false);
});

test("ne se laisse pas berner par un domaine qui imite localhost", () => {
  expect(
    isAllowedOrigin({ origin: "https://localhost.evil.example", referer: null }, ALLOWED, { allowLocalhost: true })
  ).toBe(false);
});

// --- Honeypots ---

test("signale les leurres remplis", () => {
  const filled = filledHoneypots(
    { company_website: "http://spam.example", email_confirm: "  ", full_name: "Jean" },
    ["company_website", "email_confirm"]
  );
  expect(filled).toEqual(["company_website"]);
});

test("ne signale rien quand les leurres sont vides ou absents", () => {
  expect(filledHoneypots({ full_name: "Jean" }, ["company_website", "email_confirm"])).toEqual([]);
});

// --- Délai de remplissage ---

const NOW = Date.parse("2026-09-21T12:00:00.000Z");

test("signale une soumission plus rapide qu'un humain", () => {
  expect(isTooFast(new Date(NOW - 800).toISOString(), NOW, 2500)).toBe(true);
});

test("laisse passer une soumission au rythme humain", () => {
  expect(isTooFast(new Date(NOW - 30_000).toISOString(), NOW, 2500)).toBe(false);
});

test("accepte aussi un horodatage en millisecondes", () => {
  expect(isTooFast(NOW - 500, NOW, 2500)).toBe(true);
});

test("considère comme suspect un horodatage dans le futur", () => {
  expect(isTooFast(new Date(NOW + 60_000).toISOString(), NOW, 2500)).toBe(true);
});

test("ne conclut rien quand l'horodatage est absent ou illisible", () => {
  expect(isTooFast(undefined, NOW, 2500)).toBe(false);
  expect(isTooFast("hier", NOW, 2500)).toBe(false);
});

// --- IP client ---

test("prend la première adresse de la chaîne x-forwarded-for", () => {
  expect(clientIp({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" })).toBe("203.0.113.5");
});

test("retombe sur x-real-ip", () => {
  expect(clientIp({ "x-real-ip": "203.0.113.9" })).toBe("203.0.113.9");
});

test("renvoie une clé neutre quand aucune adresse n'est lisible", () => {
  expect(clientIp({})).toBe("unknown");
});
