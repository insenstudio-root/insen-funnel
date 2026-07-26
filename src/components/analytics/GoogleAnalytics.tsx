"use client";
/**
 * Charge gtag.js une seule fois pour le funnel (même ID que la vitrine).
 * Le cross-domaine www ↔ go se règle côté GA4 (Admin → flux → « Configurer vos
 * domaines »). Ici on se contente d'un config standard.
 */
import Script from "next/script";
import { GA_ID } from "@/lib/ga";

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
