# Couche anti-abus des formulaires

> Mise en place : 2026-09-21, après une série de leads bots reçus sur `contact@insenstudio.com`
> (noms en chaîne aléatoire du type `fEthwyOYBgChBuJgUXHo`).

## Ce qui protégeait avant, et pourquoi ça ne tenait pas

Un seul honeypot, `company_website`, lu côté client par un `ref` React. Un script
qui poste directement sur `https://go.insenstudio.com/api/leads` n'envoie jamais ce
champ : la garde ne se déclenchait donc jamais. Aucune limite de débit. Les en-têtes
CORS ne protègent que le navigateur, pas l'endpoint.

Le formulaire de contact de la vitrine envoyait déjà son propre leurre
`insen_fc_check` — que le serveur ne lisait pas. Il est désormais pris en compte.

## Les gardes, dans l'ordre d'application

| Garde | Ce qu'elle bloque | Portée |
|---|---|---|
| Origine (`Origin` / `Referer`) | Tout POST hors de nos surfaces | Forte contre les scripts, falsifiable |
| Leurres `company_website`, `insen_fc_check`, `insen_check` | Bots qui remplissent le DOM | Forte |
| Délai de remplissage (< 2,5 s) | Automates de navigateur rapides | Heuristique, horodatage non signé |
| Contenu (score ≥ 2) | Noms aléatoires, BBCode, rafales de liens | Conservatrice, voir plus bas |
| Débit (IP, e-mail, global) | Inondation et coût Resend | Par instance serverless |

Un rejet répond **comme un succès** (200 `{ok:true}`, ou 303 vers `/merci`) : le bot
n'apprend rien. La contrepartie, c'est que le journal est le **seul** moyen de
récupérer un vrai lead écarté par erreur.

### Récupérer un faux positif

Chaque rejet écrit dans les logs Vercel :

```
[antibot] leads — lead écarté (content : gibberish_name) : {"full_name":…,"email":…,"message":…}
```

Le payload complet y figure. Filtrer sur `[antibot]` dans les logs de la fonction.

## Le score de contenu

Il faut **deux points** pour rejeter. Un seul signal faible ne suffit jamais.

| Signal | Poids | Déclenchement |
|---|---|---|
| `gibberish_name` | 2 | Nom sans espace, ≥ 12 lettres, deux casses, suites de même casse < 2 lettres en moyenne |
| `bbcode` | 2 | `[url=`, `[/url]`, `<a href` dans le message |
| `link_spam` | 1 | 3 URLs ou plus dans le message |
| `gibberish_message` | 1 | Message ≥ 20 caractères sans aucune espace (sauf une URL seule) |

La mesure de « suite de même casse » distingue `JeanPierreDupont` (2,7) de
`fEthwyOYBgChBuJgUXHo` (1,4). Les tests couvrent les noms composés, les
apostrophes, les majuscules intégrales et les écritures non latines.

## Débit

| Clé | Limite | Fenêtre |
|---|---|---|
| IP | 3 | 10 min |
| E-mail | 2 | 1 h |
| Global | 30 | 1 h |

Dépassement : `429` + en-tête `Retry-After`. Le visiteur voit le message d'erreur
du formulaire, pas un faux succès — c'est une vraie limite, pas un rejet de spam.

⚠️ Le compteur vit **en mémoire d'instance**. Vercel pouvant servir depuis
plusieurs instances, la fenêtre n'est pas étanche à 100 %. Suffisant au volume
actuel ; si le spam monte, remplacer le store de `rate-limit.ts` par une table
Supabase.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `ALLOWED_ORIGINS` | Origines autorisées, séparées par des virgules. `go.insenstudio.com` est toujours ajoutée. |
| `ANTIBOT_STRICT` | `1` exige un horodatage lisible. **Voir la mise en ligne en deux temps.** |
| `ANTIBOT_DISABLED` | `1` neutralise toute la couche sans redéployer (interrupteur d'exploitation). |

## Mise en ligne en deux temps

**Étape 1 — maintenant.** Déployer le funnel. Les gardes serveur (origine, leurres,
contenu, débit) bloquent immédiatement. Le délai de remplissage ne bloque que les
soumissions qui envoient un horodatage : les surfaces pas encore à jour sont
simplement ignorées. `ANTIBOT_STRICT` reste à `0`.

**Étape 2 — après ré-injection de la vitrine.** Le formulaire de contact
Squarespace doit être remplacé par `pages/contact/contact-head-prod.html` régénéré
(il envoie désormais `form_rendered_at`). Une fois fait, et seulement une fois fait,
passer `ANTIBOT_STRICT=1` sur Vercel : une soumission sans horodatage lisible
devient un rejet.

> Passer `ANTIBOT_STRICT=1` **avant** la ré-injection fait perdre tous les vrais
> leads venus de la vitrine.

## Ce que ça n'arrête pas

Un bot pilotant un vrai navigateur, forgeant l'`Origin`, respectant les délais et
écrivant un texte plausible. Si ça se produit, la réponse est Cloudflare Turnstile
(captcha invisible, gratuit, sans Google) — et rien d'autre ne suffira.

## Code

| Fichier | Rôle |
|---|---|
| `src/lib/security/antibot.ts` | Heuristiques de contenu (pur) |
| `src/lib/security/request-guard.ts` | Origine, leurres, délai, IP (pur) |
| `src/lib/security/rate-limit.ts` | Limiteur à fenêtre fixe (pur, horloge injectée) |
| `src/lib/security/intake-guard.ts` | Ordre des gardes et décision (pur) |
| `src/lib/security/index.ts` | Façade : lit l'environnement, porte le limiteur |

Tout est pur sauf la façade. 60 tests dans `src/lib/security/`, plus les tests de
route dans `src/app/api/*/route.test.ts`.
