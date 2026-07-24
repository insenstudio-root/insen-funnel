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
