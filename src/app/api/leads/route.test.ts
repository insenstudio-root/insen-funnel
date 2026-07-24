import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { LeadNotification } from "../../../lib/email/notify";

const { notifyInsen } = vi.hoisted(() => ({
  notifyInsen: vi.fn(async (_lead: LeadNotification) => ({ sent: true as const, id: "email_1" })),
}));
vi.mock("../../../lib/email/notify", () => ({ notifyInsen }));
vi.mock("../../../lib/supabase/admin", () => ({ getAdminClient: () => null }));

import { POST } from "./route";

const projet = {
  full_name: "Amine K.", email: "amine@exemple.com",
  sector: "hotellerie", project_summary: "Réservations directes.",
  maturity: "idee", timeline: "ce_trimestre", consent: true,
};

function req(body: unknown) {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => notifyInsen.mockClear());

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
