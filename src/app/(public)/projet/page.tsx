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
