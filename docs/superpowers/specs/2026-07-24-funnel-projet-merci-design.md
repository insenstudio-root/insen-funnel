# Spec — Funnel `/projet` + `/merci` (testable en preview)

> **Date** : 2026-07-24 · **Périmètre** : app funnel Next.js (`05-chantiers/funnel-app/insen-funnel/`)
> **Source de vérité contenu** : maquette V2 `projet-v2.dc.html` + `merci-v2.dc.html` (copie mot pour mot).
> **Statut** : design validé par Mehdi le 2026-07-24 (« c bon »). Prêt pour le plan d'implémentation.

---

## 1. Objectif

Livrer les deux pages du funnel — `/projet` (formulaire qualifiant) et `/merci` (confirmation) —
**pleinement fonctionnelles et testables sur un déploiement preview Vercel** avant que le sous-domaine
`go.insenstudio.com` ne soit branché. La vitrine doit pouvoir pointer vers ce funnel de preview pour un
test bout-en-bout (clic CTA vitrine → formulaire → email reçu → page merci).

**Rôle produit** (rappel PRD) : le call convertit, le site légitime. `/projet` est le point de bascule
du site vers le call. Il capte une demande qualifiée et déclenche l'email à `contact@insenstudio.com`.

## 2. Périmètre

**Dans ce spec :**
- Page `/projet` : formulaire qualifiant (React client) → `POST /api/leads` (même origine) → redirection `/merci?src=form`.
- Page `/merci` : deux variantes selon `?src` (`form` / `booking`).
- Alignement données : `projectLeadSchema` (Zod) + migration `0001_init.sql` sur les **enums maquette V2** (6 secteurs, 3 maturités, 4 échéances).
- Extension de `POST /api/leads` pour accepter la charge « projet » (en plus du « contact » existant).
- Mécanisme de preview : URL de base du funnel **configurable** dans le build vitrine ; test sur preview Vercel.
- Bascule domaine `insen-studio.com` → `insenstudio.com` (sans trait d'union), configurable.

**Hors périmètre (étapes suivantes, pas ce spec) :**
- `/consultation` + embed Cal.com (attend le compte Cal.com) → le lien « Réserver un créneau » est un **placeholder configurable**.
- Back-office leads (lecture/tri).
- Application de la migration à Supabase (Mehdi l'exécute ; on livre le SQL).

## 3. Décisions validées

| # | Décision | Choix |
|---|----------|-------|
| D1 | Refonte enums secteur 4 → 6 | **Oui** — s'aligner sur la maquette V2. |
| D2 | Lien « Réserver un créneau » (Cal.com) | **Placeholder configurable** (`NEXT_PUBLIC_CALCOM_LINK`), pas d'embed pour l'instant. |
| D3 | Domaine | **`insenstudio.com`** (sans trait d'union), rendu configurable via env. |

## 4. Contenu (fidèle maquette V2)

### 4.1 `/projet` — page « nue »
En-tête minimal : logo lockup noir (lien accueil) + bouton fermer (`x`, lien accueil). **Pas de nav ni footer globaux.**

- **H1** : « Parlons de votre projet. » (Fraunces)
- **Champs** (dans l'ordre maquette) :
  1. `secteur` — 6 tuiles cliquables (obligatoire) :
     `hotellerie` (Hôtellerie) · `restauration` (Restauration & lieux) · `sante` (Santé) ·
     `commerce` (Commerce & services) · `marques` (Marques & entrepreneurs) · `autre` (Autre)
  2. `phrase` — Input « Votre projet en une phrase » (obligatoire), placeholder
     « Ex. : reprendre la main sur nos réservations directes. »
  3. `maturite` — 3 tuiles (obligatoire) :
     `idee` (Une idée à cadrer) · `defini` (Un projet défini, à lancer) · `reprendre` (Un système à reprendre)
  4. `echeance` — 4 chips (obligatoire) :
     `des_que_possible` (Dès que possible) · `ce_trimestre` (Ce trimestre) · `cette_annee` (Cette année) · `pas_de_date` (Pas de date)
  5. `provenance` — Select optionnel « Comment nous avez-vous connu ? » :
     Recherche Google · Recommandation · Réseaux sociaux · Plaquette / print · Autre
  6. `nom` — Input « Votre nom » (obligatoire)
  7. `email` — Input email « Email » (obligatoire)
  8. `tel` — Input tel optionnel « Téléphone » (hint « Utile pour un rappel rapide. »)
  9. **Honeypot** `company_website` — champ caché (anti-bot), non affiché.
- **Bouton** : « Envoyer la demande » → « Envoi en cours… » pendant l'envoi, avec flèche.
- **Consentement RGPD** : la maquette n'a **pas** de case à cocher (design épuré). On reste fidèle → **consentement par
  soumission** : une mention courte sous le bouton (« En envoyant votre demande, vous acceptez que nous traitions ces
  informations pour vous recontacter. » + lien `/confidentialite`). Au submit, le client pose `consent: true`,
  `consent_text` (= la mention affichée) et `consent_at` (ISO) — la preuve RGPD est conservée sans champ visuel supplémentaire.
  ⚠️ **Base légale à confirmer par Mehdi** (consentement par soumission vs intérêt légitime B2B) — fait juridique du handoff.

### 4.2 `/merci` — page « nue », 2 variantes selon `?src`
Même en-tête minimal. Eyebrow clignotant + H1 « Merci. » + intro + 3 étapes numérotées + CTA retour accueil.

| `?src` | eyebrow | intro | étapes | CTA secondaire |
|--------|---------|-------|--------|----------------|
| `form` (défaut) | DEMANDE ENVOYÉE | « Votre demande est bien arrivée. On la lit avec attention et on revient vers vous personnellement. » | 01 On lit votre demande — chaque mot. · 02 On vous répond personnellement. · 03 Un appel, si c'est pertinent. | « Réserver directement un créneau → » (lien Cal.com placeholder) |
| `booking` | CRÉNEAU CONFIRMÉ | « C'est noté. L'invitation arrive par email, avec le lien de la visioconférence. » | 01 Vous recevez l'invitation par email. · 02 On prépare une première lecture de votre situation. · 03 Trente minutes en visio — une lecture claire. | (aucun) |

CTA primaire dans les deux cas : « Retour à l'accueil » (fond encre).

## 5. Données

### 5.1 `src/lib/validation/lead.ts`
- Mettre `projectLeadSchema` à jour avec les **enums maquette V2** :
  - `secteur`: `z.enum(["hotellerie","restauration","sante","commerce","marques","autre"])`
  - `maturite`: `z.enum(["idee","defini","reprendre"])`
  - `echeance`: `z.enum(["des_que_possible","ce_trimestre","cette_annee","pas_de_date"])`
  - `phrase`: `z.string().min(3)`
  - `provenance`: `z.string().optional()` (valeur libre issue de la liste)
  - `full_name` (min 2), `email`, `phone` (optionnel), honeypot `company_website: z.string().max(0)`,
    `consent: z.literal(true)`, `consent_text`, `consent_at`, UTM (source/medium/campaign/term/content),
    `landing_path`, `page_path`, `referrer`, `locale`.
- Conserver `contactLeadSchema` inchangé (formulaire de contact vitrine).

### 5.2 `supabase/migrations/0001_init.sql`
- Aligner les colonnes/contraintes `secteur`, `maturite`, `echeance` de `leads` sur les nouveaux enums (6/3/4).
- **On livre le SQL ; Mehdi l'applique** à Supabase (règle : ne pas créer/modifier de ressources externes).

### 5.3 `POST /api/leads` (extension)
- Discriminer la charge à l'entrée : présence de `secteur` + `phrase` → **projet** ; présence de `message` → **contact**.
- Valider avec le schéma correspondant ; **email Resend garanti** dans les deux cas ; insert Supabase best-effort.
- L'email « projet » liste : secteur, phrase, maturité, échéance, provenance, nom, email, tél, UTM, consentement.
- Réponse : JSON `{ok:true}` (fetch) ou 303 → `/merci?src=form` (POST formulaire sans JS).

## 6. Mécanisme de preview

- Le formulaire `/projet` **POST sur son propre `/api/leads`** (même origine) → fonctionne sur preview Vercel **sans CORS**.
- **URL de base du funnel configurable côté vitrine** : variable `$FunnelBase` dans `build.ps1` (réécriture en `-Prod`,
  sur le même principe que `$AssetBase`), défaut `https://go.insenstudio.com`. Pour un build vitrine de preview,
  la pointer sur l'URL preview Vercel. Les CTA vitrine (« Démarrer un projet », etc.) utilisent cette base.
- **Domaine** : remplacer `go.insen-studio.com` → `go.insenstudio.com` dans les sources vitrine et en faire la base configurable.
- `NEXT_PUBLIC_SITE_URL` (redirection `/merci`) : `https://go.insenstudio.com` par défaut, surchargée par l'URL preview en test.

## 7. Style

- **Tokens INSEN** : papier `#FBFAF7`, encre `#131312`, cobalt `#1345B1`, graphite, lignes — repris des tokens `_ds/`.
- Polices **Fraunces** (titres) + **Instrument Sans** (texte) via `next/font/google` ; mono pour les eyebrows.
- **CSS simple** (`globals.css` + CSS par composant), **pas de setup Tailwind** dans le funnel v1.
- Pages « nues » : en-tête minimal (logo + fermer), pas de nav/footer. A11y : labels, focus visibles, contrastes AA, tuiles/chips au clavier.

## 8. Composants (unités isolées)

- `app/(public)/projet/page.tsx` — page serveur (métadonnées, capte UTM/referrer/landing) → rend `<ProjetForm/>`.
- `components/projet/ProjetForm.tsx` — composant client : état des champs, tuiles secteur, tuiles maturité,
  chips échéance, select provenance, validation inline, honeypot, submit `fetch` → redirection `/merci?src=form`.
- `app/(public)/merci/page.tsx` — lit `?src`, rend la variante `form`/`booking` (contenu du §4.2).
- `components/funnel/FunnelHeader.tsx` — en-tête « nue » réutilisé par `/projet` et `/merci`.
- `lib/validation/lead.ts` (`projectLeadSchema`) · `app/api/leads/route.ts` (discrimination + email + insert).
- `lib/config.ts` — lit `NEXT_PUBLIC_CALCOM_LINK`, `NEXT_PUBLIC_SITE_URL` (placeholders configurables).

## 9. Tests

- **Vitest** : `projectLeadSchema` (cas valides/invalides, enums, honeypot, consentement obligatoire) + discrimination projet/contact dans la route.
- **E2E Playwright** (1 parcours critique) : remplir `/projet` → submit → arrivée `/merci?src=form`.
- **Manuel local** : `next dev`, remplir le formulaire, vérifier l'email reçu à `contact@insenstudio.com` + redirection.
- **Preview** : déploiement Vercel, même test ; build vitrine de preview avec `$FunnelBase` = URL Vercel → clic CTA → funnel.

## 10. Variables d'environnement (Vercel, funnel)

`RESEND_API_KEY`, `NOTIFICATION_EMAIL=contact@insenstudio.com`, `MAIL_FROM="INSEN Studio <contact@insenstudio.com>"`,
`NEXT_PUBLIC_SITE_URL=https://go.insenstudio.com`, `NEXT_PUBLIC_CALCOM_LINK` (placeholder),
`ALLOWED_ORIGINS` (origines vitrine), et optionnellement `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
(persistance best-effort ; sinon l'email reste le canal garanti).

## 11. Garde-fous (rappel)

- Aucun tarif, aucune promesse chiffrée, pas de survente IA dans les textes.
- Aucune ressource externe créée par l'agent (Supabase/Cal.com/Vercel/domaine) : on livre le code + les instructions, Mehdi exécute.
- `SUPABASE_SERVICE_ROLE_KEY` / `RESEND_API_KEY` : jamais imprimés, chargés depuis l'env uniquement.
- `contact@insenstudio.com` public ; `mehdi.allahoum@insenstudio.com` jamais exposé.
