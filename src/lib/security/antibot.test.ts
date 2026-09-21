import { expect, test } from "vitest";
import { checkContent } from "./antibot";

const CLEAN_MESSAGE = "Bonjour, je voudrais un devis pour mon site.";

// --- Noms en chaîne aléatoire : les trois cas observés en production ---

test.each(["fEthwyOYBgChBuJgUXHo", "uKaAfmpyWqlSROUfzX", "UPgHflQyxsCcbTfFeIK"])(
  "classe en spam le nom aléatoire %s",
  (full_name) => {
    const res = checkContent({ full_name, message: CLEAN_MESSAGE });
    expect(res.spam).toBe(true);
    expect(res.signals).toContain("gibberish_name");
  }
);

// --- Garde-fous : aucun de ces noms légitimes ne doit être signalé ---

test.each([
  "Mehdi Allahoum",
  "Jean-Pierre O'Brien",
  "JeanPierreDupont",
  "McDonald",
  "Anne-Sophie de La Rochefoucauld",
  "李伟",
  "محمد بن عبد الله",
  "Bui Thi Kim Chi",
  "PIERRE DURAND",
  "jean dupont",
])("laisse passer le nom légitime %s", (full_name) => {
  const res = checkContent({ full_name, message: CLEAN_MESSAGE });
  expect(res.signals).not.toContain("gibberish_name");
  expect(res.spam).toBe(false);
});

// --- Signaux sur le message ---

test("classe en spam un message truffé de balises BBCode", () => {
  const res = checkContent({
    full_name: "Jean Dupont",
    message: "Great offer [url=http://spam.example/deal]click here[/url] now",
  });
  expect(res.spam).toBe(true);
  expect(res.signals).toContain("bbcode");
});

test("classe en spam un message qui empile les liens et ne contient aucune espace", () => {
  const res = checkContent({
    full_name: "Jean Dupont",
    message: "http://a.example/1https://b.example/2http://c.example/3",
  });
  expect(res.spam).toBe(true);
  expect(res.signals).toEqual(expect.arrayContaining(["link_spam", "gibberish_message"]));
});

test("ne classe pas en spam un message qui cite trois liens mais reste rédigé", () => {
  const res = checkContent({
    full_name: "Jean Dupont",
    message:
      "Voici notre site https://restaurant-alger.example, notre page https://facebook.example/nous " +
      "et notre compte https://instagram.example/nous. Que pensez-vous de l'ensemble ?",
  });
  expect(res.signals).toContain("link_spam");
  expect(res.spam).toBe(false);
});

test("ne classe pas en spam un message réduit à une seule URL collée", () => {
  const res = checkContent({
    full_name: "Jean Dupont",
    message: "https://www.mon-restaurant-alger.example",
  });
  expect(res.signals).not.toContain("gibberish_message");
  expect(res.spam).toBe(false);
});

test("laisse passer une demande ordinaire", () => {
  const res = checkContent({
    full_name: "Mehdi Allahoum",
    message: "On a un site mais il ne ramène pas de clients. On aimerait en parler.",
  });
  expect(res.signals).toEqual([]);
  expect(res.spam).toBe(false);
});

test("tolère un message absent", () => {
  const res = checkContent({ full_name: "Mehdi Allahoum" });
  expect(res.spam).toBe(false);
});
