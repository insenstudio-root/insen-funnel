import { describe, it, expect } from "vitest";
import { bookingHref } from "@/lib/config";

describe("bookingHref", () => {
  it("renvoie null si aucun lien Cal.com configuré", () => {
    expect(bookingHref("")).toBeNull();
  });
  it("construit l'URL Cal.com depuis le slug", () => {
    expect(bookingHref("insen/consultation")).toBe("https://cal.com/insen/consultation");
  });
});
