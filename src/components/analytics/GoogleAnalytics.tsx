"use client";
/**
 * Charge gtag.js une seule fois pour le funnel (même ID que la vitrine).
 * Le cross-domaine www ↔ go se règle côté GA4 (Admin → flux → « Configurer vos
 * domaines »). Ici on se contente d'un config standard.
 */
import Script from "next/script";
import { GA_ID } from "@/lib/ga";

/**
 * Le shim `gtag` est un script inline classique, volontairement PAS un
 * `next/script` en `afterInteractive` : les effets React s'exécutent à
 * l'hydratation, donc AVANT les scripts `afterInteractive`. Avec l'ancien
 * ordre, `window.gtag` était encore indéfini quand /merci envoyait
 * `generate_lead`, et l'événement était perdu (constaté en production le
 * 2026-07-26 : aucun `generate_lead` collecté alors que `form_start` passait).
 * Inline, le shim existe dès le parsing du HTML et met les événements en file
 * dans `dataLayer` ; gtag.js les rejoue à son chargement.
 */
const SHIM = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`;

export function GoogleAnalytics() {
  return (
    <>
      <script id="ga4-init" dangerouslySetInnerHTML={{ __html: SHIM }} />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}
