/**
 * Limiteur de débit à fenêtre fixe, en mémoire d'instance.
 *
 * ⚠️ Limite assumée : sur Vercel plusieurs instances peuvent servir en
 * parallèle, donc la fenêtre n'est pas étanche à 100 %. C'est suffisant pour du
 * spam opportuniste à faible volume, et ça évite d'ajouter une dépendance
 * (Redis, table Supabase) dans le chemin critique de réception d'un lead.
 * Si le volume grimpe, remplacer le store par une table Supabase à clé/fenêtre.
 */

export type RateLimitRule = { limit: number; windowMs: number };
export type RateLimitVerdict = { allowed: boolean; retryAfterMs: number };

type Entry = { count: number; windowStart: number };

/** On ne balaie pas à chaque appel : inutile, et O(n) sous rafale. */
const SWEEP_INTERVAL_MS = 60_000;

export function createRateLimiter(now: () => number = Date.now) {
  const entries = new Map<string, Entry>();
  let lastSweep = now();

  function sweep(at: number, windowMs: number) {
    for (const [key, entry] of entries) {
      if (at - entry.windowStart >= windowMs) entries.delete(key);
    }
    lastSweep = at;
  }

  return {
    hit(key: string, rule: RateLimitRule): RateLimitVerdict {
      const at = now();
      if (at - lastSweep >= SWEEP_INTERVAL_MS) sweep(at, rule.windowMs);

      const entry = entries.get(key);
      if (!entry || at - entry.windowStart >= rule.windowMs) {
        entries.set(key, { count: 1, windowStart: at });
        return { allowed: true, retryAfterMs: 0 };
      }
      if (entry.count < rule.limit) {
        entry.count++;
        return { allowed: true, retryAfterMs: 0 };
      }
      return { allowed: false, retryAfterMs: entry.windowStart + rule.windowMs - at };
    },
    size(): number {
      return entries.size;
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
