# Funnel `/projet` + `/merci` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer les pages `/projet` (formulaire qualifiant) et `/merci` (confirmation, 2 variantes) de l'app funnel Next.js, câblées à `/api/leads` → email `contact@insenstudio.com`, testables sur un déploiement preview Vercel.

**Architecture :** App Next.js 14 App Router déjà scaffoldée (`05-chantiers/funnel-app/insen-funnel/`). Le formulaire client POST en **même origine** vers `/api/leads` (route déjà existante, à étendre pour discriminer `projet` vs `contact`). L'email Resend est le canal garanti ; l'insert Supabase est best-effort. Une source de vérité unique pour les enums maquette (`src/lib/leads/enums.ts`) alimente le schéma Zod, les mappers d'email/DB et le rendu du formulaire.

**Tech Stack :** Next.js 14, TypeScript strict, React 18, Zod, Resend, @supabase/supabase-js, **CSS simple (CSS Modules, pas de Tailwind)**, next/font (Fraunces + Instrument Sans), Vitest, Playwright, pnpm.

## Global Constraints

- **Package manager : pnpm.** Toutes les commandes via `pnpm`.
- **TypeScript strict** (déjà activé dans `tsconfig.json`). Alias `@/*` → `./src/*`.
- **Pas de Tailwind** dans le funnel v1 : CSS simple via CSS Modules + tokens dans `globals.css`. (Les devDeps Tailwind présentes restent inutilisées.)
- **Écritures BDD server-side uniquement** (service role via `getAdminClient`). Zéro insert client-side.
- **Validation Zod à toutes les frontières** (route API).
- **Honeypot = champ `company_website`** (nom imposé par le gate anti-bot déjà présent dans `route.ts`). Ne PAS utiliser `_hp`.
- **Noms de champs du payload = anglais, alignés colonnes DB** (`sector`, `project_summary`, `maturity`, `timeline`, `referral_source`, `full_name`). Voir « Note de réconciliation » ci-dessous.
- **Valeurs d'enum = ids maquette V2** : secteur `hotellerie|restauration|sante|commerce|marques|autre` ; maturité `idee|defini|reprendre` ; échéance `des_que_possible|ce_trimestre|cette_annee|pas_de_date`.
- **Copie verbatim de la maquette** (`projet-v2.dc.html` / `merci-v2.dc.html`) pour tous les textes visibles.
- **Garde-fous INSEN** : aucun tarif, aucune promesse chiffrée, pas de survente IA. `contact@insenstudio.com` seule adresse publique ; `mehdi.allahoum@` jamais exposée. Géo : Paris + Alger.
- **Domaine cible : `insenstudio.com`** (sans trait d'union). Funnel : `go.insenstudio.com`.
- **Aucune ressource externe créée par l'agent** (Supabase/Cal.com/Vercel/domaine) : on livre code + instructions, Mehdi exécute.

### Note de réconciliation (spec § 5.1 → plan)

Le spec décrivait les champs avec des noms français (`secteur`, `phrase`, `maturite`, `echeance`, `provenance`) pour identifier chaque contrôle de la maquette. Le plan **conserve les noms de champ anglais existants** (`sector`, `project_summary`, `maturity`, `timeline`, `referral_source`, `full_name`) car : (1) ce sont déjà les colonnes de `leads` dans `0001_init.sql` ; (2) le schéma `contactLeadSchema` et la route suivent déjà cette convention ; (3) le honeypot de la route est `company_website`. Seules les **valeurs d'enum** basculent sur les ids maquette. Les **libellés français** de la maquette sont rendus dans l'UI via `enums.ts`. C'est une amélioration ciblée qui suit les patterns existants et évite une couche de mapping FR→EN source de bugs.

---

## File Structure

**À créer :**
- `src/lib/leads/enums.ts` — source de vérité : valeurs + libellés maquette (secteurs, maturités, échéances, provenances).
- `src/lib/leads/projet.ts` — mappers purs : `classifyPayload`, `projetEmailFields`, `projetDbRow`.
- `src/lib/config.ts` — liens configurables : `SITE_URL`, `HOME_URL`, `bookingHref`.
- `src/components/funnel/FunnelHeader.tsx` + `FunnelHeader.module.css` — en-tête « nue » (logo + fermer).
- `src/components/forms/ProjectForm.module.css` — styles du formulaire.
- `src/app/(public)/projet/projet.module.css` + `src/app/(public)/merci/merci.module.css` — styles de page.
- `public/insen-lockup-black.png` — logo (copié depuis la vitrine).
- `vitest.config.ts`, `playwright.config.ts`.
- Tests : `src/lib/validation/lead.test.ts`, `src/lib/leads/projet.test.ts`, `src/lib/config.test.ts`, `src/lib/attribution.test.ts`, `src/app/api/leads/route.test.ts`, `e2e/projet.spec.ts`.
- `docs/SETUP-PREVIEW.md` — instructions Vercel/preview pour Mehdi.

**À modifier :**
- `src/lib/validation/lead.ts` — refonte `projectLeadSchema` (enums maquette + consent + UTM + honeypot).
- `src/lib/attribution.ts` — implémenter `parseUtm`.
- `src/app/api/leads/route.ts` — discrimination projet/contact + mappers projet + redirect `?src=form`.
- `supabase/migrations/0001_init.sql` — contraintes CHECK secteur/maturité/timeline.
- `src/app/layout.tsx` — polices next/font + variables CSS.
- `src/app/globals.css` — tokens INSEN.
- `src/components/forms/ProjectForm.tsx` — implémentation complète du formulaire.
- `src/app/(public)/projet/page.tsx`, `src/app/(public)/merci/page.tsx` — contenu maquette.
- `.env.example` — domaine insenstudio.com.
- Vitrine `05-chantiers/vitrine-squarespace/build.ps1` — `$FunnelBase` configurable + bascule domaine.

---

## Task 1 : Enums maquette + schéma Zod + migration

**Files:**
- Create: `src/lib/leads/enums.ts`
- Create: `vitest.config.ts`
- Modify: `src/lib/validation/lead.ts`
- Modify: `supabase/migrations/0001_init.sql`
- Test: `src/lib/validation/lead.test.ts`

**Interfaces:**
- Produces: `SECTEUR_VALUES`, `MATURITE_VALUES`, `ECHEANCE_VALUES` (tuples `readonly [string, ...string[]]`) ; `SECTEURS`, `MATURITES`, `ECHEANCES` (`{value,label,desc?}[]`) ; `PROVENANCES` (`string[]`) ; `SECTEUR_LABELS`, `MATURITE_LABELS`, `ECHEANCE_LABELS` (`Record<value,label>`). `projectLeadSchema` (Zod) + type `ProjectLead`.

- [ ] **Step 1 : Créer `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2 : Créer `src/lib/leads/enums.ts`**

```ts
/**
 * Source de vérité des enums du funnel /projet — ids + libellés repris mot pour
 * mot de la maquette V2 (projet-v2.dc.html). Consommé par : le schéma Zod
 * (valeurs), les mappers email/DB (value→label) et le formulaire (rendu).
 */
export const SECTEUR_VALUES = [
  "hotellerie", "restauration", "sante", "commerce", "marques", "autre",
] as const;
export const MATURITE_VALUES = ["idee", "defini", "reprendre"] as const;
export const ECHEANCE_VALUES = [
  "des_que_possible", "ce_trimestre", "cette_annee", "pas_de_date",
] as const;

export type Secteur = (typeof SECTEUR_VALUES)[number];
export type Maturite = (typeof MATURITE_VALUES)[number];
export type Echeance = (typeof ECHEANCE_VALUES)[number];

export const SECTEUR_LABELS: Record<Secteur, string> = {
  hotellerie: "Hôtellerie",
  restauration: "Restauration & lieux",
  sante: "Santé",
  commerce: "Commerce & services",
  marques: "Marques & entrepreneurs",
  autre: "Autre",
};
export const MATURITE_LABELS: Record<Maturite, string> = {
  idee: "Une idée à cadrer",
  defini: "Un projet défini, à lancer",
  reprendre: "Un système à reprendre",
};
export const MATURITE_DESC: Record<Maturite, string> = {
  idee: "Le projet reste à définir.",
  defini: "Le besoin est clair, reste à l'installer.",
  reprendre: "Ça existe, mais ça ne travaille pas.",
};
export const ECHEANCE_LABELS: Record<Echeance, string> = {
  des_que_possible: "Dès que possible",
  ce_trimestre: "Ce trimestre",
  cette_annee: "Cette année",
  pas_de_date: "Pas de date",
};

export const SECTEURS = SECTEUR_VALUES.map((v) => ({ value: v, label: SECTEUR_LABELS[v] }));
export const MATURITES = MATURITE_VALUES.map((v) => ({
  value: v, label: MATURITE_LABELS[v], desc: MATURITE_DESC[v],
}));
export const ECHEANCES = ECHEANCE_VALUES.map((v) => ({ value: v, label: ECHEANCE_LABELS[v] }));

export const PROVENANCES = [
  "Recherche Google", "Recommandation", "Réseaux sociaux", "Plaquette / print", "Autre",
] as const;
```

- [ ] **Step 3 : Écrire le test qui échoue — `src/lib/validation/lead.test.ts`**

```ts
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
```

- [ ] **Step 4 : Lancer le test — il échoue**

Run: `pnpm test src/lib/validation/lead.test.ts`
Expected: FAIL (secteur `hotellerie` rejeté par l'ancien enum ; pas de champ `consent`).

- [ ] **Step 5 : Refondre `projectLeadSchema` dans `src/lib/validation/lead.ts`**

Remplacer les blocs `sectorEnum`/`maturityEnum`/`timelineEnum` et `projectLeadSchema` par :

```ts
import { z } from "zod";
import { SECTEUR_VALUES, MATURITE_VALUES, ECHEANCE_VALUES } from "@/lib/leads/enums";

// Rétro-compat : ces exports pointent désormais sur les valeurs maquette.
export const sectorEnum = SECTEUR_VALUES;
export const maturityEnum = MATURITE_VALUES;
export const timelineEnum = ECHEANCE_VALUES;

/** Payload du formulaire public /projet (qualif maquette + consentement + attribution). */
export const projectLeadSchema = z.object({
  source: z.string().max(60).optional(),
  form_id: z.string().max(60).optional(),
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  sector: z.enum(SECTEUR_VALUES),
  project_summary: z.string().min(3).max(500),
  maturity: z.enum(MATURITE_VALUES),
  timeline: z.enum(ECHEANCE_VALUES),
  referral_source: z.string().max(200).optional().or(z.literal("")),
  // Consentement par soumission (mention affichée sous le bouton)
  consent: z.literal(true, { errorMap: () => ({ message: "consentement requis" }) }),
  consent_text: z.string().max(500).optional(),
  consent_at: z.string().max(40).optional(),
  // Honeypot anti-spam : DOIT rester vide
  company_website: z.string().max(0).optional().or(z.literal("")),
  // Attribution
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  landing_path: z.string().max(300).optional(),
  page_path: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
  locale: z.string().max(10).optional(),
});
export type ProjectLead = z.infer<typeof projectLeadSchema>;
```

Laisser `contactLeadSchema` et `attributionSchema` inchangés. Retirer l'ancien import `z` en double s'il en résulte (garder un seul `import { z } from "zod";` en tête de fichier).

- [ ] **Step 6 : Aligner les contraintes CHECK — `supabase/migrations/0001_init.sql`**

Remplacer les trois lignes de contrainte de la table `leads` :

```sql
  sector text check (sector in ('hotellerie','restauration','sante','commerce','marques','autre')),
  project_summary text,                -- "le projet en une phrase"
  maturity text check (maturity in ('idee','defini','reprendre')),
  timeline text check (timeline in ('des_que_possible','ce_trimestre','cette_annee','pas_de_date')),
```

- [ ] **Step 7 : Lancer le test — il passe**

Run: `pnpm test src/lib/validation/lead.test.ts`
Expected: PASS (6 tests verts).

- [ ] **Step 8 : Vérifier qu'aucun import cassé ne subsiste**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0 (les ré-exports `sectorEnum`/`maturityEnum`/`timelineEnum` couvrent les usages existants).

- [ ] **Step 9 : Commit**

```bash
git add src/lib/leads/enums.ts vitest.config.ts src/lib/validation/lead.ts supabase/migrations/0001_init.sql src/lib/validation/lead.test.ts
git commit -m "feat(funnel): enums maquette V2 + refonte projectLeadSchema (consent, UTM, honeypot)"
```

---

## Task 2 : Mappers projet (purs, testables)

**Files:**
- Create: `src/lib/leads/projet.ts`
- Test: `src/lib/leads/projet.test.ts`

**Interfaces:**
- Consumes: `ProjectLead` (Task 1), labels de `enums.ts`.
- Produces:
  - `classifyPayload(data: Record<string, unknown>): "projet" | "contact" | "unknown"`
  - `projetEmailFields(lead: ProjectLead): Record<string, string | undefined>`
  - `projetDbRow(lead: ProjectLead): Record<string, unknown>`

- [ ] **Step 1 : Écrire le test qui échoue — `src/lib/leads/projet.test.ts`**

```ts
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
```

- [ ] **Step 2 : Lancer le test — il échoue**

Run: `pnpm test src/lib/leads/projet.test.ts`
Expected: FAIL ("classifyPayload is not a function").

- [ ] **Step 3 : Implémenter `src/lib/leads/projet.ts`**

```ts
/**
 * Mappers purs pour le lead /projet : classification, champs d'email lisibles,
 * ligne d'insert `leads`. Aucune dépendance runtime (testable en isolation).
 */
import type { ProjectLead } from "@/lib/validation/lead";
import { SECTEUR_LABELS, MATURITE_LABELS, ECHEANCE_LABELS } from "@/lib/leads/enums";
import type { Secteur, Maturite, Echeance } from "@/lib/leads/enums";

export function classifyPayload(data: Record<string, unknown>): "projet" | "contact" | "unknown" {
  if (typeof data.sector === "string" && typeof data.project_summary === "string") return "projet";
  if (typeof data.message === "string") return "contact";
  return "unknown";
}

export function projetEmailFields(lead: ProjectLead): Record<string, string | undefined> {
  const campagne = [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ");
  return {
    Secteur: SECTEUR_LABELS[lead.sector as Secteur],
    Maturité: MATURITE_LABELS[lead.maturity as Maturite],
    Échéance: ECHEANCE_LABELS[lead.timeline as Echeance],
    Provenance: lead.referral_source || undefined,
    Page: lead.page_path || lead.landing_path || undefined,
    Campagne: campagne || undefined,
    Consentement: lead.consent
      ? `oui (${lead.consent_at || "date non fournie"})`
      : "non",
  };
}

export function projetDbRow(lead: ProjectLead): Record<string, unknown> {
  return {
    full_name: lead.full_name,
    email: lead.email,
    phone: lead.phone || null,
    sector: lead.sector,
    project_summary: lead.project_summary,
    maturity: lead.maturity,
    timeline: lead.timeline,
    referral_source: lead.referral_source || null,
    utm_source: lead.utm_source || null,
    utm_medium: lead.utm_medium || null,
    utm_campaign: lead.utm_campaign || null,
    utm_content: lead.utm_content || null,
    landing_path: lead.landing_path || null,
    referrer: lead.referrer || null,
    channel: "site",
    notes: JSON.stringify({
      form: "projet",
      source: lead.source,
      consent: lead.consent,
      consent_text: lead.consent_text,
      consent_at: lead.consent_at,
      utm_term: lead.utm_term,
      page_path: lead.page_path,
      locale: lead.locale,
    }),
  };
}
```

- [ ] **Step 4 : Lancer le test — il passe**

Run: `pnpm test src/lib/leads/projet.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/leads/projet.ts src/lib/leads/projet.test.ts
git commit -m "feat(funnel): mappers purs projet (classify, email fields, db row)"
```

---

## Task 3 : Route `/api/leads` — discrimination projet/contact

**Files:**
- Modify: `src/app/api/leads/route.ts`
- Test: `src/app/api/leads/route.test.ts`

**Interfaces:**
- Consumes: `projectLeadSchema` (Task 1), `classifyPayload`/`projetEmailFields`/`projetDbRow` (Task 2), `notifyInsen`, `getAdminClient` (existants).
- Produces: comportement HTTP — `POST` accepte projet ET contact. Projet valide → email `kind:"projet"` + insert best-effort → 200 `{ok:true}` (fetch) ou 303 `/merci?src=form` (form sans JS).

- [ ] **Step 1 : Écrire le test qui échoue — `src/app/api/leads/route.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const notifyInsen = vi.fn(async () => ({ sent: true as const, id: "email_1" }));
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
```

- [ ] **Step 2 : Lancer le test — il échoue**

Run: `pnpm test src/app/api/leads/route.test.ts`
Expected: FAIL (la route ne route pas encore le payload projet → validation contact 400 sur le cas valide).

- [ ] **Step 3 : Étendre `src/app/api/leads/route.ts`**

Ajouter les imports en tête (à côté des imports existants) :

```ts
import { contactLeadSchema, projectLeadSchema } from "../../../lib/validation/lead";
import { classifyPayload, projetEmailFields, projetDbRow } from "../../../lib/leads/projet";
```

Après le bloc honeypot (`// --- 2. Honeypot ...`) et AVANT la validation contact, insérer la branche projet, puis garder la branche contact existante :

```ts
  // --- 3. Aiguillage projet vs contact ---
  const kind = classifyPayload(data);

  if (kind === "projet") {
    const parsed = projectLeadSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "validation", issues: parsed.error.flatten().fieldErrors },
        { status: 400, headers: cors }
      );
    }
    const lead = parsed.data;

    const emailRes = await notifyInsen({
      kind: "projet",
      full_name: lead.full_name,
      email: lead.email,
      phone: lead.phone || undefined,
      message: lead.project_summary,
      fields: projetEmailFields(lead),
    }).catch((e) => {
      console.error("[leads] notifyInsen (projet) a levé :", e);
      return { sent: false as const, reason: "throw" };
    });

    let dbOk = false;
    const db = getAdminClient();
    if (db) {
      const { error } = await db.from("leads").insert(projetDbRow(lead));
      if (error) console.error("[leads] insert projet a échoué :", error.message);
      else dbOk = true;
    }

    if (!emailRes.sent && !dbOk) {
      return NextResponse.json({ ok: false, error: "delivery" }, { status: 502, headers: cors });
    }
    return isFormPost && !wantsJson
      ? redirectMerci(cors)
      : NextResponse.json({ ok: true }, { headers: cors });
  }
```

Renuméroter les commentaires suivants si besoin (la branche contact devient l'`else`). La validation contact existante reste : elle s'exécute quand `kind !== "projet"`.

Mettre à jour `redirectMerci` pour la cohérence de variante `/merci` :

```ts
function redirectMerci(cors: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://go.insenstudio.com";
  return NextResponse.redirect(`${base}/merci?src=form`, { status: 303, headers: cors });
}
```

- [ ] **Step 4 : Lancer le test — il passe**

Run: `pnpm test src/app/api/leads/route.test.ts`
Expected: PASS (3 tests). Puis `pnpm exec tsc --noEmit` → exit 0.

- [ ] **Step 5 : Commit**

```bash
git add src/app/api/leads/route.ts src/app/api/leads/route.test.ts
git commit -m "feat(funnel): /api/leads discrimine projet vs contact + redirect merci?src=form"
```

---

## Task 4 : Utilitaires client — config + attribution

**Files:**
- Create: `src/lib/config.ts`
- Modify: `src/lib/attribution.ts`
- Test: `src/lib/config.test.ts`, `src/lib/attribution.test.ts`

**Interfaces:**
- Produces:
  - `SITE_URL: string`, `HOME_URL: string`, `bookingHref(link?: string): string | null`
  - `parseUtm(search: URLSearchParams): { utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content? }`

- [ ] **Step 1 : Écrire les tests qui échouent**

`src/lib/config.test.ts` :

```ts
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
```

`src/lib/attribution.test.ts` :

```ts
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
```

- [ ] **Step 2 : Lancer — échec**

Run: `pnpm test src/lib/config.test.ts src/lib/attribution.test.ts`
Expected: FAIL (`bookingHref`/`parseUtm` introuvables).

- [ ] **Step 3 : Créer `src/lib/config.ts`**

```ts
/**
 * Liens configurables du funnel. Valeurs surchargées par l'env en preview/prod.
 * Le lien Cal.com reste un placeholder tant que le compte n'existe pas (D2 spec).
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://go.insenstudio.com";
export const HOME_URL = process.env.NEXT_PUBLIC_HOME_URL || "https://insenstudio.com";

/** URL de réservation Cal.com, ou null si non configurée (on masque alors le CTA). */
export function bookingHref(link: string = process.env.NEXT_PUBLIC_CALCOM_LINK || ""): string | null {
  return link ? `https://cal.com/${link}` : null;
}
```

- [ ] **Step 4 : Implémenter `parseUtm` dans `src/lib/attribution.ts`**

Ajouter après les constantes existantes (`FIRST_TOUCH_COOKIE`, `FIRST_TOUCH_MAX_AGE`), et supprimer la ligne `export {};` finale :

```ts
export type Utm = {
  utm_source?: string; utm_medium?: string; utm_campaign?: string;
  utm_term?: string; utm_content?: string;
};

const UTM_KEYS: (keyof Utm)[] = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
];

/** Extrait les paramètres UTM présents dans une query string. */
export function parseUtm(search: URLSearchParams): Utm {
  const out: Utm = {};
  for (const k of UTM_KEYS) {
    const v = search.get(k);
    if (v) out[k] = v;
  }
  return out;
}
```

- [ ] **Step 5 : Lancer — succès**

Run: `pnpm test src/lib/config.test.ts src/lib/attribution.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6 : Commit**

```bash
git add src/lib/config.ts src/lib/attribution.ts src/lib/config.test.ts src/lib/attribution.test.ts
git commit -m "feat(funnel): config liens (site/home/cal.com) + parseUtm attribution"
```

---

## Task 5 : Fondation visuelle — tokens INSEN + polices + logo

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `public/insen-lockup-black.png`

**Interfaces:**
- Produces: variables CSS `--color-*`, `--font-fraunces`, `--font-instrument` disponibles globalement ; logo servi sur `/insen-lockup-black.png`.

- [ ] **Step 1 : Copier le logo dans `public/`**

```bash
mkdir -p public
cp "../../vitrine-squarespace/assets/logo/insen-lockup-black.png" public/insen-lockup-black.png
```

(Chemin depuis `05-chantiers/funnel-app/insen-funnel/` vers `05-chantiers/vitrine-squarespace/assets/logo/`. Vérifier la présence : `ls public/insen-lockup-black.png`.)

- [ ] **Step 2 : Réécrire `src/app/globals.css`**

```css
/* Tokens design system INSEN — funnel (repris de la maquette V2 / _ds tokens). */
:root {
  --color-paper: #FBFAF7;
  --color-ink: #131312;
  --color-ink-2: #46443F;
  --color-ink-hover: #000000;
  --color-graphite: #5E5C57;
  --color-cobalt: #1345B1;
  --color-line: #E5E2DA;
  --color-line-2: #C9C5BC;
  --font-serif: var(--font-fraunces), Georgia, serif;
  --font-sans: var(--font-instrument), system-ui, -apple-system, "Segoe UI", sans-serif;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; }

:focus-visible {
  outline: 2px solid var(--color-cobalt);
  outline-offset: 2px;
}
```

- [ ] **Step 3 : Câbler les polices dans `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"], weight: ["400", "500"], variable: "--font-fraunces", display: "swap",
});
const instrument = Instrument_Sans({
  subsets: ["latin"], weight: ["400", "500"], variable: "--font-instrument", display: "swap",
});

export const metadata: Metadata = {
  title: "INSEN Studio",
  description: "Parlons de votre projet.",
  robots: { index: false, follow: false }, // funnel de conversion, hors index
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4 : Vérifier le build**

Run: `pnpm build`
Expected: exit 0 ; les polices se téléchargent au build (next/font). Aucune erreur CSS.

- [ ] **Step 5 : Commit**

```bash
git add src/app/globals.css src/app/layout.tsx public/insen-lockup-black.png
git commit -m "feat(funnel): tokens INSEN + polices Fraunces/Instrument Sans + logo"
```

---

## Task 6 : Composant `FunnelHeader`

**Files:**
- Create: `src/components/funnel/FunnelHeader.tsx`
- Create: `src/components/funnel/FunnelHeader.module.css`

**Interfaces:**
- Consumes: `HOME_URL` (Task 4), logo `/insen-lockup-black.png` (Task 5).
- Produces: `<FunnelHeader />` — en-tête « nue » (logo à gauche → accueil vitrine, bouton fermer à droite → accueil vitrine).

- [ ] **Step 1 : Créer `src/components/funnel/FunnelHeader.tsx`**

```tsx
import { HOME_URL } from "@/lib/config";
import styles from "./FunnelHeader.module.css";

export function FunnelHeader() {
  return (
    <header className={styles.header}>
      <a href={HOME_URL} aria-label="insen studio — accueil" className={styles.logo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/insen-lockup-black.png" alt="insen studio" className={styles.logoImg} />
      </a>
      <a href={HOME_URL} aria-label="Fermer et revenir au site" className={styles.close}>
        <span aria-hidden="true">✕</span>
      </a>
    </header>
  );
}
```

- [ ] **Step 2 : Créer `src/components/funnel/FunnelHeader.module.css`**

```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 24px 0;
}
.logo { display: flex; align-items: center; text-decoration: none; }
.logoImg { height: 30px; display: block; }
.close {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-ink); text-decoration: none;
  font-size: 18px; line-height: 1;
  transition: opacity 160ms var(--ease);
}
.close:hover { opacity: 0.6; }
```

- [ ] **Step 3 : Vérifier le typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4 : Commit**

```bash
git add src/components/funnel/FunnelHeader.tsx src/components/funnel/FunnelHeader.module.css
git commit -m "feat(funnel): composant FunnelHeader (logo + fermer)"
```

---

## Task 7 : `ProjectForm` — formulaire qualifiant

**Files:**
- Modify: `src/components/forms/ProjectForm.tsx`
- Create: `src/components/forms/ProjectForm.module.css`

**Interfaces:**
- Consumes: `SECTEURS`, `MATURITES`, `ECHEANCES`, `PROVENANCES` (Task 1), `parseUtm` (Task 4).
- Produces: `<ProjectForm />` — POST `/api/leads` (même origine) → redirection `/merci?src=form`.

- [ ] **Step 1 : Réécrire `src/components/forms/ProjectForm.tsx`**

```tsx
"use client";
/**
 * ProjectForm — /projet (maquette projet-v2). Secteur (6 tuiles) · projet en une
 * phrase · maturité (3 tuiles) · échéance (4 chips) · provenance (select) ·
 * nom/email/tél · honeypot company_website · consentement par soumission.
 * POST /api/leads (même origine) → /merci?src=form.
 */
import { useRef, useState } from "react";
import { SECTEURS, MATURITES, ECHEANCES, PROVENANCES } from "@/lib/leads/enums";
import { parseUtm } from "@/lib/attribution";
import styles from "./ProjectForm.module.css";

const CONSENT_TEXT =
  "En envoyant votre demande, vous acceptez que nous traitions ces informations pour vous recontacter.";

type FieldKey = "sector" | "project_summary" | "maturity" | "timeline" | "full_name" | "email";
type Errors = Partial<Record<FieldKey, string>>;

export function ProjectForm() {
  const [sector, setSector] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [maturity, setMaturity] = useState("");
  const [timeline, setTimeline] = useState("");
  const [referral, setReferral] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);

  function validate(): Errors {
    const e: Errors = {};
    if (!sector) e.sector = "Choisissez un secteur.";
    if (projectSummary.trim().length < 3) e.project_summary = "Décrivez votre projet en une phrase.";
    if (!maturity) e.maturity = "Où en êtes-vous ?";
    if (!timeline) e.timeline = "Choisissez une échéance.";
    if (fullName.trim().length < 2) e.full_name = "Votre nom.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Email invalide.";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setServerError("");

    const url = new URL(window.location.href);
    const payload = {
      source: "projet_funnel",
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      sector,
      project_summary: projectSummary.trim(),
      maturity,
      timeline,
      referral_source: referral,
      consent: true,
      consent_text: CONSENT_TEXT,
      consent_at: new Date().toISOString(),
      company_website: honeypot.current?.value || "",
      ...parseUtm(url.searchParams),
      landing_path: url.pathname,
      page_path: url.pathname,
      referrer: document.referrer || undefined,
      locale: "fr",
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("delivery");
      window.location.assign("/merci?src=form");
    } catch {
      setSending(false);
      setServerError("Envoi impossible pour le moment. Réessayez ou écrivez à contact@insenstudio.com.");
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {/* Secteur */}
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Votre secteur</legend>
        <div className={styles.tiles}>
          {SECTEURS.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-label={s.label}
              aria-pressed={sector === s.value}
              className={`${styles.tile} ${sector === s.value ? styles.tileOn : ""}`}
              onClick={() => setSector(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {errors.sector && <p className={styles.error}>{errors.sector}</p>}
      </fieldset>

      {/* Projet en une phrase */}
      <div className={styles.group}>
        <label htmlFor="project_summary" className={styles.label}>Votre projet en une phrase</label>
        <textarea
          id="project_summary"
          className={styles.textarea}
          placeholder="Ex. : reprendre la main sur nos réservations directes."
          value={projectSummary}
          onChange={(e) => setProjectSummary(e.target.value)}
          rows={2}
        />
        {errors.project_summary && <p className={styles.error}>{errors.project_summary}</p>}
      </div>

      {/* Maturité */}
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Où en êtes-vous ?</legend>
        <div className={styles.tilesCol}>
          {MATURITES.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-label={m.label}
              aria-pressed={maturity === m.value}
              className={`${styles.tileWide} ${maturity === m.value ? styles.tileOn : ""}`}
              onClick={() => setMaturity(m.value)}
            >
              <span className={styles.tileTitle}>{m.label}</span>
              <span className={styles.tileDesc}>{m.desc}</span>
            </button>
          ))}
        </div>
        {errors.maturity && <p className={styles.error}>{errors.maturity}</p>}
      </fieldset>

      {/* Échéance */}
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Échéance</legend>
        <div className={styles.chips}>
          {ECHEANCES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={c.label}
              aria-pressed={timeline === c.value}
              className={`${styles.chip} ${timeline === c.value ? styles.chipOn : ""}`}
              onClick={() => setTimeline(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {errors.timeline && <p className={styles.error}>{errors.timeline}</p>}
      </fieldset>

      {/* Provenance (optionnel) */}
      <div className={styles.group}>
        <label htmlFor="referral" className={styles.label}>
          Comment nous avez-vous connu ? <span className={styles.optional}>(optionnel)</span>
        </label>
        <select
          id="referral"
          className={styles.select}
          value={referral}
          onChange={(e) => setReferral(e.target.value)}
        >
          <option value="">Choisir…</option>
          {PROVENANCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Identité */}
      <div className={styles.group}>
        <label htmlFor="full_name" className={styles.label}>Votre nom</label>
        <input
          id="full_name" className={styles.input} placeholder="Nom et prénom"
          value={fullName} onChange={(e) => setFullName(e.target.value)}
        />
        {errors.full_name && <p className={styles.error}>{errors.full_name}</p>}
      </div>
      <div className={styles.group}>
        <label htmlFor="email" className={styles.label}>Email</label>
        <input
          id="email" type="email" className={styles.input} placeholder="vous@entreprise.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        {errors.email && <p className={styles.error}>{errors.email}</p>}
      </div>
      <div className={styles.group}>
        <label htmlFor="phone" className={styles.label}>
          Téléphone <span className={styles.optional}>(optionnel)</span>
        </label>
        <input
          id="phone" type="tel" className={styles.input} placeholder="+213 …"
          value={phone} onChange={(e) => setPhone(e.target.value)}
        />
        <p className={styles.hint}>Utile pour un rappel rapide.</p>
      </div>

      {/* Honeypot anti-bot — caché aux humains */}
      <div aria-hidden="true" className={styles.honeypot}>
        <label htmlFor="company_website">Ne pas remplir</label>
        <input id="company_website" ref={honeypot} tabIndex={-1} autoComplete="off" />
      </div>

      {serverError && <p className={styles.serverError} role="alert">{serverError}</p>}

      <button type="submit" className={styles.submit} disabled={sending}>
        <span>{sending ? "Envoi en cours…" : "Envoyer la demande"}</span>
        <span aria-hidden="true">→</span>
      </button>

      <p className={styles.consent}>
        {CONSENT_TEXT}{" "}
        <a href="/confidentialite">Politique de confidentialité</a>.
      </p>
    </form>
  );
}
```

- [ ] **Step 2 : Créer `src/components/forms/ProjectForm.module.css`**

```css
.form { display: flex; flex-direction: column; gap: 28px; max-width: 560px; }
.group { display: flex; flex-direction: column; gap: 10px; border: 0; margin: 0; padding: 0; }
.legend, .label {
  font: 500 13px/1.3 var(--font-sans);
  letter-spacing: 0.01em; color: var(--color-ink); padding: 0;
}
.optional { color: var(--color-graphite); font-weight: 400; }

.tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.tilesCol { display: flex; flex-direction: column; gap: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }

.tile, .tileWide, .chip {
  font: 500 14px/1.3 var(--font-sans);
  color: var(--color-ink); background: transparent;
  border: 1px solid var(--color-line); border-radius: 2px;
  cursor: pointer; text-align: left;
  transition: border-color 160ms var(--ease), background-color 160ms var(--ease);
}
.tile { padding: 14px 14px; }
.chip { padding: 10px 16px; }
.tileWide { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; }
.tileTitle { font-weight: 500; }
.tileDesc { font: 400 12.5px/1.4 var(--font-sans); color: var(--color-graphite); }

.tile:hover, .tileWide:hover, .chip:hover { border-color: var(--color-graphite); }
.tileOn, .chipOn { border-color: var(--color-ink); background: var(--color-ink); color: var(--color-paper); }
.tileOn .tileDesc { color: rgba(251, 250, 247, 0.7); }

.input, .textarea, .select {
  font: 400 15px/1.5 var(--font-sans);
  color: var(--color-ink); background: #fff;
  border: 1px solid var(--color-line); border-radius: 2px;
  padding: 12px 14px; width: 100%;
}
.textarea { resize: vertical; min-height: 64px; }
.input:focus, .textarea:focus, .select:focus { border-color: var(--color-cobalt); outline: none; }
.hint { font: 400 12.5px/1.4 var(--font-sans); color: var(--color-graphite); margin: 0; }

.error { font: 500 12.5px/1.4 var(--font-sans); color: #B42318; margin: 0; }
.serverError {
  font: 500 13.5px/1.5 var(--font-sans); color: #B42318;
  background: #FEF3F2; border: 1px solid #FDA29B; border-radius: 2px; padding: 12px 14px; margin: 0;
}

.honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }

.submit {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  height: 52px; padding: 0 24px;
  background: var(--color-ink); color: var(--color-paper);
  font: 500 15px/1 var(--font-sans); border: 0; border-radius: 2px; cursor: pointer;
  transition: background-color 160ms var(--ease);
}
.submit:hover:not(:disabled) { background: var(--color-ink-hover); }
.submit:disabled { opacity: 0.6; cursor: default; }

.consent { font: 400 12.5px/1.5 var(--font-sans); color: var(--color-graphite); margin: 0; max-width: 460px; }
.consent a { color: var(--color-ink); text-decoration: underline; }
```

- [ ] **Step 3 : Vérifier le typecheck + build**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: exit 0.

- [ ] **Step 4 : Commit**

```bash
git add src/components/forms/ProjectForm.tsx src/components/forms/ProjectForm.module.css
git commit -m "feat(funnel): ProjectForm (tuiles secteur/maturité, chips échéance, honeypot, consentement)"
```

---

## Task 8 : Page `/projet`

**Files:**
- Modify: `src/app/(public)/projet/page.tsx`
- Create: `src/app/(public)/projet/projet.module.css`

**Interfaces:**
- Consumes: `<FunnelHeader />` (Task 6), `<ProjectForm />` (Task 7).

- [ ] **Step 1 : Réécrire `src/app/(public)/projet/page.tsx`**

```tsx
/**
 * /projet — formulaire qualifiant (maquette projet-v2). Page « nue » :
 * en-tête minimal, H1 « Parlons de votre projet. », <ProjectForm />.
 */
import type { Metadata } from "next";
import { FunnelHeader } from "@/components/funnel/FunnelHeader";
import { ProjectForm } from "@/components/forms/ProjectForm";
import styles from "./projet.module.css";

export const metadata: Metadata = { title: "Parlons de votre projet — INSEN Studio" };

export default function ProjetPage() {
  return (
    <div className={styles.page}>
      <FunnelHeader />
      <main className={styles.main}>
        <p className={styles.eyebrow}>
          <span className={styles.dot} aria-hidden="true" />
          VOTRE PROJET
        </p>
        <h1 className={styles.title}>Parlons de votre projet.</h1>
        <p className={styles.intro}>
          Quelques éléments pour préparer notre échange. On lit chaque demande avec attention.
        </p>
        <ProjectForm />
      </main>
    </div>
  );
}
```

- [ ] **Step 2 : Créer `src/app/(public)/projet/projet.module.css`**

```css
.page { min-height: 100vh; display: flex; flex-direction: column; }
.main {
  width: 100%; max-width: 960px; margin: 0 auto;
  padding: 40px 24px 88px;
}
.eyebrow {
  display: flex; align-items: center; gap: 8px;
  font: 500 10.5px/1 var(--font-sans); letter-spacing: 0.08em;
  color: var(--color-graphite); margin: 0 0 20px;
}
.dot { width: 7px; height: 7px; background: var(--color-cobalt); display: inline-block; }
.title {
  font: 500 clamp(36px, 5vw, 52px)/1.05 var(--font-serif);
  letter-spacing: -0.02em; color: var(--color-ink); margin: 0; max-width: 460px;
}
.intro {
  font: 400 16px/1.6 var(--font-sans); color: var(--color-ink-2);
  margin: 16px 0 36px; max-width: 460px;
}
```

- [ ] **Step 3 : Vérifier en local**

Run: `pnpm dev` puis ouvrir `http://localhost:3000/projet`
Expected: en-tête + titre + formulaire complet s'affichent, tuiles/chips cliquables (état sélectionné visible), polices Fraunces/Instrument actives.

- [ ] **Step 4 : Commit**

```bash
git add "src/app/(public)/projet/page.tsx" "src/app/(public)/projet/projet.module.css"
git commit -m "feat(funnel): page /projet (en-tête nue + H1 maquette + ProjectForm)"
```

---

## Task 9 : Page `/merci` (2 variantes)

**Files:**
- Modify: `src/app/(public)/merci/page.tsx`
- Create: `src/app/(public)/merci/merci.module.css`

**Interfaces:**
- Consumes: `<FunnelHeader />` (Task 6), `bookingHref` (Task 4). Lit `searchParams.src` (`form` | `booking`).

- [ ] **Step 1 : Réécrire `src/app/(public)/merci/page.tsx`**

```tsx
/**
 * /merci — confirmation (maquette merci-v2). Deux variantes selon ?src :
 * `form` (défaut, demande envoyée) et `booking` (créneau confirmé).
 */
import type { Metadata } from "next";
import { FunnelHeader } from "@/components/funnel/FunnelHeader";
import { HOME_URL, bookingHref } from "@/lib/config";
import styles from "./merci.module.css";

export const metadata: Metadata = { title: "Merci — INSEN Studio" };

const CONTENT = {
  form: {
    eyebrow: "DEMANDE ENVOYÉE",
    intro: "Votre demande est bien arrivée. On la lit avec attention et on revient vers vous personnellement.",
    etapes: [
      { num: "01", t: "On lit votre demande — chaque mot." },
      { num: "02", t: "On vous répond personnellement." },
      { num: "03", t: "Un appel, si c'est pertinent." },
    ],
    showBooking: true,
  },
  booking: {
    eyebrow: "CRÉNEAU CONFIRMÉ",
    intro: "C'est noté. L'invitation arrive par email, avec le lien de la visioconférence.",
    etapes: [
      { num: "01", t: "Vous recevez l'invitation par email." },
      { num: "02", t: "On prépare une première lecture de votre situation." },
      { num: "03", t: "Trente minutes en visio — une lecture claire." },
    ],
    showBooking: false,
  },
} as const;

export default function MerciPage({ searchParams }: { searchParams: { src?: string } }) {
  const variant = searchParams.src === "booking" ? "booking" : "form";
  const c = CONTENT[variant];
  const booking = bookingHref();

  return (
    <div className={styles.page}>
      <FunnelHeader />
      <main className={styles.main}>
        <p className={styles.eyebrow}>
          <span className={styles.dot} aria-hidden="true" />
          {c.eyebrow}
        </p>
        <h1 className={styles.title}>Merci.</h1>
        <p className={styles.intro}>{c.intro}</p>

        <ol className={styles.steps}>
          {c.etapes.map((s) => (
            <li key={s.num} className={styles.step}>
              <span className={styles.num}>{s.num}</span>
              <span className={styles.stepText}>{s.t}</span>
            </li>
          ))}
        </ol>

        {c.showBooking && booking && (
          <a href={booking} className={styles.secondary}>
            <span>Réserver directement un créneau</span>
            <span aria-hidden="true">→</span>
          </a>
        )}

        <a href={HOME_URL} className={styles.primary}>
          <span className={styles.primaryDot} aria-hidden="true" />
          <span>Retour à l'accueil</span>
        </a>
      </main>
    </div>
  );
}
```

- [ ] **Step 2 : Créer `src/app/(public)/merci/merci.module.css`**

```css
.page { min-height: 100vh; display: flex; flex-direction: column; }
.main { width: 100%; max-width: 720px; margin: 0 auto; padding: 56px 24px 88px; }
.eyebrow {
  display: flex; align-items: center; gap: 8px;
  font: 500 10.5px/1 var(--font-sans); letter-spacing: 0.08em; color: var(--color-graphite); margin: 0;
}
.dot { width: 7px; height: 7px; background: var(--color-cobalt); display: inline-block; }
.title { font: 500 clamp(52px, 8vw, 88px)/0.98 var(--font-serif); letter-spacing: -0.025em; margin: 20px 0 0; }
.intro { font: 400 17px/1.6 var(--font-sans); color: var(--color-ink-2); margin: 20px 0 0; max-width: 480px; }

.steps { list-style: none; padding: 0; margin: 36px 0 0; border-bottom: 1px solid var(--color-line); }
.step { display: flex; gap: 14px; align-items: baseline; padding: 15px 0; border-top: 1px solid var(--color-line); }
.num { font: 500 11px/1 var(--font-sans); color: var(--color-line-2); }
.stepText { font: 400 15px/1.5 var(--font-sans); color: var(--color-ink); }

.secondary {
  display: inline-flex; align-items: baseline; gap: 8px; margin-top: 28px;
  font: 500 14.5px/1 var(--font-sans); color: var(--color-ink);
  text-decoration: none; border-bottom: 1px solid currentColor; padding-bottom: 3px;
  transition: gap 160ms var(--ease);
}
.secondary:hover { gap: 11px; }

.primary {
  display: inline-flex; align-items: center; gap: 10px; margin-top: 36px;
  height: 52px; padding: 0 24px;
  background: var(--color-ink); color: var(--color-paper);
  font: 500 15px/1 var(--font-sans); text-decoration: none; border-radius: 2px;
  transition: background-color 160ms var(--ease); align-self: flex-start;
}
.primary:hover { background: var(--color-ink-hover); }
.primaryDot { width: 4px; height: 4px; background: var(--color-cobalt); display: inline-block; }
```

- [ ] **Step 3 : Vérifier en local**

Run: `pnpm dev` puis ouvrir `http://localhost:3000/merci?src=form` et `http://localhost:3000/merci?src=booking`
Expected: variante `form` (DEMANDE ENVOYÉE + 3 étapes + « Réserver un créneau » masqué tant que `NEXT_PUBLIC_CALCOM_LINK` absent) ; variante `booking` (CRÉNEAU CONFIRMÉ, sans CTA booking).

- [ ] **Step 4 : Commit**

```bash
git add "src/app/(public)/merci/page.tsx" "src/app/(public)/merci/merci.module.css"
git commit -m "feat(funnel): page /merci 2 variantes (form/booking) selon ?src"
```

---

## Task 10 : Test E2E Playwright — parcours `/projet` → `/merci`

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/projet.spec.ts`

**Interfaces:**
- Consumes: pages `/projet` et `/merci` (Tasks 8-9). Le POST `/api/leads` est **intercepté** (route mock) pour tester le parcours UI sans dépendre de Resend/Supabase (le backend est couvert par Task 3).

- [ ] **Step 1 : Créer `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2 : Créer `e2e/projet.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("parcours /projet → /merci?src=form", async ({ page }) => {
  // Intercepte l'API : on teste l'UX du formulaire, pas l'envoi réel.
  await page.route("**/api/leads", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  );

  await page.goto("/projet");
  await expect(page.getByRole("heading", { name: "Parlons de votre projet." })).toBeVisible();

  await page.getByRole("button", { name: "Hôtellerie" }).click();
  await page.getByLabel("Votre projet en une phrase").fill("Reprendre la main sur nos réservations directes.");
  await page.getByRole("button", { name: "Une idée à cadrer" }).click();
  await page.getByRole("button", { name: "Ce trimestre" }).click();
  await page.getByLabel("Votre nom").fill("Amine K.");
  await page.getByLabel("Email").fill("amine@exemple.com");

  await page.getByRole("button", { name: /Envoyer la demande/ }).click();

  await expect(page).toHaveURL(/\/merci\?src=form/);
  await expect(page.getByRole("heading", { name: "Merci." })).toBeVisible();
  await expect(page.getByText("DEMANDE ENVOYÉE")).toBeVisible();
});
```

- [ ] **Step 3 : Installer les navigateurs Playwright (une fois)**

Run: `pnpm exec playwright install chromium`
Expected: Chromium installé.

- [ ] **Step 4 : Lancer l'E2E**

Run: `pnpm test:e2e`
Expected: PASS (1 test). Le serveur dev démarre automatiquement.

- [ ] **Step 5 : Commit**

```bash
git add playwright.config.ts e2e/projet.spec.ts
git commit -m "test(funnel): E2E Playwright parcours /projet → /merci"
```

---

## Task 11 : Câblage preview — env funnel + domaine + $FunnelBase vitrine

**Files:**
- Modify: `.env.example`
- Modify: `05-chantiers/vitrine-squarespace/build.ps1`
- Create: `docs/SETUP-PREVIEW.md`

**Interfaces:**
- Produces: URL du funnel configurable côté vitrine (build) ; instructions Vercel pour Mehdi. **Aucune ressource externe créée par l'agent.**

- [ ] **Step 1 : Mettre à jour `.env.example` (domaine sans trait d'union)**

Remplacer les valeurs de domaine :

```
NEXT_PUBLIC_SITE_URL=https://go.insenstudio.com
NEXT_PUBLIC_HOME_URL=https://insenstudio.com
# Origines autorisées à POSTer sur /api/leads (la vitrine, cross-origin).
ALLOWED_ORIGINS=https://insenstudio.com,https://www.insenstudio.com
```

Ajouter la ligne `NEXT_PUBLIC_HOME_URL` si absente, et vérifier que `NEXT_PUBLIC_CALCOM_LINK=` reste présent (placeholder vide tant que Cal.com n'existe pas).

- [ ] **Step 2 : Repérer les ancres dans le build vitrine**

Run (depuis `05-chantiers/vitrine-squarespace/`) :
```bash
grep -n "AssetBase" build.ps1
grep -rn "go.insen-studio.com\|insen-studio.com" build.ps1 _globals pages 2>/dev/null | head -40
```
Expected: localiser la définition `$AssetBase` (ancre pour insérer `$FunnelBase`) et les occurrences du domaine avec trait d'union à basculer.

- [ ] **Step 3 : Ajouter `$FunnelBase` dans `build.ps1`**

Juste après la définition de `$AssetBase`, ajouter :

```powershell
# URL de base du funnel (app Next.js). Surchargée pour pointer un preview Vercel.
# Prod par défaut : go.insenstudio.com. Réécriture -Prod uniquement (comme $AssetBase).
$FunnelBase = if ($env:INSEN_FUNNEL_BASE) { $env:INSEN_FUNNEL_BASE } else { "https://go.insenstudio.com" }
```

Dans `Format-SquarespaceContent`, juste après la réécriture `$AssetBase`, ajouter la réécriture du funnel :

```powershell
    if ($FunnelBase) { $Text = $Text.Replace('https://go.insen-studio.com', $FunnelBase) }
```

- [ ] **Step 4 : Basculer le domaine vitrine `insen-studio.com` → `insenstudio.com`**

Pour chaque occurrence trouvée au Step 2 (hors la ligne de réécriture `$FunnelBase` ci-dessus qui matche l'ancien `go.insen-studio.com` volontairement), remplacer `insen-studio.com` par `insenstudio.com` dans les sources vitrine (`_globals/`, `pages/`, JSON-LD, guide d'injection). Vérifier après coup :

```bash
grep -rn "insen-studio.com" _globals pages pages-secteur pages-expertise pages-solution 2>/dev/null
```
Expected: plus aucune occurrence **sauf** la ligne de réécriture dans `build.ps1` (qui cible `go.insen-studio.com` comme motif source à remplacer par `$FunnelBase`).

- [ ] **Step 5 : Créer `docs/SETUP-PREVIEW.md` (instructions Mehdi)**

```markdown
# Preview du funnel sur Vercel — checklist Mehdi

## 1. Déployer l'app funnel en preview
- Importer `05-chantiers/funnel-app/insen-funnel/` dans Vercel (framework Next.js détecté).
- Variables d'environnement (Project Settings → Environment Variables) :
  - `RESEND_API_KEY` = clé Resend (compte contact@insenstudio.com)
  - `NOTIFICATION_EMAIL` = contact@insenstudio.com
  - `MAIL_FROM` = INSEN Studio <contact@insenstudio.com>
  - `NEXT_PUBLIC_SITE_URL` = l'URL preview Vercel (ex. https://insen-funnel-xxxx.vercel.app)
  - `NEXT_PUBLIC_HOME_URL` = https://insenstudio.com (ou l'URL de preview vitrine)
  - `ALLOWED_ORIGINS` = domaines vitrine autorisés
  - (optionnel) `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` pour l'insert best-effort
  - `NEXT_PUBLIC_CALCOM_LINK` = laisser vide tant que Cal.com n'existe pas
- Tester : ouvrir `<preview>/projet`, soumettre, vérifier l'email reçu à contact@insenstudio.com
  et l'arrivée sur `<preview>/merci?src=form`.

## 2. Lier la vitrine au funnel de preview (test bout-en-bout)
- Régénérer les pages vitrine en pointant le funnel de preview :
  `INSEN_FUNNEL_BASE="https://insen-funnel-xxxx.vercel.app" pwsh ./build.ps1 -Prod`
  (les liens funnel des pages injectables pointeront vers la preview).
- Injecter une page de test, cliquer le CTA → doit ouvrir le funnel de preview.

## 3. Passage en prod (plus tard)
- Brancher le sous-domaine `go.insenstudio.com` sur le projet Vercel.
- Repasser `NEXT_PUBLIC_SITE_URL=https://go.insenstudio.com` et rebuild vitrine sans `INSEN_FUNNEL_BASE`.
- Appliquer la migration `supabase/migrations/0001_init.sql` à Supabase pour activer la persistance.
- Ne PAS publier `/contact` de la vitrine avant que `/api/leads` réponde en prod.
```

- [ ] **Step 6 : Vérifier le build funnel complet**

Run (depuis le funnel) : `pnpm exec tsc --noEmit && pnpm build && pnpm test`
Expected: exit 0 partout ; `pnpm test` = tous les tests unitaires verts.

- [ ] **Step 7 : Commit**

```bash
git add .env.example docs/SETUP-PREVIEW.md
git commit -m "chore(funnel): env domaine insenstudio.com + doc setup preview"
# côté vitrine (dépôt/dossier vitrine-squarespace) :
git add ../../vitrine-squarespace/build.ps1
git commit -m "feat(vitrine): \$FunnelBase configurable + bascule domaine insenstudio.com"
```
> Note : ni le funnel ni la vitrine ne sont actuellement des dépôts git (voir handoff). Si `git` n'est pas initialisé, les steps de commit sont sans effet — les fichiers restent sur disque. La mise en place du dépôt fait partie du handoff Mehdi.

---

## Self-Review

**1. Spec coverage :**
- §2 périmètre (/projet, /merci, données, route, preview, domaine) → Tasks 1-11 ✅
- §3 décisions (6 secteurs, Cal.com placeholder, insenstudio.com) → Task 1 (enums), Task 4/9 (`bookingHref` masqué si vide), Task 11 (domaine) ✅
- §4.1 contenu /projet (secteur/phrase/maturité/échéance/provenance/identité/honeypot/consentement) → Task 7 ✅
- §4.2 contenu /merci 2 variantes → Task 9 ✅
- §5 données (schéma + migration + route) → Tasks 1-3 ✅
- §6 preview (POST même origine, $FunnelBase, domaine) → Tasks 10-11 ✅
- §7 style (tokens INSEN, Fraunces/Instrument, CSS simple, pages nues, a11y) → Tasks 5-9 ✅
- §8 composants (ProjetForm, FunnelHeader, merci, config) → Tasks 4,6,7,9 ✅ (form réutilise `components/forms/ProjectForm.tsx` existant plutôt que `components/projet/` — cf. note de réconciliation)
- §9 tests (Vitest schéma + discrimination ; 1 E2E) → Tasks 1,2,3,10 ✅
- §10 env vars → Task 11 + `.env.example` ✅

**2. Placeholder scan :** aucun TBD/TODO ; tout le code est fourni en entier. Le lien Cal.com « placeholder » est une décision explicite (D2), pas un trou.

**3. Type consistency :** `classifyPayload`/`projetEmailFields`/`projetDbRow` définis Task 2, consommés Task 3 avec signatures identiques. `parseUtm` (Task 4) consommé Task 7. `bookingHref`/`HOME_URL`/`SITE_URL` (Task 4) consommés Tasks 6, 9. `SECTEURS`/`MATURITES`/`ECHEANCES`/`PROVENANCES` (Task 1) consommés Task 7. Honeypot unifié sur `company_website` (schéma Task 1 + route existante + form Task 7). Enum values maquette cohérentes schéma ↔ migration ↔ mappers ↔ form.

**Point d'attention exécution :** Task 3 modifie une route existante — insérer la branche `projet` sans casser la branche `contact` (garder la validation `contactLeadSchema` dans le `else`). Le honeypot générique (avant l'aiguillage) couvre les deux formulaires.
