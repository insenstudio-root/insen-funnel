/**
 * Heuristiques de contenu anti-spam (module pur, aucune dépendance runtime).
 *
 * Principe : un score, jamais un booléen unique. Un seul signal faible ne suffit
 * pas à rejeter un lead — il faut soit un signal fort, soit deux faibles. Un
 * faux positif ici coûte un vrai client, donc on préfère laisser passer du bruit
 * que refuser une demande légitime.
 */

export type AntibotSignal = "gibberish_name" | "gibberish_message" | "link_spam" | "bbcode";

export type ContentVerdict = { signals: AntibotSignal[]; score: number; spam: boolean };

/** Fort = suffit seul. Faible = doit être accompagné. */
const WEIGHTS: Record<AntibotSignal, number> = {
  gibberish_name: 2,
  bbcode: 2,
  link_spam: 1,
  gibberish_message: 1,
};
const SPAM_THRESHOLD = 2;

const URL_RE = /https?:\/\//gi;
const BBCODE_RE = /\[\/?(?:url|link|img|b|quote)\b/i;
const HTML_LINK_RE = /<a\s[^>]*href/i;

function countUrls(text: string): number {
  return text.match(URL_RE)?.length ?? 0;
}

/**
 * Un nom d'humain, même écrit sans espace, garde de longues suites de même
 * casse ("JeanPierreDupont" → J|ean|P|ierre|D|upont, 2,7 lettres par suite).
 * Une chaîne base62 aléatoire alterne bien plus vite ("fEthwyOYBgChBuJgUXHo"
 * → 1,4). On mesure cette longueur moyenne plutôt que la casse brute, pour ne
 * pas rejeter les noms en CamelCase.
 */
function isGibberishName(raw: string): boolean {
  const name = raw.trim();
  if (/\s/.test(name)) return false;
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters.length < 12) return false;
  if (!/[a-z]/.test(letters) || !/[A-Z]/.test(letters)) return false;

  let runs = 1;
  for (let i = 1; i < letters.length; i++) {
    const wasUpper = letters[i - 1] === letters[i - 1].toUpperCase();
    const isUpper = letters[i] === letters[i].toUpperCase();
    if (wasUpper !== isUpper) runs++;
  }
  return letters.length / runs < 2;
}

/**
 * Un message rédigé contient des espaces. Exception volontaire : un visiteur
 * pressé peut coller son URL seule, ce qui reste une demande légitime.
 */
function isGibberishMessage(raw: string, urlCount: number): boolean {
  const message = raw.trim();
  if (message.length < 20) return false;
  if (/\s/.test(message)) return false;
  if (urlCount === 1) return false;
  return true;
}

export function checkContent(input: { full_name: string; message?: string }): ContentVerdict {
  const signals: AntibotSignal[] = [];
  const message = input.message?.trim() ?? "";
  const urlCount = countUrls(message);

  if (isGibberishName(input.full_name)) signals.push("gibberish_name");
  if (message && (BBCODE_RE.test(message) || HTML_LINK_RE.test(message))) signals.push("bbcode");
  if (urlCount >= 3) signals.push("link_spam");
  if (message && isGibberishMessage(message, urlCount)) signals.push("gibberish_message");

  const score = signals.reduce((sum, s) => sum + WEIGHTS[s], 0);
  return { signals, score, spam: score >= SPAM_THRESHOLD };
}
