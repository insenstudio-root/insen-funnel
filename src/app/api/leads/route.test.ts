import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { LeadNotification } from "../../../lib/email/notify";

const { notifyInsen } = vi.hoisted(() => ({
  notifyInsen: vi.fn(async (_lead: LeadNotification) => ({ sent: true as const, id: "email_1" })),
}));
vi.mock("../../../lib/email/notify", () => ({ notifyInsen }));
vi.mock("../../../lib/supabase/admin", () => ({ getAdminClient: () => null }));

type Handler = (req: NextRequest) => Promise<Response>;
let POST: Handler;

/**
 * Le limiteur de débit est un singleton de module : on réinitialise les modules
 * entre chaque test pour qu'aucun quota ne fuite d'un test à l'autre.
 */
beforeEach(async () => {
  vi.resetModules();
  notifyInsen.mockClear();
  ({ POST } = (await import("./route")) as { POST: Handler });
});

const ORIGIN = "https://go.insenstudio.com";

const projet = {
  full_name: "Amine K.", email: "amine@exemple.com",
  sector: "hotellerie", project_summary: "Réservations directes.",
  maturity: "idee", timeline: "ce_trimestre", consent: true,
};

const contact = {
  source: "contact_vitrine", full_name: "Amine Kaci", email: "amine@exemple.com",
  message: "On aimerait parler de notre site.", consent: true,
};

function req(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/leads — projet", () => {
  it("accepte un projet valide et envoie l'email kind:projet", async () => {
    const res = await POST(req(projet));
    expect(res.status).toBe(200);
    expect(notifyInsen).toHaveBeenCalledOnce();
    expect(notifyInsen.mock.calls[0][0].kind).toBe("projet");
  });
  it("rejette un projet sans consentement (400) sans envoyer d'email", async () => {
    const { consent, ...bad } = projet;
    const res = await POST(req(bad));
    expect(res.status).toBe(400);
    expect(notifyInsen).not.toHaveBeenCalled();
  });
  it("avale le honeypot (200) sans envoyer d'email", async () => {
    const res = await POST(req({ ...projet, company_website: "http://spam" }));
    expect(res.status).toBe(200);
    expect(notifyInsen).not.toHaveBeenCalled();
  });
});

describe("POST /api/leads — couche anti-abus", () => {
  it("avale un POST direct sans Origin ni Referer", async () => {
    const r = new NextRequest("http://localhost/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(contact),
    });
    const res = await POST(r);
    expect(res.status).toBe(200);
    expect(notifyInsen).not.toHaveBeenCalled();
  });

  it("avale un POST venu d'une origine étrangère", async () => {
    const res = await POST(req(contact, { origin: "https://evil.example" }));
    expect(res.status).toBe(200);
    expect(notifyInsen).not.toHaveBeenCalled();
  });

  it("avale le second leurre insen_check", async () => {
    const res = await POST(req({ ...contact, insen_check: "bot@spam.example" }));
    expect(res.status).toBe(200);
    expect(notifyInsen).not.toHaveBeenCalled();
  });

  it("avale un nom en chaîne aléatoire du type observé en production", async () => {
    const res = await POST(req({ ...contact, full_name: "fEthwyOYBgChBuJgUXHo" }));
    expect(res.status).toBe(200);
    expect(notifyInsen).not.toHaveBeenCalled();
  });

  it("avale une soumission remplie plus vite qu'un humain", async () => {
    const res = await POST(req({ ...contact, form_rendered_at: new Date().toISOString() }));
    expect(res.status).toBe(200);
    expect(notifyInsen).not.toHaveBeenCalled();
  });

  it("laisse passer une soumission au rythme humain", async () => {
    const rendered = new Date(Date.now() - 40_000).toISOString();
    const res = await POST(req({ ...contact, form_rendered_at: rendered }));
    expect(res.status).toBe(200);
    expect(notifyInsen).toHaveBeenCalledOnce();
  });

  it("freine la 4e soumission d'une même IP", async () => {
    const ip = { "x-forwarded-for": "203.0.113.42" };
    for (let i = 0; i < 3; i++) {
      const ok = await POST(req({ ...contact, email: `client${i}@exemple.com` }, ip));
      expect(ok.status).toBe(200);
    }
    const res = await POST(req({ ...contact, email: "client9@exemple.com" }, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(notifyInsen).toHaveBeenCalledTimes(3);
  });
});
