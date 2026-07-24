import { describe, it, expect } from "vitest";
import { parseUtm } from "@/lib/attribution";

describe("parseUtm", () => {
  it("extrait les paramètres utm présents", () => {
    const u = parseUtm(new URLSearchParams("utm_source=google&utm_medium=cpc&x=1"));
    expect(u).toEqual({ utm_source: "google", utm_medium: "cpc" });
  });
  it("renvoie un objet vide si aucun utm", () => {
    expect(parseUtm(new URLSearchParams("a=b"))).toEqual({});
  });
});
