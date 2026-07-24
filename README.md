# insen-funnel — App de conversion INSEN (Next.js)

App de conversion du site INSEN : formulaire qualifiant, réservation du call (Cal.com), back-office leads. Couches **Logiques + Données** (Supabase), propriété INSEN. Premier composant réutilisable de la future stack client.

**Spec complète** : `../../../04-prd/PRD_site-insen-mvp_v1.0.md` (§4 architecture, §5 exécution).

## Stack
Next.js 14+ (App Router) · TypeScript strict · Tailwind · Supabase (Postgres + RLS + Auth) · Cal.com (embed + webhook) · Resend · Vercel. Paquets : **pnpm**.

## Setup
1. `pnpm install`
2. Copier `.env.example` → `.env.local` et renseigner (accès dans `_secrets/`).
3. Appliquer la migration Supabase : `supabase/migrations/0001_init.sql` (Supabase CLI ou éditeur SQL du dashboard).
4. `pnpm dev` → http://localhost:3000

## Routes (PRD §4.3)
| Route | Rôle |
|---|---|
| `/projet` | Formulaire qualifiant (5 champs qualif + coordonnées) |
| `/consultation` | Cadrage du call + embed Cal.com |
| `/merci` | Confirmation (variante selon provenance) |
| `POST /api/leads` | Zod → insert `leads` + `lead_events` → email Resend |
| `POST /api/webhooks/calcom` | Webhook **signé** → lead `call_reserve` |
| `/admin`, `/admin/leads/[id]` | Back-office (auth Supabase) |

## Règles (PRD §5.6 — non négociables)
- **Zéro insert BDD client-side** — toute écriture via routes API (service role).
- Validation **Zod** aux frontières · webhook Cal.com **signature vérifiée**.
- Tests : Vitest (validation, attribution) + 1 E2E Playwright (`/projet → /merci → lead`).

## Déploiement
Vercel (projet lié au repo) + env vars. Domaine `go.insenstudio.com`.

> `/projet`, `/merci` et `POST /api/leads` sont implémentés. Reste à faire (Sprint 2+) : `/consultation`, `POST /api/webhooks/calcom`, `/admin` + `/admin/leads/[id]`, et le middleware d'attribution first-touch (cf. TODO dans `src/lib/attribution.ts`). `0001_init.sql`, `.env.example` et `package.json` sont, eux, complets.
