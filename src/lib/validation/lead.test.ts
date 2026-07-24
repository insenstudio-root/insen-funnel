import { describe, it, expect } from "vitest";
import { projectLeadSchema } from "@/lib/validation/lead";

const base = {
  full_name: "Amine K.",
  email: "amine@exemple.com",
  sector: "hotellerie",
  project_summary: "Reprendre la main sur nos réservations directes.",
  maturity: "idee",
  timeline: "ce_trimestre",
  consent: true,
} as const;

describe("projectLeadSchema", () => {
  it("accepte un payload projet valide (enums maquette)", () => {
    expect(projectLeadSchema.safeParse(base).success).toBe(true);
  });
  it("rejette un secteur hors maquette", () => {
    expect(projectLeadSchema.safeParse({ ...base, sector: "tourisme_hospitalite" }).success).toBe(false);
  });
  it("rejette une maturité inconnue", () => {
    expect(projectLeadSchema.safeParse({ ...base, maturity: "explore" }).success).toBe(false);
  });
  it("exige le consentement (true)", () => {
    const { consent, ...noConsent } = base;
    expect(projectLeadSchema.safeParse(noConsent).success).toBe(false);
  });
  it("rejette un honeypot rempli", () => {
    expect(projectLeadSchema.safeParse({ ...base, company_website: "http://spam" }).success).toBe(false);
  });
  it("accepte les métadonnées d'attribution optionnelles", () => {
    const r = projectLeadSchema.safeParse({ ...base, utm_source: "google", referral_source: "Recommandation" });
    expect(r.success).toBe(true);
  });
});
