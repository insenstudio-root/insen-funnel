/**
 * /consultation — « Demander un audit digital ». Cible du CTA primaire de la
 * vitrine. Formulaire court (haut de funnel), fonctionne en Tier-1 e-mail seul :
 * POST /api/leads (source: audit_funnel) → e-mail contact@insenstudio.com → /merci.
 * Réutilise la coque et les styles de /projet pour rester homogène.
 */
import type { Metadata } from "next";
import { FunnelHeader } from "@/components/funnel/FunnelHeader";
import { AuditForm } from "@/components/forms/AuditForm";
import styles from "../projet/projet.module.css";

export const metadata: Metadata = { title: "Demander un audit digital — INSEN Studio" };

export default function ConsultationPage() {
  return (
    <div className={styles.page}>
      <FunnelHeader />
      <main className={styles.main}>
        <p className={styles.eyebrow}>
          <span className={styles.dot} aria-hidden="true" />
          AUDIT DIGITAL
        </p>
        <h1 className={styles.title}>Demander un audit digital.</h1>
        <p className={styles.intro}>
          Dites-nous où vous en êtes. On regarde votre présence en ligne et on
          vous revient avec une lecture claire : ce qui marche, ce qui bloque, par
          où commencer.
        </p>
        <AuditForm />
      </main>
    </div>
  );
}
