import { describe, it, expect } from "vitest";
import { classifyPayload, projetEmailFields, projetDbRow } from "@/lib/leads/projet";
import type { ProjectLead } from "@/lib/validation/lead";

const lead: ProjectLead = {
  full_name: "Amine K.", email: "amine@exemple.com", phone: "",
  sector: "hotellerie", project_summary: "Réservations directes.",
  maturity: "idee", timeline: "ce_trimestre", referral_source: "Recommandation",
  consent: true, consent_text: "…", consent_at: "2026-07-24T10:00:00.000Z",
  utm_source: "google", utm_medium: "cpc",
};

describe("classifyPayload", () => {
  it("détecte un payload projet (sector + project_summary)", () => {
    expect(classifyPayload({ sector: "hotellerie", project_summary: "x" })).toBe("projet");
  });
  it("détecte un payload contact (message)", () => {
    expect(classifyPayload({ message: "bonjour" })).toBe("contact");
  });
  it("renvoie unknown sinon", () => {
    expect(classifyPayload({ foo: 1 })).toBe("unknown");
  });
});

describe("projetEmailFields", () => {
  it("traduit les valeurs en libellés maquette", () => {
    const f = projetEmailFields(lead);
    expect(f.Secteur).toBe("Hôtellerie");
    expect(f.Maturité).toBe("Une idée à cadrer");
    expect(f.Échéance).toBe("Ce trimestre");
    expect(f.Provenance).toBe("Recommandation");
    expect(f.Campagne).toBe("google / cpc");
    expect(f.Consentement).toContain("oui");
  });
});

describe("projetDbRow", () => {
  it("mappe les colonnes leads + range la preuve RGPD dans notes", () => {
    const row = projetDbRow(lead);
    expect(row.sector).toBe("hotellerie");
    expect(row.project_summary).toBe("Réservations directes.");
    expect(row.channel).toBe("site");
    expect(row.phone).toBeNull();
    const notes = JSON.parse(row.notes as string);
    expect(notes.form).toBe("projet");
    expect(notes.consent).toBe(true);
  });
});
