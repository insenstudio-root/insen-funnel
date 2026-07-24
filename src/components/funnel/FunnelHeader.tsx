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
